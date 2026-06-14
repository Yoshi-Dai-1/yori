import type { Plugin } from "@opencode-ai/plugin"

interface SprintTask {
  id: string
  passes: boolean
}

function getNewContent(tool: string, args: Record<string, any>, existingContent: string): string | null {
  if (tool === "write") {
    return args.content || null
  }
  if (tool === "edit") {
    const newStr = args.newString || ""
    const oldStr = args.oldString || ""
    if (!newStr && !oldStr) return null
    if (newStr.includes("passes")) return existingContent.replace(oldStr, newStr)
    return null
  }
  if (tool === "multiedit") {
    const ops = args.operations || []
    const op = ops.find((o: any) => (o.filePath || o.path || "").includes("tasks.json"))
    if (!op) return null
    return op.content || op.newString || null
  }
  return null
}

export const TasksGuardPlugin: Plugin = async () => ({
  "tool.execute.before": async (input, output) => {
    if (!["write", "edit", "multiedit"].includes(input.tool)) return

    const fp = output.args.filePath || output.args.path || ""
    if (!fp.includes("tasks.json")) return

    const markerExists = await Bun.file(".opencode/.evaluator-updating")
      .text()
      .then(() => true)
      .catch(() => false)
    if (markerExists) return

    const existingContent = await Bun.file(fp)
      .text()
      .catch(() => null)
    if (!existingContent) return

    const newContent = getNewContent(input.tool, output.args, existingContent)
    if (!newContent) return

    let existingTasks: SprintTask[]
    let newTasks: SprintTask[]
    try {
      existingTasks = JSON.parse(existingContent).map(
        (f: SprintTask) => ({ id: f.id, passes: f.passes })
      )
      newTasks = JSON.parse(newContent).map(
        (f: SprintTask) => ({ id: f.id, passes: f.passes })
      )
    } catch {
      throw new Error("tasks.json: invalid JSON format")
    }

    const changed = newTasks.filter(
      (n) => existingTasks.find((e) => e.id === n.id)?.passes !== n.passes
    )

    if (changed.length > 0) {
      throw new Error(
        "tasks.json: passes field modification detected\n" +
        "Only @evaluator can update passes. Call @evaluator for QA evaluation.\n" +
        `Changed: ${JSON.stringify(changed)}`
      )
    }
  },
})
