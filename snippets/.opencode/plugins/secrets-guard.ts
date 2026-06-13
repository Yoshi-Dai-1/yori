import type { Plugin } from "@opencode-ai/plugin"
import secretPatterns from "../config/secret-patterns.json"

/**
 * secrets-guard.ts
 *
 * 機密ファイル・機密情報パターンの書き込みを防止する（severity: block）。
 * 脆弱性パターンは注意喚起のみ行う（severity: warn）。
 *
 * パターン定義は SSoT（.opencode/config/secret-patterns.json）に統合済み。
 * パターンを追加・変更する場合は JSON ファイルのみを編集すること。
 * pre-commit フックも同じ JSON から生成される（P1-1 修正）。
 * severity の区別：
 *   - block: 書き込みをブロック + git commit 禁止
 *   - warn:  注意喚起のみ（client.session.prompt で注入）
 */

interface ContentPattern {
  pattern: string
  label: string
  severity?: string
  advice?: string
}

interface SecretPatternsConfig {
  filePatterns: string[]
  contentPatterns: ContentPattern[]
}

const FILE_PATTERN_REGS: RegExp[] = (secretPatterns as SecretPatternsConfig).filePatterns.map(
  (p) => new RegExp(p),
)
const CONTENT_PATTERN_REGS: Array<{ pattern: RegExp; label: string; severity: string; advice: string }> = (
  secretPatterns as SecretPatternsConfig
).contentPatterns.map((c) => ({
  pattern: new RegExp(c.pattern),
  label: c.label,
  severity: c.severity || "block",
  advice: c.advice || "",
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
    const sessionId = (input as any).sessionID

    for (const { filePath: fp, content } of ops) {
      if (!fp) continue

      if (FILE_PATTERN_REGS.some((p) => p.test(fp))) {
        throw new Error(
          `Do not write secret files: ${fp}\n` +
            "Use .env.example for environment variable templates.",
        )
      }

      if (!content) continue
      for (const { pattern, label, severity, advice } of CONTENT_PATTERN_REGS) {
        if (pattern.test(content)) {
          if (severity === "block") {
            throw new Error(
              `Potential secret detected: ${label} in ${fp}\n` +
                `Remove the hardcoded secret and use environment variables or a secrets manager.\n` +
                `See .opencode/standards/principles/security-requirements.md`,
            )
          } else if (severity === "warn" && sessionId) {
            await client.session.prompt({
              path: { id: sessionId },
              body: {
                noReply: true,
                parts: [
                  {
                    type: "text",
                    text:
                      `[secrets-guard] Warning: potential vulnerability pattern detected — ${label} in ${fp}\n` +
                      (advice ? `${advice}\n` : "") +
                      `この警告は自動検出によるもので、コンテキストによっては該当しない場合があります。意図したコードであれば無視してください。`,
                  },
                ],
              },
            })
          }
        }
      }
    }
  },
})
