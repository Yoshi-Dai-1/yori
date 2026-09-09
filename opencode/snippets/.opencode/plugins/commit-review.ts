import type { Plugin } from "@opencode-ai/plugin"
import type { OpencodeClient } from "@opencode-ai/sdk/client"
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs"
import { dirname, join } from "path"
import secretPatterns from "../config/secret-patterns.json"

/**
 * commit-review.ts
 *
 * git commit 実行前にコードレビューとセキュリティ監査を自動実行する。
 * 子セッションで @code-reviewer（一般レビュー）と @security-auditor（セキュリティ監査）を
 * 並列実行し、判定ポリシー（.opencode/config/review-policy.json）に従ってブロックする。
 *
 * 設計方針：
 * - 判定はレビュアーの主観 severity だけでなく「severity + ブロック対象クラス + 検証方法（エビデンス）」で行う
 * - ブロック対象: ブロック対象クラスに該当、または [重要度: HIGH/CRITICAL] かつ検証方法が添えられた指摘
 *   （evidenceRequired 有効時は HIGH/CRITICAL でも検証方法がない場合はブロックしない・警告化）
 * - 警告扱い: policy.warning.severities（既定 MEDIUM/LOW）+ エビデンス不足のブロック候補
 * - 審査履歴 docs/review-log.md を読み、未解決指摘の「解消」「残存」を確認・記録する。同一指摘の再報告と
 *   解消済み指摘の再ブロックを防ぎ、ゲートの収束を保証する（履歴 = 状態を持つゲート）
 * - 依存マニフェストが diff に含まれる場合は、検出した全てのマニフェストに対して決定的な依存監査（npm audit 等）を実行し、
 *   監査結果を添付する（一部のみに留めない）
 * - フックバイパス（--no-verify / core.hooksPath 変更等）は commit-review 自体がブロックする
 * - 監査は reviewTimeoutMs（既定 15 分・review-policy.json で調整可）で有界化する。タイムアウト時は「監査未完走」として
 *   コミットをブロックする（fail-closed）。時間切れで通過はさせない。モデル/環境の応答が枯れても無期限待ちで沈黙しないよう、
 *   開始通知と継続中通知（残り時間）を親セッションへ即時表示して待機を見える化する
 * - 監査エージェント両方が何も返さない（無言＝審査未成立）場合も、fail-closed で通知してブロックする（素通ししない）
 * - 依存監査コマンドは設定（review-policy.json）から直接実行せず、コード内の固定許容リスト（allowlist）だけを実行する。
 *   設定ファイルが改変されても任意コマンド実行にならない
 */

interface Finding {
  severity: string | null
  pathLine: string | null
  text: string
  classLabels: string[]
  hasEvidence: boolean
  blockCandidate: boolean
}

interface ContentPattern {
  pattern: string
  label: string
  severity?: string
}

interface ReviewPolicy {
  severityOrder: string[]
  block: { severities: string[]; classes: { class: string; keywords: string[] }[] }
  warning: { severities: string[] }
  evidenceRequired: boolean
  historyFile: string
  historyRecentLines: number
  reviewTimeoutMs: number
  dependencyAudits: Record<string, string>
}

const DEFAULT_POLICY: ReviewPolicy = {
  severityOrder: ["CRITICAL", "HIGH", "MEDIUM", "LOW"],
  block: {
    severities: ["CRITICAL", "HIGH"],
    classes: [
      { class: "hardcoded-secret", keywords: ["ハードコード", "hardcoded", "平文保存", "機密情報がコード", "秘密鍵がコード", "パスワードがコード", "apiキー", "シークレットをコード"] },
      { class: "authz", keywords: ["認証の欠如", "認可の欠如", "認証欠如", "認可欠如", "認証バイパス", "authentication bypass", "missing authentication", "missing authorization"] },
      { class: "injection", keywords: ["インジェクション", "sqlインジェクション", "sql injection", "コマンドインジェクション", "xss", "パラメータバインディングが", "バインディングされていない"] },
      { class: "secret-in-log", keywords: ["ログに出力", "ログ出力", "ログに秘密", "機密情報をログ", "logging secrets"] },
    ],
  },
  warning: { severities: ["MEDIUM", "LOW"] },
  evidenceRequired: true,
  historyFile: "docs/review-log.md",
  historyRecentLines: 60,
  reviewTimeoutMs: 15 * 60 * 1000,
  dependencyAudits: {
    "package.json": "npm audit --audit-level=high",
    "package-lock.json": "npm audit --audit-level=high",
    "yarn.lock": "npm audit --audit-level=high",
    "pnpm-lock.yaml": "npm audit --audit-level=high",
    "bun.lock": "npm audit --audit-level=high",
    "bun.lockb": "npm audit --audit-level=high",
    "requirements.txt": "pip-audit",
    "requirements-dev.txt": "pip-audit",
    "pyproject.toml": "pip-audit",
    "go.mod": "govulncheck ./...",
    "go.sum": "govulncheck ./...",
    "Cargo.toml": "cargo audit",
    "Cargo.lock": "cargo audit",
    "Gemfile": "bundle audit",
    "Gemfile.lock": "bundle audit",
    "composer.json": "composer audit",
    "pubspec.yaml": "dart pub audit",
  },
}

// 依存監査コマンドは設定（review-policy.json）から直接実行せず、コード内の固定許容リスト
// （allowlist）だけを実行する。設定ファイルが改変されても任意コマンド実行にならない。
const ALLOWED_AUDIT_COMMANDS = new Set([
  "npm audit --audit-level=high",
  "pip-audit",
  "govulncheck ./...",
  "cargo audit",
  "bundle audit",
  "composer audit",
  "dart pub audit",
])

