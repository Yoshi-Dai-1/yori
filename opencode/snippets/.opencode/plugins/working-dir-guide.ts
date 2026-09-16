import type { Plugin } from "@opencode-ai/plugin"

/**
 * working-dir-guide.ts
 *
 * docs/working/ 内ファイルの Read/Write/Edit 検知時にルールを注入する。
 *
 * - Read: 初回のみ注入（セッション内キャッシュでノイズ軽減）
 * - Write/Edit: 原則毎回注入（常識が陳腐化しないよう最新のルールを保証）。
 *   ただし同一文面の30秒以内の連続注入は捨てる（複数ファイル連続操作時の連投軽減）。
 *
 * tasks.json の Read も検知し、group フィールドとアーカイブ条件を通知する。
 */

const WORKING_DIR_RULES = `
## 作業ディレクトリ（docs/working/）のルール

このファイルは作業ディレクトリの一部です。
以下のルールに従ってください：

- 構造：各 <group>/ には \`plan.md\` / \`notes.md\` / \`review-checklist.md\` を配置
- 完了条件：@evaluator のみが \`docs/tasks.json\` の passes を true に設定できます（他自己宣言は無効）
- アーカイブ：同一 group フィールドの全 passes:true 時、\`task-archive.ts\` が提案 → AI が \`docs/archive/\` に移動
- 規模判断：
  - 単機能（1タスク）→ 作業ディレクトリ不要
  - 大規模（6タスク以上）→ 作業ディレクトリを使う
  - \`docs/working/\` 内ディレクトリが2以上 → 作業ディレクトリ必須
- ファイルライフサイクル：
  - \`plan.md\`: 作成後は原則変更しない（計画変更時のみ上書き）
  - \`notes.md\`: 各セッションで追記（過去の記録は削除しない）
  - \`review-checklist.md\`: 完了した項目は [ ] を [x] に変更。未完了項目は残す
  - \`review-checklist.md\`: @evaluator FAIL 後はテンプレートの手順に従う
`.trim()

const FAIL_RULES = `
## @evaluator FAIL 検知

\`.opencode/.evaluator-failed\` が存在します（@evaluator が FAIL しました）。
以下の手順で対応してください：
1. @evaluator の評価結果をチャットから読み取る
2. 修正項目を \`review-checklist.md\` の「修正が必要な事項」に追記
3. 修正作業を実行
4. 「修正完了確認」で完了を確認
5. \`.opencode/.evaluator-failed\` を削除
6. 再度 @evaluator を呼び出す
`.trim()

const TASKS_JSON_RULES = `
## docs/tasks.json のルール

- passes フィールドは @evaluator のみが更新できます（\`tasks-guard.ts\` が機械的に保護）
- group フィールドを持つタスクは \`docs/working/<group>/\` と対応
- 全 group の passes:true → \`task-archive.ts\` がアーカイブを提案
`.trim()

const INJECTED_SESSIONS = new Set<string>()
// 同一文面の連続注入を抑えるための最終送信時刻（セッションID + 文面種別）。
// 複数ファイルを続けて触ると同一ルールが連投されるため、短時間の重複は捨てる。
// ルール自体は `read` 初回・`write/edit` 毎回の原則を変えない（鮮度は保つ）。
const LAST_INJECT_AT = new Map<string, number>()
const INJECT_DEDUP_MS = 30 * 1000
// セッションIDとファイルパスを並べる際の区切り。バックスラッシュゼロはパスに現れない。
// これを使うことで「ID が前方一致する別セッションのキー」を誤削除しない（例: "S1" が "S12" を巻き込む）。
const KEY_SEP = "\u0000"

// コンパクション後の AI 記憶喪失に合わせて、Read 初回注入キャッシュをクリアして
// ルールを再注入できるようにする（arch-diag.ts / rule-injector.ts と同型の対策）。
function resetAfterCompaction(sessionId: string) {
  const prefix = sessionId + KEY_SEP
  for (const key of INJECTED_SESSIONS) {
    if (key.startsWith(prefix)) {
      INJECTED_SESSIONS.delete(key)
    }
  }
  for (const key of LAST_INJECT_AT.keys()) {
    if (key.startsWith(prefix)) {
      LAST_INJECT_AT.delete(key)
    }
  }
}

export const WorkingDirGuidePlugin: Plugin = async ({ client }) => ({
  "tool.execute.before": async (input, output) => {
    const fp = output.args.filePath || output.args.path || ""
    if (!fp) return

    const isWorkingDir = fp.match(/docs\/working\/[^/]+\//)
    const isTasksJson = fp.includes("docs/tasks.json")
    if (!isWorkingDir && !isTasksJson) return

    const sessionId = input.sessionID
    if (!sessionId) return
    let rules = isTasksJson ? TASKS_JSON_RULES : WORKING_DIR_RULES

    // review-checklist.md の Read 時に FAIL マーカーを検知（キャッシュより先に判定し、FAIL は隠れない）
    const isReviewChecklist = fp.includes("review-checklist.md")
    if (isReviewChecklist && input.tool === "read") {
      const failed = await Bun.file(".opencode/.evaluator-failed")
        .text()
        .then(() => true)
        .catch(() => false)
      if (failed) {
        rules = FAIL_RULES
      }
    }

    // FAIL 以外は同一文面の短時間連投を束ねる（連投軽減）。操作別に束ねるため
    // Read→直後Write の通常手順が抑止されない。FAIL は状態通知のため対象外。
    if (rules !== FAIL_RULES) {
      const op = input.tool === "read" ? "read" : "write"
      const kind = isTasksJson ? `tasks:${op}` : `working:${op}`
      const dk = sessionId + KEY_SEP + kind
      const now = Date.now()
      const last = LAST_INJECT_AT.get(dk)
      if (last !== undefined && now - last < INJECT_DEDUP_MS) return
      LAST_INJECT_AT.set(dk, now)
    }

    if (input.tool === "read" && rules !== FAIL_RULES) {
      const key = sessionId + KEY_SEP + fp
      if (INJECTED_SESSIONS.has(key)) {
        // 束ねで抑止された場合は登録していないため、ここは純粋な二回目 Read の抑止
        return
      }
    }
    await client.session.prompt({
      path: { id: sessionId },
      body: {
        noReply: true,
        parts: [{ type: "text", text: rules }],
      },
    })
    if (input.tool === "read" && rules !== FAIL_RULES) {
      INJECTED_SESSIONS.add(sessionId + KEY_SEP + fp)
    }
  },
  // コンパクション検知：Read 初回注入キャッシュをリセット（記憶喪失後の再注入を可能にする）
  "experimental.session.compacting": async (input) => {
    const sessionId = input.sessionID
    if (sessionId) resetAfterCompaction(sessionId)
  },
  // 安定APIフォールバック：session.compacted イベントでもリセット。session.deleted で状態を破棄する
  event: async (input) => {
    const ev = input.event
    if (!ev) return
    if (ev.type === "session.compacted") {
      resetAfterCompaction(ev.properties.sessionID)
      return
    }
    if (ev.type === "session.deleted") {
      // セッション削除時は Read 初回注入キャッシュを破棄（メモリリーク防止）
      resetAfterCompaction(ev.properties.info.id)
    }
  },
})
