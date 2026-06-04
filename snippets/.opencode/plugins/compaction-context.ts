import type { Plugin } from "@opencode-ai/plugin"

/**
 * compaction-context.ts
 *
 * コンパクション時に docs/working/ の状態を注入する。
 * 公式ドキュメントの experimental.session.compacting パターン準拠。
 *
 * コンパクション後も作業ディレクトリの文脈を維持し、
 * 記憶喪失によるルール逸脱を防ぐ。
 */

interface Task {
  id: string
  passes: boolean
  group?: string
}

async function readTasksJson(): Promise<Task[] | null> {
  const file = Bun.file("docs/tasks.json")
  const tasks = await file.json().catch(() => null)
  if (!tasks || !Array.isArray(tasks)) return null
  return tasks as Task[]
}

async function scanWorkingDirs(): Promise<
  Array<{ name: string; tasks: string[]; passes: boolean[] }>
> {
  const results: Array<{ name: string; tasks: string[]; passes: boolean[] }> = []

  try {
    const dir = Bun.dir("docs/working")
    if (!dir) return results

    const tasks = await readTasksJson()

    for await (const entry of new Bun.Glob("*").scan({ cwd: dir, onlyFiles: false })) {
      const fullPath = `${dir}/${entry}`
      const stat = await Bun.file(fullPath).stat().catch(() => null)
      if (!stat || !stat.isDirectory()) continue

      const planFile = Bun.file(`${fullPath}/plan.md`)
      const planContent = await planFile.text().catch(() => null)
      const planTitle = planContent?.split("\n")[0]?.replace(/^#+\s*/, "") || entry

      const dirTasks = tasks?.filter((f) => f.group === entry) || []

      results.push({
        name: entry,
        tasks: dirTasks.map((f) => `${f.id}(${f.passes ? "PASS" : "pending"})`),
        passes: dirTasks.map((f) => f.passes),
      })
    }
  } catch {
    // docs/working/ 不存在は正常（未使用プロジェクト）
  }

  return results
}

export const CompactionContextPlugin: Plugin = async () => ({
  "experimental.session.compacting": async (_input, output) => {
    const workingDirs = await scanWorkingDirs()
    if (workingDirs.length === 0) return

    let context = "## Working Directory State\n\n"

    for (const dir of workingDirs) {
      const allPassed = dir.passes.length > 0 && dir.passes.every((p) => p)
      const status = allPassed ? "COMPLETED" : "IN PROGRESS"
      context += `### docs/working/${dir.name}/ — ${status}\n`
      if (dir.tasks.length > 0) {
        context += `Tasks: ${dir.tasks.join(", ")}\n`
      }
    }

    context += "\n作業ディレクトリの詳細は docs/working/<id>/plan.md を参照してください。\n"
    context += "完了条件：全タスクの passes が true（@evaluator のみが更新可能）\n"
    context += "アーカイブ：task-archive.ts が session.idle で提案"

    output.context.push(context)
  },
})
