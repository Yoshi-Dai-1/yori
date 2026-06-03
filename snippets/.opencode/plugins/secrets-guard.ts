import type { Plugin } from "@opencode-ai/plugin"
import secretPatterns from "../config/secret-patterns.json"

/**
 * secrets-guard.ts
 *
 * 機密ファイル・機密情報パターンの書き込みを防止する。
 *
 * パターン定義は SSoT（.opencode/config/secret-patterns.json）に統合済み。
 * パターンを追加・変更する場合は JSON ファイルのみを編集すること。
 * pre-commit フックも同じ JSON から生成される（P1-1 修正）。
 */

interface ContentPattern {
  pattern: string
  label: string
}

interface SecretPatternsConfig {
  filePatterns: string[]
  contentPatterns: ContentPattern[]
}

const FILE_PATTERN_REGS: RegExp[] = (secretPatterns as SecretPatternsConfig).filePatterns.map(
  (p) => new RegExp(p),
)
const CONTENT_PATTERN_REGS: Array<{ pattern: RegExp; label: string }> = (
  secretPatterns as SecretPatternsConfig
).contentPatterns.map((c) => ({
  pattern: new RegExp(c.pattern),
  label: c.label,
}))

function extractOps(
  tool: string,
  args: Record<string, any>,
): Array<{ filePath: string; content: string }> {
  if (tool === "multiedit") {
    return (args.operations || []).map((op: any) => ({
      filePath: op.filePath || op.path || "",
      content: op.content || op.newString || "",
    }))
  }
  return [
    {
      filePath: args.filePath || "",
      content:
        tool === "write" ? args.content || "" : args.newString || args.content || "",
    },
  ]
}

export const SecretsGuardPlugin: Plugin = async ({ client }) => ({
  "tool.execute.before": async (input, output) => {
    if (!["write", "edit", "multiedit"].includes(input.tool)) return

    const ops = extractOps(input.tool, output.args)

    for (const { filePath: fp, content } of ops) {
      if (!fp) continue

      if (FILE_PATTERN_REGS.some((p) => p.test(fp))) {
        throw new Error(
          `Do not write secret files: ${fp}\n` +
            "Use .env.example for environment variable templates.",
        )
      }

      if (!content) continue
      for (const { pattern, label } of CONTENT_PATTERN_REGS) {
        if (pattern.test(content)) {
          await client.app.log({
            body: {
              service: "secrets-guard",
              level: "warn",
              message: `Potential secret pattern detected: ${label} in ${fp}`,
            },
          })
        }
      }
    }
  },
})
