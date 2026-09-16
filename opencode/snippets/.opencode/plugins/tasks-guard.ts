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

    // マーカーは内容が空でないときのみ有効とする。evaluator-tools は使用後に
    // ファイルを削除するが、空ファイルが残留してもガードが恒久無効化されないための防御。
    // （空書き込みで存在判定していた旧実装では、初回 PASS 以降ガードが死んでいた）
    const markerActive = await Bun.file(".opencode/.evaluator-updating")
      .text()
      .then((t) => t.trim().length > 0)
      .catch(() => false)
    if (markerActive) return

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
