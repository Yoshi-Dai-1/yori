import type { Plugin } from "@opencode-ai/plugin"

export const SkillTrackerPlugin: Plugin = async ({ $, client }) => ({
  "tool.execute.after": async (input) => {
    if (input.tool !== "Skill") return

    const name = (input.args?.skillName || input.args?.name || "unknown")
      .replace(/\n/g, " ")
      .trim()
    if (!name) return

    const date = new Date().toISOString().split("T")[0]

    const mkdirResult = await $`mkdir -p .opencode/usage`.nothrow()
    if (mkdirResult.exitCode !== 0) {
      await client.app.log({
        body: { service: "skill-tracker", level: "error", message: "mkdir failed for .opencode/usage" },
      })
      return
    }

    const writeResult = await $`printf -- "- %s: %s\n" ${date} ${name} >> .opencode/usage/skill-usage.md`.nothrow()
    if (writeResult.exitCode !== 0) {
      await client.app.log({
        body: { service: "skill-tracker", level: "error", message: "failed to write skill-usage.md" },
      })
    }
  },
})
