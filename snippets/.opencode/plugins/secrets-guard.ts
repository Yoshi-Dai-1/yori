import type { Plugin } from "@opencode-ai/plugin"

const SECRET_FILE_PATTERNS = [
  /\.env\.local$/,
  /\.env\..+\.local$/,
  /credentials\.json$/,
  /service-account.*\.json$/,
  /\.pem$/,
  /\.key$/,
  /\.p12$/,
  /id_rsa$/,
  /id_ed25519$/,
]

const SECRET_CONTENT_PATTERNS: Array<{ pattern: RegExp; label: string }> = [
  { pattern: /API_KEY\s*=\s*.+/m, label: "API_KEY" },
  { pattern: /SECRET\s*=\s*.+/m, label: "SECRET" },
  { pattern: /PASSWORD\s*=\s*.+/m, label: "PASSWORD" },
  { pattern: /-----BEGIN.*PRIVATE KEY-----/m, label: "PRIVATE KEY" },
  { pattern: /ghp_[a-zA-Z0-9]{36}/, label: "GitHub PAT" },
  { pattern: /sk-[a-zA-Z0-9]{20,}/, label: "OpenAI Key" },
  { pattern: /AKIA[0-9A-Z]{16}/, label: "AWS Access Key" },
]

function extractOps(tool: string, args: Record<string, any>): Array<{ filePath: string; content: string }> {
  if (tool === "multiedit") {
    return (args.operations || []).map((op: any) => ({
      filePath: op.filePath || op.path || "",
      content: op.content || op.newString || "",
    }))
  }
  return [{
    filePath: args.filePath || "",
    content: tool === "write" ? (args.content || "") : ((args.newString || args.content) || ""),
  }]
}

export const SecretsGuardPlugin: Plugin = async ({ client }) => ({
  "tool.execute.before": async (input, output) => {
    if (!["write", "edit", "multiedit"].includes(input.tool)) return

    const ops = extractOps(input.tool, output.args)

    for (const { filePath: fp, content } of ops) {
      if (!fp) continue

      if (SECRET_FILE_PATTERNS.some((p) => p.test(fp))) {
        throw new Error(
          `Do not write secret files: ${fp}\n` +
          "Use .env.example for environment variable templates."
        )
      }

      if (!content) continue
      for (const { pattern, label } of SECRET_CONTENT_PATTERNS) {
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
