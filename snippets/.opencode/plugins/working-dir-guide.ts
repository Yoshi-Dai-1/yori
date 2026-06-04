import type { Plugin } from "@opencode-ai/plugin"

/**
 * working-dir-guide.ts
 *
 * docs/working/ 内ファイルの Read/Write/Edit 検知時にルールを注入する。
 *
 * - Read: 初回のみ注入（セッション内キャッシュでノイズ軽減）
 * - Write/Edit: 毎回注入（常識が陳腐化しないよう最新のルールを保証）
 *
 * tasks.json の Read も検知し、group フィールドとアーカイブ条件を通知する。
 */

const WORKING_DIR_RULES = `
## 作業ディレクトリ（docs/working/）のルール

このファイルは作業ディレクトリの一部です。
以下のルールに従ってください：

- 構造：各 <group>/ には plan.md / notes.md / review-checklist.md を配置
- 完了条件：@evaluator のみが docs/tasks.json の passes を true に設定できます（他自己宣言は無効）
- アーカイブ：同一 group フィールドの全 passes:true 時、task-archive.ts が提案 → AI が docs/archive/ に移動
- 規模判断：
  - 単機能（1タスク）→ 作業ディレクトリ不要
  - 大規模（6タスク以上）→ 作業ディレクトリを使う
  - docs/working/ 内ディレクトリが2以上 → 作業ディレクトリ必須
- ファイルライフサイクル：
  - plan.md: 作成後は原則変更しない（計画変更時のみ上書き）
  - notes.md: 各セッションで追記（過去の記録は削除しない）
  - review-checklist.md: 完了した項目は [ ] を [x] に変更。未完了項目は残す
  - review-checklist.md: @evaluator FAIL 後はテンプレートの手順に従う
`.trim()

const FAIL_RULES = `
## @evaluator FAIL 検知

.opencode/.evaluator-failed が存在します（@evaluator が FAIL しました）。
以下の手順で対応してください：
1. @evaluator の評価結果をチャットから読み取る
2. 修正項目を review-checklist.md の「修正が必要な事項」に追記
3. 修正作業を実行
4. 「修正完了確認」で完了を確認
5. .opencode/.evaluator-failed を削除
6. 再度 @evaluator を呼び出す
`.trim()

const TASKS_JSON_RULES = `
## docs/tasks.json のルール

- passes フィールドは @evaluator のみが更新できます（tasks-guard.ts が機械的に保護）
- group フィールドを持つタスクは docs/working/<group>/ と対応
- 全 group の passes:true → task-archive.ts がアーカイブを提案
`.trim()

const INJECTED_SESSIONS = new Set<string>()

export const WorkingDirGuidePlugin: Plugin = async ({ client }) => ({
  "tool.execute.before": async (input, output) => {
    const fp = output.args.filePath || output.args.path || ""
    if (!fp) return

    const isWorkingDir = fp.match(/docs\/working\/[^/]+\//)
    const isTasksJson = fp.includes("docs/tasks.json")
    if (!isWorkingDir && !isTasksJson) return

    const sessionId = (input as any).sessionID
    let rules = isTasksJson ? TASKS_JSON_RULES : WORKING_DIR_RULES

    // review-checklist.md の Read 時に FAIL マーカーを検知
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

    if (input.tool === "read") {
      if (INJECTED_SESSIONS.has(sessionId + fp)) return
      INJECTED_SESSIONS.add(sessionId + fp)
    }

    if (!sessionId) return
    await client.session.prompt({
      path: { id: sessionId },
      body: {
        noReply: true,
        parts: [{ type: "text", text: rules }],
      },
    })
  },
})