// 設定由来の監査コマンドは許可リストに含まれるものだけ通す
function filterAuditCommands(map: Record<string, string>): Record<string, string> {
  const filtered: Record<string, string> = {}
  for (const [manifest, cmd] of Object.entries(map)) {
    if (ALLOWED_AUDIT_COMMANDS.has(cmd)) filtered[manifest] = cmd
  }
  return filtered
}

// 審査履歴（docs/review-log.md）に指摘本文・検証エビデンスを書き出す前に秘密値をマスクする。
// レビュアーが該当コード・設定行を引用した場合に秘密値の実体が混入し、git 履歴に永続化する
// 二次経路（secret-in-log）を塞ぐ。パターンは SSoT（secret-patterns.json）の block 系のみ使用する
// ／SSoT は「検出」を目的としたパターンで、引用テキスト中のトークン値・鍵本文を1回のマッチで
// 覆いきれない箇所（multi-line の鍵ブロック・Bearer 値）があるため、履歴への書き出しに限って
// HISTORY_MASK_REGS で補完する（検出用パターンの挙動は変えない）。
const SECRET_CONTENT_REGS: RegExp[] = (
  secretPatterns as { contentPatterns: ContentPattern[] }
).contentPatterns
  .filter((c) => c.severity !== "warn")
  .map((c) => new RegExp(c.pattern, "g"))
const HISTORY_MASK_REGS: RegExp[] = [
  /-----BEGIN[^-]*PRIVATE KEY[^-]*-----[\s\S]*?-----END[^-]*PRIVATE KEY[^-]*-----/g,
  /Bearer\s+[A-Za-z0-9+/_=\-.]{8,}/g,
  // JWT（ヘッダ.ペイロード.シグネチャ）
  /\beyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}/g,
  // 長い不透明トークン（SSoT の形式に一致しない 28 文字以上の連続列。英数字と /+=_- を含む）
  /\b[A-Za-z0-9+/=_\-.]{28,}\b/g,
]

// -c/-C に加えて --no-pager / --quiet 等の --flag 前置も許容して commit を検出する。
// `--?[A-Za-z][\w-]*(?:[ =][^\s]+)?` が引数付きフラグ（-c core.hooksPath=... や --config=...）を
// 1トークンとして吸収する。
const GIT_COMMIT_RE = /\bgit\b(?:\s+--?[A-Za-z][\w-]*(?:[ =][^\s]+)?)*\s+commit\b/
const HOOK_BYPASS_RE = /(?:--no-verify\b|-c\s+core\.hooksPath\b|--config-env\s*=\s*core\.hooksPath\b|GIT_CONFIG_PARAMETERS\b|GIT_HOOKS_PATH\b)/

// 指摘ヘッダは行頭でのみ認識する（bullet / 太字前置は許容。`**[重要度: X]**` のように
// 記号と `[` の間に空白がなくてもよい）。監査報告・引用・平叙文の途中に現れる
// `[重要度: ...]` を幽霊指摘として誤検出するのを防ぐ。認識はレビュアーの報告形式
// 「[重要度: X] …」および「**[重要度: X] …**」を契約とする。
const SEV_HEADER_RE = /^\s*(?:[*\-]+\s*)?\[重要度:\s*(CRITICAL|HIGH|MEDIUM|LOW)\]\s*/
const LEGACY_SEV_RE = /^\[(CRITICAL|HIGH|MEDIUM|LOW)\]\s/
const RESOLVE_RE = /【解消確認】\s*([\w./@-]+\.\w+:\d+)/g
const REMAIN_RE = /【残存確認】\s*([\w./@-]+\.\w+:\d+)/g
const EVIDENCE_RE = /検証方法[:：]/
const PATH_LINE_RE = /([\w./@-]+\.\w+):(\d+)/
const HIST_ENTRY_RE = /^- \[重要度: (CRITICAL|HIGH|MEDIUM|LOW)\]\s*(?:\[[^\]]*\]\s*)?([\w./@-]+\.\w+:\d+)\s*\|\s*status: (未解決|解消済み|警告)/
// 新記録（findingToRecord / タイムアウト記録）は履歴行と違い `- ` 前置を持たないため、その形式用。
const HIST_RECORD_RE = /^\[重要度: (CRITICAL|HIGH|MEDIUM|LOW)\]\s*(?:\[[^\]]*\]\s*)?([\w./@-]+\.\w+:\d+)\s*\|\s*status: (未解決|解消済み|警告)/

function isGitCommit(cmd: string): boolean {
  return GIT_COMMIT_RE.test(cmd)
}

