import type { Plugin } from "@opencode-ai/plugin"
import type { OpencodeClient } from "@opencode-ai/sdk/client"
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs"
import { dirname, join } from "path"

/**
 * commit-review.ts
 *
 * git commit 実行前にコードレビューとセキュリティ監査を自動実行する。
 * 子セッションで @code-reviewer（一般レビュー）と @security-auditor（セキュリティ監査）を
 * 並列実行し、判定ポリシー（.opencode/config/review-policy.json）に従ってブロックする。
 *
 * 設計方針：
 * - 判定はレビュアーの主観 severity だけでなく「severity + ブロック対象クラス + 検証方法（エビデンス）」で行う
 * - ブロック対象: [重要度: HIGH/CRITICAL] またはブロック対象クラスに該当し、検証方法が添えられた指摘
 * - 警告扱い: policy.warning.severities（既定 MEDIUM/LOW）+ エビデンス不足のブロック候補
 * - 審査履歴 docs/review-log.md を読み、未解決指摘の「解消」「残存」を確認・記録する。同一指摘の再報告と
 *   解消済み指摘の再ブロックを防ぎ、ゲートの収束を保証する（履歴 = 状態を持つゲート）
 * - 依存マニフェストが diff に含まれる場合のみ、決定的な依存監査（npm audit 等）を実行して監査結果を添付する
 * - フックバイパス（--no-verify / core.hooksPath 変更等）は commit-review 自体がブロックする
 */

interface Finding {
  severity: string | null
  pathLine: string | null
  text: string
  classLabels: string[]
  hasEvidence: boolean
  blockCandidate: boolean
}

interface ReviewPolicy {
  severityOrder: string[]
  block: { severities: string[]; classes: { class: string; keywords: string[] }[] }
  warning: { severities: string[] }
  evidenceRequired: boolean
  historyFile: string
  historyRecentLines: number
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

const GIT_COMMIT_RE = /\bgit\s+(?:-[Cc]\s+\S+\s+)*commit\b/
const HOOK_BYPASS_RE = /(?:--no-verify\b|-c\s+core\.hooksPath|core\.hooksPath\s*=|GIT_HOOKS_PATH)/

export const SEV_HEADER_RE = /\[重要度:\s*(CRITICAL|HIGH|MEDIUM|LOW)\]/
export const LEGACY_SEV_RE = /^\[(CRITICAL|HIGH|MEDIUM|LOW)\]\s/
export const RESOLVE_RE = /【解消確認】\s*([\w./@-]+\.\w+:\d+)/g
export const REMAIN_RE = /【残存確認】\s*([\w./@-]+\.\w+:\d+)/g
export const EVIDENCE_RE = /検証方法[:：]/
const PATH_LINE_RE = /([\w./@-]+\.\w+):(\d+)/
export const HIST_ENTRY_RE = /^- \[重要度: (CRITICAL|HIGH|MEDIUM|LOW)\]\s*(?:\[[^\]]*\]\s*)?([\w./@-]+\.\w+:\d+)\s*\|\s*status: (未解決|解消済み|警告)/

export function isGitCommit(cmd: string): boolean {
  return GIT_COMMIT_RE.test(cmd)
}

export function hasHookBypass(cmd: string): boolean {
  return HOOK_BYPASS_RE.test(cmd)
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
    dependencyAudits: { ...defaults.dependencyAudits, ...(raw?.dependencyAudits ?? {}) },
  }
}

