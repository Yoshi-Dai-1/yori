import type { Plugin } from "@opencode-ai/plugin"
import { tool } from "@opencode-ai/plugin"
import { rm } from "node:fs/promises"

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
        "スプリント完了QAで PASS 確定したときのみ呼び出す。" +
        "Sprint Contract レビューの承認では呼び出さない（tasks.json 不変）。" +
        "`.evaluator-updating` マーカーを作成し、`docs/tasks.json` の該当スプリント passes を true に更新し、マーカーを削除する。",
      args: {
        sprint: tool.schema.number().describe("今回評価したスプリント番号"),
      },
      async execute(args) {
        const markerPath = ".opencode/.evaluator-updating"
        const tasksPath = "docs/tasks.json"

        // 1. マーカー作成（tasks-guard.ts バイパス用。内容が空でないことが有効条件）
        await Bun.write(markerPath, "passes-update in progress")

        try {
          // 2. tasks.json 読み込み
          const tasksText = await Bun.file(tasksPath).text()
          let tasks: SprintTask[]
          try {
            tasks = JSON.parse(tasksText)
          } catch {
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

          return `PASS 結果を \`docs/tasks.json\` に反映しました（sprint ${args.sprint}）`
        } finally {
          // 5. マーカー削除（空書き込みではなく削除する。例外時も確実に削除しガードを復帰）
          await rm(markerPath, { force: true }).catch(() => {})
        }
      },
    }),

    "evaluator-failed": tool({
      description:
        "@evaluator FAIL 時に呼び出す。`.evaluator-failed` マーカーを作成する。",
      args: {},
      async execute() {
        await Bun.write(".opencode/.evaluator-failed", "evaluator FAIL")
        return "FAIL マーカーを作成しました"
      },
    }),
  },
})
