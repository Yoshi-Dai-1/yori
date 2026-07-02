import type { Plugin } from "@opencode-ai/plugin"

const TARGET_TOOLS = ["write", "edit", "multiedit"]
const THRESHOLD = 3

export const AdrPromptPlugin: Plugin = async ({ client }) => {
  let editCount = 0
  let hasPrompted = false

  return {
    "tool.execute.after": async (input) => {
      if (hasPrompted) return
      if (!TARGET_TOOLS.includes(input.tool)) return

      editCount++
      if (editCount < THRESHOLD) return

      hasPrompted = true

      const sessionId = input.sessionID
      if (!sessionId) return

      await client.session.prompt({
        path: { id: sessionId },
        body: {
          noReply: true,
          parts: [
            {
              type: "text",
              text: [
                "---adr-prompt---",
                "複数のファイルを編集しました。",
                "実装が完了したら AGENTS.md の Report Format に従って報告し、",
                "decisions/ への記録が必要な判断（ライブラリ選定・データモデル・",
                "認証方式・方針変更）があれば提案してください。",
                "---adr-prompt---",
              ].join("\n"),
            },
          ],
        },
      })
    },
  }
}