export async function readPolicy(worktree: string): Promise<ReviewPolicy> {
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

async function runReviewInSession(
  client: OpencodeClient,
  parentSessionId: string,
  title: string,
  systemPrompt: string,
  userMessage: string,
): Promise<string | null> {
  let childSessionId: string | undefined
  try {
    const child = await client.session.create({
      body: { parentID: parentSessionId, title },
    })
    childSessionId = child.data?.id
  } catch {
    return null
  }
  if (!childSessionId) return null

  try {
    const resp = await client.session.prompt({
      path: { id: childSessionId },
      body: {
        parts: [{ type: "text", text: userMessage }],
        system: systemPrompt,
      },
    })
    const parts = resp.data?.parts || []
    return parts
      .filter((p: any) => p.type === "text")
      .map((p: any) => p.text)
      .join("\n")
  } catch {
    return null
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

function classifyFinding(raw: string, severity: string, policy: ReviewPolicy): Finding {
  const pathMatch = raw.match(PATH_LINE_RE)
  const matchedClasses = policy.block.classes
    .filter((c) => c.keywords.some((k) => raw.toLowerCase().includes(k.toLowerCase())))
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

export function analyzeFindings(text: string, policy: ReviewPolicy) {
  const lines = text.split("\n")
  const findings: Finding[] = []
  let current: { start: number; sev: string } | null = null
  const flush = (end: number) => {
    if (!current) return
    findings.push(classifyFinding(lines.slice(current.start, end).join("\n"), current.sev, policy))
    current = null
  }
  lines.forEach((line, i) => {
    let sev = line.match(SEV_HEADER_RE)?.[1]
    if (!sev) sev = line.match(LEGACY_SEV_RE)?.[1]
    if (sev) {
      flush(i)
      current = { start: i, sev }
    }
  })
  flush(lines.length)

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
    if (r.hasEvidence) blockers.push({ severity: "HIGH", pathLine: r.pathLine, text: `【残存確認】 ${r.pathLine}`, classLabels: [], hasEvidence: true, blockCandidate: true })
    else warnings.push({ severity: "MEDIUM", pathLine: r.pathLine, text: `【残存確認（エビデンスなし）】 ${r.pathLine}`, classLabels: [], hasEvidence: false, blockCandidate: false })
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
export function findingToRecord(f: Finding, status: string): string {
  const sev = f.severity ?? "MEDIUM"
  const cls = f.classLabels.length ? `[${f.classLabels[0]}]` : "[-]"
  const pathLine = f.pathLine ?? "-"
  const evidence = historyField(f.text, "検証方法") || f.text.slice(0, 60).replace(/\s+/g, " ")
  const problem = (historyField(f.text, "問題") || historyField(f.text, "理由") || "").slice(0, 120)
  return `[重要度: ${sev}] ${cls} ${pathLine} | status: ${status} | 検証: ${evidence} | 問題: ${problem}`
}

function normalizeHistKey(p: string): string {
  return p.replace(/:\d+$/, "")
}

export function applyHistory(historyFull: string, resolved: string[], newRecords: string[]): string {
  const resolvedFull = new Set(resolved)
  const resolvedPath = new Set(resolved.map(normalizeHistKey))
  const lines = historyFull.split("\n").map((line) => {
    const m = line.match(HIST_ENTRY_RE)
    if (!m || m?.[3] !== "未解決") return line
    const pathLine = m[2]
    if (resolvedFull.has(pathLine) || resolvedPath.has(normalizeHistKey(pathLine))) {
      return line.replace("status: 未解決", "status: 解消済み")
    }
    return line
  })
  const section = `## ${new Date().toISOString()}  commit-review\n${newRecords.map((r) => `- ${r}`).join("\n")}\n`
  const head = lines.join("\n").trim()
  return head ? `${head}\n\n${section}` : section
}

export function writeHistory(worktree: string, policy: ReviewPolicy, body: string): void {
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

    // 4. 依存マニフェスト変更時のみ決定的な依存監査を実行
    let auditBlock = ""
    for (const [manifest, auditCmd] of Object.entries(policy.dependencyAudits)) {
      if (stagedNames.some((n) => n === manifest || n.endsWith(`/${manifest}`))) {
        const auditOut = (await $`${auditCmd}`.nothrow().quiet()).text().slice(0, 4000)
        if (auditOut.trim()) {
          auditBlock =
            `依存マニフェスト（${manifest}）の変更を検出したため依存監査を実行しました:\n\`\`\`\n${auditOut}\n\`\`\`\n` +
            `HIGH 以上の脆弱性があれば [重要度: HIGH] で報告してください（検証方法は監査出力の該当行）。`
        }
        break
      }
    }

    // 5. 両方のレビューを並列実行
    const diffBlock = `\`\`\`diff\n${diff}\n\`\`\``
    const historyHint = historyRecent.trim()
      ? `【審査履歴（docs/review-log.md の直近）】\n\`\`\`\n${historyRecent}\n\`\`\`\n\n指示:\n- 履歴に status: 未解決 で記録された指摘（同じファイル:行）は再報告しない\n- そのうち今回の diff で解消されたものは「【解消確認】 ファイル:行 | 検証方法: ...」と一行で報告\n- まだ解消していないものは「【残存確認】 ファイル:行 | 検証方法: ...」と報告（検証方法必須・ブロック対象）`
      : "（審査履歴はまだありません）"

    const reviewMessage = `以下の git diff のコードレビューを実施してください。\n\n【判定ポリシー】\n${policySrc}\n\n${historyHint}\n\n新規の指摘のみ [重要度: ...] 形式で報告してください。\n\n\n${diffBlock}`
    const auditMessage = `以下の git diff のセキュリティ監査を実施してください。\n\n【判定ポリシー】\n${policySrc}\n\n${historyHint}\n\n${auditBlock}\n\n新規の指摘のみ [重要度: ...] 形式で報告してください。\n\n${diffBlock}`

    const [reviewResult, auditResult] = await Promise.all([
      reviewerMd
        ? runReviewInSession(client, sessionId, "commit-review-code", reviewerMd, reviewMessage)
        : Promise.resolve(null),
      auditorMd
        ? runReviewInSession(client, sessionId, "commit-review-security", auditorMd, auditMessage)
        : Promise.resolve(null),
    ])

    // 6. 結果を結合
    const combined = [reviewResult, auditResult].filter(Boolean).join("\n\n")
    if (!combined.trim()) {
      if (skipNotices.length) await notifySkipped(client, sessionId, skipNotices)
      return
    }

    const { blockers, warnings, resolved } = analyzeFindings(combined, policy)

    // 7. 履歴を更新（ブロック/通過どちらでも記録する）
    const newRecords: string[] = []
    for (const b of blockers) newRecords.push(findingToRecord(b, "未解決"))
    for (const w of warnings) newRecords.push(findingToRecord(w, "警告"))
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

    if (blockers.length > 0) {
      const blockingText = blockers.map((b) => b.text).join("\n\n")
      await client.session.prompt({
        path: { id: sessionId },
        body: {
          noReply: true,
          parts: [
            {
              type: "text",
              text: `[commit-review] ブロック対象の指摘を ${blockers.length} 件検出しました。以下を修正してから再度コミットしてください（警告 ${warnings.length} 件）。\n\n${noticeText}${blockingText}\n\n${detailParts}`,
            },
          ],
        },
      })

      await client.tui.showToast({
        body: {
          message: `commit-review: ブロック対象 ${blockers.length} 件を検出`,
          variant: "warning",
        },
      })

      throw new Error(
        `[commit-review] コードレビューまたはセキュリティ監査でブロック対象の指摘が見つかりました（${blockers.length} 件）。修正してから再度コミットしてください。`,
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