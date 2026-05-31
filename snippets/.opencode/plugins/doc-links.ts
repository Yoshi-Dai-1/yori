import type { Plugin } from "@opencode-ai/plugin"

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

    if (broken.length > 0) {
      await client.app.log({
        body: {
          service: "doc-links",
          level: "warn",
          message: `Broken documentation links:\n${broken.join("\n")}`,
        },
      })
    }
  },
})