function hasHookBypass(cmd: string): boolean {
  // -c <値> の値が引用符で囲まれていても判定に残す。バランス型クォート（"a'b" / 'a"b' 等）を
  // 1つの引用とみなすため、二重引用符内のアポストロフィで除去が断裂しない（後段の引用符除去で検出漏れしない）
  const dequotedC = cmd.replace(
    /(^|\s)-c\s+("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*')/g,
    (_m, pre: string, quoted: string) => `${pre} -c ${quoted.slice(1, -1)}`,
  )
  // メッセージ・パス等、引用符で囲まれた文字列はバイパス検出の対象外にする
  // （コミットメッセージ本文に `core.hooksPath=` や `--no-verify` を記載した正当なコミットを誤爆しない）
  const stripped = dequotedC.replace(/("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*')/g, "")
  return HOOK_BYPASS_RE.test(stripped)
}

function normalizePolicy(raw: any): ReviewPolicy {
  const block = raw?.block ?? {}
  const defaults = structuredClone(DEFAULT_POLICY)
  return {
    severityOrder: raw?.severityOrder ?? defaults.severityOrder,
    block: {
      severities: block.severities ?? defaults.block.severities,
      classes: (block.classes ?? []).map((c: any) => ({ class: String(c.class), keywords: (c.keywords ?? []).map(String) })),
    },
    warning: { severities: raw?.warning?.severities ?? defaults.warning.severities },
    evidenceRequired: raw?.evidenceRequired ?? defaults.evidenceRequired,
    historyFile: typeof raw?.historyFile === "string" ? raw.historyFile : defaults.historyFile,
    historyRecentLines: typeof raw?.historyRecentLines === "number" ? raw.historyRecentLines : defaults.historyRecentLines,
    reviewTimeoutMs: typeof raw?.reviewTimeoutMs === "number" && raw.reviewTimeoutMs >= 1000 ? raw.reviewTimeoutMs : defaults.reviewTimeoutMs,
    dependencyAudits: filterAuditCommands({ ...defaults.dependencyAudits, ...(raw?.dependencyAudits ?? {}) }),
  }
}

async function readPolicy(worktree: string): Promise<ReviewPolicy> {
  try {
    const f = Bun.file(join(worktree, ".opencode/config/review-policy.json"))
    if (await f.exists()) {
      return normalizePolicy(JSON.parse(await f.text()))
    }
  } catch {
    // ポリシー読込失敗時は組み込み既定値で動作する
  }
  return normalizePolicy(null)
}

function stripFrontmatter(md: string): string {
  return md.replace(/^---[\s\S]*?---\n*/, "").trim()
}

async function readAgentPrompt(worktree: string, name: string): Promise<string | null> {
  try {
    const content = await Bun.file(join(worktree, ".opencode/agents", name)).text()
    return stripFrontmatter(content)
  } catch {
    return null
  }
}

// 依存監査（npm audit 等）の上限。決定的コマンドだがネットワーク/レジストリ不達で詰まり得るため有界化する
const AUDIT_TIMEOUT_MS = 5 * 60 * 1000

type TimeoutResult<T> = { ok: true; value: T } | { ok: false }

// 無期限待ちを防ぐ汎用タイムアウト。Promise.race で上限を設け、タイマーは確実に整理する。
// タイムアウトしても裏の実行は続くが、こちらは待たずに { ok: false } で制御を返す。
async function withTimeout<T>(promise: Promise<T>, ms: number): Promise<TimeoutResult<T>> {
  let timer: ReturnType<typeof setTimeout> | undefined
  const timeout = new Promise<TimeoutResult<T>>((resolve) => {
    timer = setTimeout(() => resolve({ ok: false }), ms)
  })
  return await Promise.race([promise.then((value) => ({ ok: true as const, value })), timeout]).finally(
    () => timer && clearTimeout(timer),
  )
}

interface ReviewRun {
  text: string | null
  timedOut: boolean
}

// 起動中の通知/継続中の通知を親セッションへ表示する（best-effort・ブロックしない）。
// noReply でモデル呼び出しを伴わないため高速で、失敗してもエラー化しない。
function postNotice(client: OpencodeClient, sessionId: string, text: string): void {
  client.session
    .prompt({
      path: { id: sessionId },
      body: { noReply: true, parts: [{ type: "text", text }] },
    })
    .catch(() => {})
}

async function runReviewInSession(
  client: OpencodeClient,
  parentSessionId: string,
  title: string,
  label: string,
  systemPrompt: string,
  userMessage: string,
  timeoutMs: number,
): Promise<ReviewRun> {
  let childSessionId: string | undefined
  try {
    const child = await client.session.create({
      body: { parentID: parentSessionId, title },
    })
    childSessionId = child.data?.id
  } catch {
    return { text: null, timedOut: false }
  }
  if (!childSessionId) return { text: null, timedOut: false }

  const halfMs = Math.max(1000, Math.floor(timeoutMs / 2))
  const progressTimer = setTimeout(() => {
    const remaining = Math.round((timeoutMs - halfMs) / 60000)
    postNotice(client, parentSessionId, `commit-review: ${label}は継続中です（タイムアウトまで残り約 ${remaining} 分）。`)
  }, halfMs)

  try {
    const raced = await withTimeout(
      client.session.prompt({
        path: { id: childSessionId },
        body: {
          parts: [{ type: "text", text: userMessage }],
          system: systemPrompt,
        },
      }),
      timeoutMs,
    )
    if (!raced.ok) {
      // 監査が完走しないまま上限に達した。fail-closed のため commit 側でブロックする
      return { text: null, timedOut: true }
    }
    const parts = raced.value.data?.parts || []
    const text = parts
      .filter((p: any) => p.type === "text")
      .map((p: any) => p.text)
      .join("\n")
    return { text: text || null, timedOut: false }
  } catch {
    return { text: null, timedOut: false }
  } finally {
    clearTimeout(progressTimer)
  }
}

function policyContext(policy: ReviewPolicy): string {
  const labels = policy.block.classes.map((c) => c.class).join(" / ")
  return [
    `severity 語彙: ${policy.severityOrder.join(" > ")}（定義は .opencode/instructions/security/_risk-severity.md）`,
    `ブロック対象: [重要度: ${policy.block.severities.join("/")}] に該当する指摘、またはブロック対象クラス（${labels}）に該当する指摘`,
    `ブロックとなる指摘には必ず「検証方法: grep / CLI コマンドで再現できる根拠」を添えること。添えられない指摘はブロックしない`,
    `警告扱い（ブロックしない）: [重要度: ${policy.warning.severities.join("/")}] の指摘、およびエビデンスの添えられないブロック候補`,
  ].join("\n")
}

// ブロッククラス判定の対象文字列。指摘タイトル（1行目）と「問題/理由」欄のみを使用する。
// 検証方法以降（検証方法: やその他確認結果）は「ハードコードされた秘密値：なし」のような
// 良好な確認結果（否定文）を列挙することがあり、その文言がクラス keyword にマッチして
// 誤ブロックするため、クラス判定から除外する。
function classificationText(raw: string): string {
  const head = raw.split("\n")[0] ?? ""
  const body = raw.replace(/検証方法[:：][\s\S]*$/, "")
  const problem = historyField(body, "問題") || historyField(body, "理由")
  return problem ? `${head}\n${problem}` : head
}

function classifyFinding(raw: string, severity: string, policy: ReviewPolicy): Finding {
  const pathMatch = raw.match(PATH_LINE_RE)
  const classTarget = classificationText(raw).toLowerCase()
  const matchedClasses = policy.block.classes
    .filter((c) => c.keywords.some((k) => classTarget.includes(k.toLowerCase())))
    .map((c) => c.class)
  const hasEvidence = EVIDENCE_RE.test(raw)
  const blockCandidate =
    policy.block.severities.includes(severity) || matchedClasses.length > 0
  return {
    severity,
    pathLine: pathMatch ? `${pathMatch[1]}:${pathMatch[2]}` : null,
    text: raw.trim(),
    classLabels: matchedClasses,
    hasEvidence,
    blockCandidate,
  }
}

// 審査履歴から「同じファイル」のレコードを抽出する（severity 引継ぎ / クラス引継ぎで共用）。
function historyMatchesInFile(pathLine: string, historyFull: string): RegExpMatchArray[] {
  if (!historyFull) return []
  const key = normalizeHistKey(pathLine)
  return [...historyFull.matchAll(new RegExp(HIST_ENTRY_RE.source, "gm"))].filter(
    (m) => normalizeHistKey(m[2]) === key,
  )
}

// 残存確認の重要度は審査履歴に記録された元の指摘（同じファイル）から引き継ぐ。
// 履歴に見つからない場合は null を返し、呼び出し側で安全側（HIGH）にフォールバックする。
// 行番号ドリフト許容は「そのファイルに該当レコードが1件だけ」のときのみに限定する。
// 同ファイルに複数レコードがある場合は行一致を要求し、別行・別指摘の重要度を取り違えない
// （不明時は呼び出し側の HIGH フォールバックで fail-closed）。
function severityInHistory(pathLine: string, historyFull: string): string | null {
  const matches = historyMatchesInFile(pathLine, historyFull)
  if (matches.length === 0) return null
  if (matches.length === 1) return matches[0][1]
  const exact = matches.find((m) => m[2] === pathLine)
  return exact ? exact[1] : null
}

// 履歴内の同一ファイル指摘にブロック対象クラスのラベル（[hardcoded-secret] 等）が付いているかを判定する。
// 残存確認（再発・未解決）のブロック判定で、severity が LOW/MEDIUM でも真正の機密系クラスは
// 警告化せずブロックに残すために使う。判定対象は severityInHistory と同じ「一意 or 行一致」の条件。
function blockClassInHistory(pathLine: string, historyFull: string, policy: ReviewPolicy): boolean {
  const matches = historyMatchesInFile(pathLine, historyFull)
  if (matches.length === 0) return false
  const labels = policy.block.classes.map((c) => c.class)
  const candidates = matches.length === 1 ? matches : matches.filter((m) => m[2] === pathLine)
  return candidates.some((m) => labels.some((c) => m[0].includes(`[${c}]`)))
}

// 複数エージェントの審査結果を1つの指摘集合に合成する。エージェントごとに analyzeFindings を
// 呼んでから合成するので、一方の結果にフェンス閉じ忘れがあっても他方の指摘に影響しない。
function mergeFindings(results: ReturnType<typeof analyzeFindings>[]): ReturnType<typeof analyzeFindings> {
  const blockers: Finding[] = []
  const warnings: Finding[] = []
  const resolved: string[] = []
  for (const r of results) {
    blockers.push(...r.blockers)
    warnings.push(...r.warnings)
    resolved.push(...r.resolved)
  }
  return { blockers, warnings, resolved }
}

function analyzeFindings(text: string, policy: ReviewPolicy, historyFull = "") {
  const lines = text.split("\n")
  const findings: Finding[] = []
  let current: { start: number; sev: string } | null = null
  const flush = (end: number) => {
    if (!current) return
    findings.push(classifyFinding(lines.slice(current.start, end).join("\n"), current.sev, policy))
    current = null
  }
  let inFence = false
  let lastFenceToggle = -1
  lines.forEach((line, i) => {
    // コードフェンス内（履歴・diff の引用等）は severity マーカー走査の対象外にする
    if (/^\s*```/.test(line)) {
      inFence = !inFence
      lastFenceToggle = i
      return
    }
    if (inFence) return
    // 審査履歴（docs/review-log.md）のレコード行は「引用」であって新規指摘ではないため走査対象外。
    // 行頭のまま引用して「検証方法:」を追記された場合の幻影ブロック（S5 経路）を構造的に塞ぐ
    if (HIST_ENTRY_RE.test(line)) return
    let sev = line.match(SEV_HEADER_RE)?.[1]
    if (!sev) sev = line.match(LEGACY_SEV_RE)?.[1]
    if (sev) {
      flush(i)
      current = { start: i, sev }
    }
  })
  flush(lines.length)
  // フェンスが閉じられず文末まで残った場合、最後のフェンス開始以降は指摘走査をやり直す。
  // 閉じ忘れで CRITICAL 指摘が黙って見逃される（fail-open）のを防ぐ目的で、末尾をフェンス非考慮で
  // 再スキャンしてマーカーを検出する（fail-closed）。閉じ忘れでも「文末の指摘」は検出される。
  if (inFence && lastFenceToggle >= 0) {
    for (let i = lastFenceToggle + 1; i < lines.length; i++) {
      if (HIST_ENTRY_RE.test(lines[i])) continue
      let sev = lines[i].match(SEV_HEADER_RE)?.[1]
      if (!sev) sev = lines[i].match(LEGACY_SEV_RE)?.[1]
      if (sev) {
        flush(i)
        current = { start: i, sev }
      }
    }
    flush(lines.length)
  }

  const resolved: string[] = []
  const remain: { pathLine: string; hasEvidence: boolean }[] = []
  for (const m of text.matchAll(RESOLVE_RE)) resolved.push(m[1])
  for (const m of text.matchAll(REMAIN_RE)) {
    remain.push({ pathLine: m[1], hasEvidence: EVIDENCE_RE.test(text.slice(m.index, m.index + 300)) })
  }

  const blockers: Finding[] = []
  const warnings: Finding[] = []
  const warningSeverities = new Set(policy.warning.severities)
  for (const f of findings) {
    if (f.blockCandidate) {
      // エビデンス不足のブロック候補は降格して警告にする（ブロック強度を落とさない）
      if (!policy.evidenceRequired || f.hasEvidence) blockers.push(f)
      else warnings.push(f)
    } else if (f.severity && warningSeverities.has(f.severity)) {
      // warning.severities に含まれる severity のみ警告として記録する（SSoT が警告対象を制御）
      warnings.push(f)
    }
    // warning.severities に含まれない非ブロック候補は記録しない（設定外はノイズとして扱わない）
  }
  for (const r of remain) {
    if (r.hasEvidence) {
      const sev = severityInHistory(r.pathLine, historyFull) ?? "HIGH"
      // 残存確認は履歴の元指摘の「severity とクラス」を尊重する：policy.block.severities
      // （既定 CRITICAL/HIGH）かブロック対象クラス（hardcoded-secret 等）の指摘のみブロックし、
      // MEDIUM/LOW の一般指摘は警告化する。履歴に記録がない場合は安全側で HIGH 扱い（ブロック）。
      const isBlock = policy.block.severities.includes(sev) || blockClassInHistory(r.pathLine, historyFull, policy)
      if (isBlock) {
        blockers.push({ severity: sev, pathLine: r.pathLine, text: `【残存確認】 ${r.pathLine}`, classLabels: [], hasEvidence: true, blockCandidate: true })
      } else {
        warnings.push({ severity: sev, pathLine: r.pathLine, text: `【残存確認】 ${r.pathLine}`, classLabels: [], hasEvidence: true, blockCandidate: false })
      }
    } else {
      warnings.push({ severity: "MEDIUM", pathLine: r.pathLine, text: `【残存確認（エビデンスなし）】 ${r.pathLine}`, classLabels: [], hasEvidence: false, blockCandidate: false })
    }
  }

  return { blockers, warnings, resolved }
}

function readHistoryFull(worktree: string, policy: ReviewPolicy): string {
  try {
    const p = join(worktree, policy.historyFile)
    return existsSync(p) ? readFileSync(p, "utf8") : ""
  } catch {
    return ""
  }
}

function readHistoryPreview(history: string, policy: ReviewPolicy): string {
  return history.split("\n").slice(-policy.historyRecentLines).join("\n")
}

function historyField(body: string, header: string): string {
  const m = body.match(new RegExp(`${header.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}[:：]\\s*(.+)`))
  return m ? m[1].trim() : ""
}

// path（file:line）のない指摘は `-` で記録される。HIST_ENTRY_RE は file:line 形式のみマッチするため
// 解消上書き（status: 未解決 → 解消済み）の対象にはならないが、これは意図的な設計：
// path のない指摘は「同一指摘」として特定できないため、再発時は再ブロック（または警告記録）して
// 修正されるまでゲートが収束しないのが正しい挙動。

// 履歴に書き出す指摘本文・検証エビデンスの秘密値を隠す。SECRET_CONTENT_REGS と HISTORY_MASK_REGS を
// 両方適用し、マッチは先頭 6 文字を残して *** に置換する（引用元の特定可能性だけ保つ）。
function maskSecrets(text: string): string {
  if (!text) return text
  let out = text
  for (const re of HISTORY_MASK_REGS) {
    out = out.replace(re, (matched: string) => (matched.length <= 6 ? "***" : `${matched.slice(0, 6)}***`))
  }
  for (const re of SECRET_CONTENT_REGS) {
    out = out.replace(re, (matched: string) => (matched.length <= 6 ? "***" : `${matched.slice(0, 6)}***`))
  }
  return out
}

// 履歴レコードの自由文（検証・問題欄）に `[重要度: X]` に類する文字列が混入すると、
// 後にその履歴を引用した監査の報告が再びマーカーとして拾われ幽霊指摘の温床になるため、
// 書き出し時に中和する（レコード自身の先頭ヘッダは対象外）。
function severityNeutral(value: string): string {
  return value.replace(/\[重要度:\s*(CRITICAL|HIGH|MEDIUM|LOW)\]/gi, "[重要度:?]")
}

function findingToRecord(f: Finding, status: string): string {
  const sev = f.severity ?? "MEDIUM"
  const cls = f.classLabels.length ? `[${f.classLabels[0]}]` : "[-]"
  const pathLine = f.pathLine ?? "-"
  const evidence = severityNeutral(maskSecrets(historyField(f.text, "検証方法") || f.text.slice(0, 60).replace(/\s+/g, " ")))
  const problem = severityNeutral(maskSecrets((historyField(f.text, "問題") || historyField(f.text, "理由") || "").slice(0, 120)))
  return `[重要度: ${sev}] ${cls} ${pathLine} | status: ${status} | 検証: ${evidence} | 問題: ${problem}`
}

function normalizeHistKey(p: string): string {
  return p.replace(/:\d+$/, "")
}

function applyHistory(historyFull: string, resolved: string[], newRecords: string[]): string {
  const resolvedFull = new Set(resolved)
  const resolvedPath = new Set(resolved.map(normalizeHistKey))
  const lines = historyFull.split("\n")
  // 履歴に現れる指摘の行番号・status を集計する
  const historyPathLines = new Set<string>()
  const unresolvedLineIdx = new Map<string, number>() // pathLine -> その未解決レコードの行 index
  const unresolvedCountByFile = new Map<string, number>()
  lines.forEach((line, i) => {
    const m = line.match(HIST_ENTRY_RE)
    if (!m) return
    historyPathLines.add(m[2])
    if (m[3] === "未解決") {
      unresolvedLineIdx.set(m[2], i)
      const key = normalizeHistKey(m[2])
      unresolvedCountByFile.set(key, (unresolvedCountByFile.get(key) ?? 0) + 1)
    }
  })
  // 行番号ドリフト許容は「そのファイルに未解決レコードが1件だけのとき」のみにする。
  // さらに、報告された行番号が履歴に存在しない（新しい行番号 = 本当のドリフト）場合にのみ
  // 許容する。報告行が履歴に既に存在する（例: 解消済みの古い line を再度報告＝古い情報）なら
  // 誤って別レコードを解消済みにしない（fail-open 防止）。
  const newLineForFile = new Map<string, boolean>()
  for (const p of resolved) {
    if (!historyPathLines.has(p)) newLineForFile.set(normalizeHistKey(p), true)
  }
  const shouldResolve = (pathLine: string): boolean => {
    if (resolvedFull.has(pathLine)) return true
    const key = normalizeHistKey(pathLine)
    return (
      (unresolvedCountByFile.get(key) ?? 0) === 1 &&
      resolvedPath.has(key) &&
      newLineForFile.get(key) === true
    )
  }
  const resolvedLines = lines.map((line) => {
    const m = line.match(HIST_ENTRY_RE)
    if (!m || m?.[3] !== "未解決") return line
    return shouldResolve(m[2]) ? line.replace("status: 未解決", "status: 解消済み") : line
  })
  // 生成物（docs/review-log.md）は git 管理下の「生成状態ファイル」であり、prettier の整形対象外
  // （prettier --check を CI で実行するプロジェクトでは .prettierignore に docs/review-log.md を
  // 追加する）。ここでは可読性のため、リスト行の連続スペースを1つに折り畳むだけにする。
  const prettierLine = (r: string) => r.replace(/[ \t]{2,}/g, " ").replace(/\s+$/g, "")
  // 未解決レコードの重複蓄積を防ぐ：同じ pathLine の未解決レコードが既にあれば追記でなく置換する
  // （残存確認の再報告で未解決レコードが 1→2→3 と増え、一意ドリフト許容を自己無効化するのを防ぐ）
  const merged = resolvedLines.slice()
  const retained: string[] = []
  for (const record of newRecords) {
    const m = record.match(HIST_RECORD_RE)
    if (m && m[3] === "未解決" && unresolvedLineIdx.has(m[2])) {
      merged[unresolvedLineIdx.get(m[2])!] = `- ${prettierLine(record)}`
      continue
    }
    retained.push(record)
  }
  const section = `## ${new Date().toISOString()} commit-review\n\n${retained.map((r) => `- ${prettierLine(r)}`).join("\n")}\n`
  const head = merged.join("\n").trim()
  return head ? `${head}\n\n${section}` : section
}

function writeHistory(worktree: string, policy: ReviewPolicy, body: string): void {
  try {
    const p = join(worktree, policy.historyFile)
    mkdirSync(dirname(p), { recursive: true })
    writeFileSync(p, body.trim() + "\n")
  } catch {
    // 履歴の書込失敗はブロック判断に影響させない
  }
}

function formatLabel(result: string | null, i: number): string | null {
  if (!result) return null
  const label = i === 0 ? "【コードレビュー】" : "【セキュリティ監査】"
  return `${label}\n${result}`
}

async function notifySkipped(client: OpencodeClient, sessionId: string, notices: string[]): Promise<void> {
  const text = notices.join("\n")
  await client.session.prompt({
    path: { id: sessionId },
    body: {
      noReply: true,
      parts: [{ type: "text", text }],
    },
  })
  await client.tui.showToast({
    body: {
      message: "commit-review: 審査エージェント定義の一部が見つからずスキップしました",
      variant: "warning",
    },
  })
}

export const CommitReviewPlugin: Plugin = async ({ client, $, worktree }) => ({
  "tool.execute.before": async (input, output) => {
    if (input.tool !== "bash") return
    const cmd = output.args?.command || ""
    if (!isGitCommit(cmd)) return

    const sessionId = input.sessionID
    if (!sessionId) return

    // フックバイパスは commit-review 自体がブロックする
    if (hasHookBypass(cmd)) {
      throw new Error(
        "[commit-review] フックバイパス操作（--no-verify / core.hooksPath 変更）は許可されません。フックを有効にしたままコミットしてください。",
      )
    }

    const policy = await readPolicy(worktree)

    // 1. ステージ済み差分を取得
    if (/^git\s+add\s+-A\s*&&\s*git\s+commit\b/.test(cmd)) {
      await $`git add -A`.nothrow().quiet()
    }
    const diffResult = await $`git diff --cached`.nothrow().quiet()
    const diff = diffResult.text()
    if (!diff || !diff.trim()) return

    const namesResult = await $`git diff --cached --name-only`.nothrow().quiet()
    const stagedNames = namesResult.text().split("\n").map((n) => n.trim()).filter(Boolean)

    // 2. 両方のプロンプトを並列読み込み
    const [reviewerMd, auditorMd] = await Promise.all([
      readAgentPrompt(worktree, "code-reviewer.md"),
      readAgentPrompt(worktree, "security-auditor.md"),
    ])
    // 説明書の欠落は設定ミス（setup 未実行・手動削除等）。恒久ブロックで初心者をデッドロックさせず、
    // 毎コミット（AI + 人間）に通知して回復へ導く。code-reviewer.md が無くても security-auditor は継続し
    // 監査の穴を最小化する。
    const skipNotices: string[] = []
    if (!reviewerMd) {
      skipNotices.push(
        "[commit-review] 警告: .opencode/agents/code-reviewer.md が見つからないため「コードレビュー」をスキップしました（セキュリティ監査は継続）。setup-harness.sh の再実行またはファイルの復元で解消できます。",
      )
    }
    if (!auditorMd) {
      skipNotices.push(
        "[commit-review] 警告: .opencode/agents/security-auditor.md が見つからないため「セキュリティ監査」をスキップしました。",
      )
    }

    // 3. 履歴（状態）の読込
    const historyFull = readHistoryFull(worktree, policy)
    const historyRecent = readHistoryPreview(historyFull, policy)
    const policySrc = policyContext(policy)

    // 4. 依存マニフェスト変更時のみ決定的な依存監査を実行（検出した全てを対象・同じコマンドは1回に集約）
    const auditBlocks: string[] = []
    const matchedManifests = Object.keys(policy.dependencyAudits).filter((manifest) =>
      stagedNames.some((n) => n === manifest || n.endsWith(`/${manifest}`)),
    )
    // package.json + package-lock.json 等、同一コマンドが複数マニフェストに割り当てられている場合は1回に集約する
    const auditsByCommand = new Map<string, string[]>()
    for (const manifest of matchedManifests) {
      const cmd = policy.dependencyAudits[manifest]
      const manifests = auditsByCommand.get(cmd) ?? []
      manifests.push(manifest)
      auditsByCommand.set(cmd, manifests)
    }
    for (const [cmd, manifests] of auditsByCommand) {
      const auditRaced = await withTimeout($`${cmd}`.nothrow().quiet(), AUDIT_TIMEOUT_MS)
      const auditOut = (auditRaced.ok ? auditRaced.value.text() : "").slice(0, 4000)
      const manifestLabel = manifests.join(" / ")
      if (auditRaced.ok && auditOut.trim()) {
        auditBlocks.push(
          `依存マニフェスト（${manifestLabel}）の変更を検出したため依存監査を実行しました:\n\`\`\`\n${auditOut}\n\`\`\`\n` +
            `HIGH 以上の脆弱性があれば [重要度: HIGH] で報告してください（検証方法は監査出力の該当行）。`,
        )
      } else if (!auditRaced.ok) {
        auditBlocks.push(
          `依存マニフェスト（${manifestLabel}）の依存監査はタイムアウト（上限 ${Math.round(AUDIT_TIMEOUT_MS / 60000)} 分）のため実施できませんでした。レビューでは静的検査で代替確認してください。`,
        )
      }
    }
    const auditBlock = auditBlocks.join("\n\n")

    // 5. 両方のレビューを並列実行
    const diffBlock = `\`\`\`diff\n${diff}\n\`\`\``
    const historyHint = historyRecent.trim()
      ? `【審査履歴（docs/review-log.md の直近）】\n\`\`\`\n${historyRecent}\n\`\`\`\n\n指示:\n- 履歴に status: 未解決 で記録された指摘（同じファイル:行）は再報告しない\n- そのうち今回の diff で解消されたものは「【解消確認】 ファイル:行 | 検証方法: ...」と一行で報告\n- まだ解消していないものは「【残存確認】 ファイル:行 | 検証方法: ...」と一行で報告（検証方法必須。ブロック判定は判定ポリシーと同じ：block.severities/ブロック対象クラスに該当する指摘のみブロック、それ以外は警告として記録）`
      : "（審査履歴はまだありません）"

    const reviewMessage = `以下の git diff のコードレビューを実施してください。\n\n【判定ポリシー】\n${policySrc}\n\n${historyHint}\n\n新規の指摘のみ [重要度: ...] 形式で報告してください。\n\n\n${diffBlock}`
    const auditMessage = `以下の git diff のセキュリティ監査を実施してください。\n\n【判定ポリシー】\n${policySrc}\n\n${historyHint}\n\n${auditBlock}\n\n新規の指摘のみ [重要度: ...] 形式で報告してください。\n\n${diffBlock}`

    const reviewTimeoutMinutes = Math.round(policy.reviewTimeoutMs / 60000)
    postNotice(
      client,
      sessionId,
      `[commit-review] コードレビューとセキュリティ監査を開始しました（上限 ${reviewTimeoutMinutes} 分）。完了までコミットが一時停止します。`,
    )

    const [reviewRun, auditRun] = await Promise.all([
      reviewerMd
        ? runReviewInSession(client, sessionId, "commit-review-code", "コードレビュー", reviewerMd, reviewMessage, policy.reviewTimeoutMs)
        : Promise.resolve({ text: null, timedOut: false } as ReviewRun),
      auditorMd
        ? runReviewInSession(client, sessionId, "commit-review-security", "セキュリティ監査", auditorMd, auditMessage, policy.reviewTimeoutMs)
        : Promise.resolve({ text: null, timedOut: false } as ReviewRun),
    ])
    const reviewResult = reviewRun.text
    const auditResult = auditRun.text
    const timedOutLabels: Array<"コードレビュー" | "セキュリティ監査"> = [
      reviewRun.timedOut ? "コードレビュー" : null,
      auditRun.timedOut ? "セキュリティ監査" : null,
    ].filter((x): x is "コードレビュー" | "セキュリティ監査" => x !== null)

    // 6. 結果を結合
    const combined = [reviewResult, auditResult].filter(Boolean).join("\n\n")
    if (!combined.trim() && timedOutLabels.length === 0) {
      // 説明書の欠落によるスキップは従来どおり通知のみで継続（回復へ導く・恒久ブロックはしない）
      if (!reviewerMd || !auditorMd) {
        if (skipNotices.length) await notifySkipped(client, sessionId, skipNotices)
        return
      }
      // 両方起動したのに無言で帰ってきた = 審査が成立していない。fail-closed のため通知してブロックする（素通ししない）
      await client.session.prompt({
        path: { id: sessionId },
        body: {
          noReply: true,
          parts: [
            {
              type: "text",
              text: "[commit-review] コードレビューとセキュリティ監査の両方が結果を返しませんでした（無言）。審査が成立しないままのコミットを防ぎます（安全側）。モデル/環境の状態を確認し、再度コミットしてください。",
            },
          ],
        },
      })
      await client.tui.showToast({
        body: { message: "commit-review: 両監査とも無言のためコミットをブロック", variant: "warning" },
      })
      throw new Error(
        "[commit-review] コードレビューとセキュリティ監査の両方が結果を返しませんでした（無言）。モデル/環境の状態を確認し、再度コミットしてください。",
      )
    }

    const merged = mergeFindings(
      [reviewResult, auditResult]
        .filter((r): r is string => Boolean(r))
        .map((src) => analyzeFindings(src, policy, historyFull)),
    )
    const { blockers, warnings, resolved } = merged

    // 7. 履歴を更新（ブロック/通過どちらでも記録する）
    const newRecords: string[] = []
    for (const b of blockers) newRecords.push(findingToRecord(b, "未解決"))
    for (const w of warnings) newRecords.push(findingToRecord(w, "警告"))
    for (const label of timedOutLabels) {
      newRecords.push(
        `[重要度: LOW] [-] - | status: 警告 | 検証: タイムアウト（上限 ${reviewTimeoutMinutes} 分） | 問題: ${label} が完了しませんでした`,
      )
    }
    resolved.forEach((p) => newRecords.push(`解消済み確認: ${p} | status: 解消済み`))
    if (newRecords.length) {
      writeHistory(worktree, policy, applyHistory(historyFull, resolved, newRecords))
    }

    // 8. 結果ラベルを整形
    const detailParts = [reviewResult, auditResult]
      .map((r, i) => formatLabel(r, i))
      .filter(Boolean)
      .join("\n\n")
    const noticeText = skipNotices.length ? `${skipNotices.join("\n")}\n\n` : ""
    const hasTimeout = timedOutLabels.length > 0

    if (blockers.length > 0 || hasTimeout) {
      const blockingText = blockers.map((b) => b.text).join("\n\n")
      const blockHeader =
        blockers.length > 0
          ? `[commit-review] ブロック対象の指摘を ${blockers.length} 件検出しました（警告 ${warnings.length} 件）。`
          : `[commit-review] 指摘はありませんでしたが監査にタイムアウトが発生しました（警告 ${warnings.length} 件）。`
      const timeoutText = hasTimeout
        ? `監査が上限（${reviewTimeoutMinutes} 分）までに完了しませんでした（${timedOutLabels.join("・")}）。監査未完走のためこのコミットはブロックされます（安全側）。モデル/環境の状態を確認し、再度コミットしてください。\n\n`
        : ""
      await client.session.prompt({
        path: { id: sessionId },
        body: {
          noReply: true,
          parts: [
            {
              type: "text",
              text: `${blockHeader}\n\n${timeoutText}${noticeText}${blockingText}\n\n${detailParts}`,
            },
          ],
        },
      })

      const toastText = blockers.length > 0 && hasTimeout
        ? `commit-review: 監査タイムアウト・ブロック対象 ${blockers.length} 件を検出`
        : hasTimeout
          ? "commit-review: 監査タイムアウトのためコミットをブロック"
          : `commit-review: ブロック対象 ${blockers.length} 件を検出`
      await client.tui.showToast({
        body: {
          message: toastText,
          variant: "warning",
        },
      })

      const reason = hasTimeout
        ? `監査がタイムアウト（上限 ${reviewTimeoutMinutes} 分）したため（${timedOutLabels.join("・")}）`
        : `ブロック対象の指摘（${blockers.length} 件）`
      throw new Error(
        `[commit-review] ${reason}。修正または環境確認の上、再度コミットしてください。`,
      )
    }

    // 問題なし or 警告のみ
    const summary = warnings.length > 0 ? `（警告 ${warnings.length} 件・ブロックなし）` : ""
    await client.session.prompt({
      path: { id: sessionId },
      body: {
        noReply: true,
        parts: [
          {
            type: "text",
            text: `[commit-review] 全てのレビュー完了：問題なし${summary}\n\n${noticeText}${detailParts}`,
          },
        ],
      },
    })
  },
})