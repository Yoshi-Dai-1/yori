import type { Plugin } from "@opencode-ai/plugin"

/**
 * doc-links.ts
 *
 * ドキュメント内のローカルリンクの整合性をチェックする。
 *
 * P1-3 修正（2026-06）：AI 通知パターンに統一
 * - 旧：`client.app.log` のみ（警告が出るが AI も人間も気づかない）
 * - 新：`client.tui.showToast` + `client.session.prompt` で AI に通知・修正依頼
 * - 他の Plugin と同じパターン
 */

const TARGET_FILES = [
  /AGENTS\.md$/,
  /ARCHITECTURE\.md$/,
  /^decisions\/.+\.md$/,
  /\.opencode\/rules\/.+\.md$/,
  /\.opencode\/skills\/.+\/SKILL\.md$/,
]

export const DocLinksPlugin: Plugin = async ({ client }) => ({
  "tool.execute.after": async (input) => {
    if (!["write", "edit", "multiedit"].includes(input.tool)) return

    const fp = input.args?.filePath || input.args?.path || ""
    if (!fp || !TARGET_FILES.some((p) => p.test(fp))) return

    const content = await Bun.file(fp).text().catch(() => "")
    if (!content) return

    const linkRegex = /\]\(([^)]+)\)/g
    const broken: string[] = []
    const sourceDir = fp.includes("/") ? fp.substring(0, fp.lastIndexOf("/")) : "."

    for (const match of content.matchAll(linkRegex)) {
      const link = match[1]
      if (link.startsWith("http://") || link.startsWith("https://")) continue
      if (link.startsWith("#") || link === "") continue

      const filePath = link.split("#")[0]
      if (!filePath) continue

      const resolved = filePath.startsWith("/")
        ? filePath.slice(1)
        : `${sourceDir}/${filePath}`

      const exists = await Bun.file(resolved)
        .text()
        .then(() => true)
        .catch(() => false)
      if (!exists) broken.push(`  ${fp} -> ${link}`)
    }

    if (broken.length === 0) return

    const sessionId = input.sessionID
    if (!sessionId) return

    await client.tui.showToast({
      body: {
        message: `doc-links: ${broken.length} 件の壊れたリンクを検出（${fp}）`,
        variant: "error",
      },
    })

    await client.session.prompt({
      path: { id: sessionId },
      body: {
        noReply: true,
        parts: [
          {
            type: "text",
            text:
              `${fp} に ${broken.length} 件の壊れたローカルリンクを検出しました。\n` +
              `壊れたリンク：\n${broken.join("\n")}\n\n` +
              `対応：リンクのターゲットパスを修正するか、不要なリンクを削除してください。`,
          },
        ],
      },
    })
  },
})
