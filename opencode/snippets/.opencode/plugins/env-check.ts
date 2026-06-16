import type { Plugin } from "@opencode-ai/plugin"

let venvChecked = false
let venvExists = false

export const EnvCheckPlugin: Plugin = async ({ client, $ }) => ({
  "tool.execute.before": async (input, output) => {
    if (input.tool !== "bash") return

    const command = output.args.command as string
    if (!command) return
    if (/\.venv\/bin\//.test(command)) return
    const sessionId = (input as any).sessionID

    // ── Python 環境チェック ────────────────────────────────
    const isPythonCommand = /\b(python3?|pip3?)\b/.test(command)
    if (isPythonCommand) {
      if (!venvChecked) {
        const result = await $`test -f .venv/bin/python3`.nothrow().quiet()
        venvExists = result.exitCode === 0
        venvChecked = true
      }

      if (!venvExists && /\bpip3?\s+install\b/.test(command)) {
        throw new Error(
          "[env-check] Python 仮想環境 (.venv/) が存在しません\n" +
          "対応: python3 -m venv .venv を実行してから依存を追加してください",
        )
      }

      if (venvExists) {
        let modified = command.replace(
          /\b(python3|python|pip3|pip)\b(?!\.\d)/g,
          (match, _, offset) => {
            const prefix = command.substring(Math.max(0, offset - 12), offset)
            if (/\s+-m\s+$/.test(prefix)) return match
            return `.venv/bin/${match}`
          },
        )
        if (modified !== command) {
          output.args.command = modified
        }
      }
    }

    // ── Node.js 環境チェック ──────────────────────────────
    const isNodeInstall = /\b(npm|pnpm)\s+(install|add)\b/.test(command)
    if (isNodeInstall && sessionId) {
      const nvmrcResult = await $`test -f .nvmrc`.nothrow().quiet()
      if (nvmrcResult.exitCode === 0) {
        const nodeVer = (await $`node --version 2>/dev/null`.nothrow().quiet()).text.trim()
        const nvmrcVer = (await $`cat .nvmrc`.nothrow().quiet()).text.trim().replace(/^v/, "")
        const currentMajor = nodeVer.replace(/^v/, "").split(".")[0]
        if (!nvmrcVer.startsWith(currentMajor)) {
          await client.session.prompt({
            path: { id: sessionId },
            body: {
              noReply: true,
              parts: [{
                type: "text",
                text:
                  `[env-check] Warning: Node.js version mismatch\n` +
                  `.nvmrc expects Node.js ${nvmrcVer} but current is ${nodeVer}\n` +
                  `Run \`nvm use\` or update .nvmrc if intentional.`,
              }],
            },
          })
        }
      }
    }
  },
})
