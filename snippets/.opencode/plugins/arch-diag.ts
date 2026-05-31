import type { Plugin } from "@opencode-ai/plugin"

const TECH_SECTION_PATTERNS = [
  /^##\s+技術スタック/m,
  /^##\s+Tech Stack/m,
  /^##\s+採用アーキテクチャ/m,
  /^##\s+Architecture/m,
  /^\|\s*(フレームウェア|Framework|言語|Language|Database|Storage|Cache)\s+\|/m,
  /^#\s+技術スタック/m,
]

export const ArchDiagPlugin: Plugin = async ({ client }) => ({
  "tool.execute.after": async (input) => {
    if (!["write", "edit", "multiedit"].includes(input.tool)) return

    const fp = input.args?.filePath || input.args?.path || ""
    if (!fp.includes("ARCHITECTURE.md")) return

    const content = await Bun.file(fp).text().catch(() => "")
    if (!content) return

    const hasTechContent = TECH_SECTION_PATTERNS.some((p) => p.test(content))
    if (!hasTechContent) return

    await client.app.log({
      body: {
        service: "arch-diag",
        level: "info",
        message:
          "ARCHITECTURE.md tech stack section changed.\n" +
          "Consider running find-skills to discover relevant external skills.",
      },
    })
  },
})
