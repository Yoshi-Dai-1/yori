import type { Plugin } from "@opencode-ai/plugin"
import { tool } from "@opencode-ai/plugin"

interface SprintTask {
  id: string
  sprint: number
  passes: boolean
}

/**
 * evaluator-tools.ts
 *
 * @evaluator が呼び出すカスタムツール群。
 *
 * - evaluator-passed: マーカー作成 → tasks.json passes 更新 → マーカー削除
 * - evaluator-failed: .evaluator-failed マーカーを作成
 *
 * tasks-guard.ts が passes 変更をブロックするため、
 * evaluator-passed はマーカーを作成してから tasks.json を更新する。
 */
export const EvalToolsPlugin: Plugin = async () => ({
  tool: {
    "evaluator-passed": tool({
      description:
        "@evaluator PASS 時に呼び出す。.evaluator-updating マーカーを作成し、" +
        "tasks.json の該当スプリント passes を true に更新し、マーカーを削除する。",
      args: {
        sprint: tool.schema.number().describe("今回評価したスプリント番号"),
      },
      async execute(args) {
        const markerPath = ".opencode/.evaluator-updating"
        const tasksPath = "docs/tasks.json"

        // 1. マーカー作成（tasks-guard.ts バイパス用）
        await Bun.write(markerPath, "passes-update in progress")

        // 2. tasks.json 読み込み
        const tasksText = await Bun.file(tasksPath).text()
        let tasks: SprintTask[]
        try {
          tasks = JSON.parse(tasksText)
        } catch {
          await Bun.write(markerPath, "")
          throw new Error("tasks.json: invalid JSON format")
        }

        // 3. 該当スプリントの passes を true に
        const updated = tasks.map((f) => {
          if (f.sprint === args.sprint && !f.passes) {
            return { ...f, passes: true }
          }
          return f
        })

        // 4. tasks.json 書き込み
        await Bun.write(tasksPath, JSON.stringify(updated, null, 2))

        // 5. マーカー削除
        await Bun.write(markerPath, "")

        return `PASS 結果を tasks.json に反映しました（sprint ${args.sprint}）`
      },
    }),

    "evaluator-failed": tool({
      description:
        "@evaluator FAIL 時に呼び出す。.evaluator-failed マーカーを作成する。",
      args: {},
      async execute() {
        await Bun.write(".opencode/.evaluator-failed", "evaluator FAIL")
        return "FAIL マーカーを作成しました"
      },
    }),
  },
})
