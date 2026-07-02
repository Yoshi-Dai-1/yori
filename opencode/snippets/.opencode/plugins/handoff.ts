import type { Plugin } from "@opencode-ai/plugin"

const HANDOFF_PATH = ".opencode/handoff-artifact.md"
const TRIGGER_PATH = ".opencode/.handoff-trigger"
const DEBOUNCE_MS = 30 * 60 * 1000

export const HandoffPlugin: Plugin = async ({ client, $ }) => {
  let lastIdleTime = 0

  return {
    "session.idle": async (event) => {
      const now = Date.now()
      if (now - lastIdleTime < DEBOUNCE_MS) return
      lastIdleTime = now

      const filled = await $`test -f ${HANDOFF_PATH} && grep -q "<!-- HANDOFF_FILLED -->" ${HANDOFF_PATH}`
        .nothrow().quiet()
      if (filled.exitCode === 0) return

      const sessionId = event?.sessionID
      if (!sessionId) return

      const datetimeStr = new Date().toISOString().replace("T", " ").substring(0, 16)

      const gitResult = await $`git status --porcelain`.nothrow().quiet()
      const gitDisplay = gitResult.exitCode === 0
        ? gitResult.text.trim()
          ? gitResult.text.trim().split("\n").map((l: string) => l.substring(3)).join("\n")
          : "（変更なし）"
        : "（git管理外）"

      // Write trigger file as fallback signal
      await Bun.write(TRIGGER_PATH, `sessionId=${sessionId}\ndatetime=${datetimeStr}\n`)

      // Inject handoff generation instruction (noReply = no visible UX impact)
      await client.session.prompt({
        path: { id: sessionId },
        body: {
          noReply: true,
          parts: [{
            type: "text",
            text: [
              "---handoff---",
              "セッションが長時間アイドル状態です。handoff を生成してください。",
              `日時: ${datetimeStr}`,
              `Git変更:`,
              gitDisplay,
              "",
              "1. 会話履歴から以下を要約して .opencode/handoff-artifact.md に write_file で保存（既存は上書き）",
              "   - 前のセッションの状態（取り組んでいた機能・完了部分・途中・次にやること）",
              "   - 重要な決定事項",
              "   - 未解決の問題",
              "   - Security Status（対応レベル・適用規制・未対応要件・完了実装・脆弱性状態）",
              "   - 変更したファイル",
              "2. 末尾に <!-- HANDOFF_FILLED --> を含める",
              "3. docs/build-log.md に日付行を追記",
              "4. .opencode/.handoff-trigger ファイルが存在する場合は削除",
              "---handoff---",
            ].join("\n")
          }]
        }
      })
    }
  }
}
