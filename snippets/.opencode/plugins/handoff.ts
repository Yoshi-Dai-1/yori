import type { Plugin } from "@opencode-ai/plugin"

export const HandoffPlugin: Plugin = async ({ $ }) => ({
  "session.deleted": async () => {
    const now = new Date()
    const datetimeStr = now.toISOString().replace("T", " ").substring(0, 16)

    const handoffPath = ".opencode/handoff-artifact.md"

    const gitResult = await $`git status --porcelain`.nothrow().quiet()
    const isGitRepo = gitResult.exitCode === 0
    const gitDisplay = isGitRepo
      ? (gitResult.text.trim()
        ? gitResult.text.trim().split("\n").map(l => l.substring(3)).join("\n")
        : "（変更なし）")
      : "（git管理外）"

    await Bun.write(
      handoffPath,
      [
        "# Handoff Artifact",
        `# 更新日時: ${datetimeStr}`,
        "# このファイルは次のセッション開始時にコンテキストとして渡す",
        "# 内容が空欄の場合は次のセッション開始時に handoff スキルを使って内容を記入する",
        "",
        "## 前のセッションの状態",
        "",
        "取り組んでいた機能:",
        "完了した部分:",
        "途中で止まっている部分:",
        "次にやるべきこと:",
        "",
        "## 重要な決定事項",
        "",
        "",
        "## 未解決の問題",
        "",
        "",
        "## 変更したファイル",
        "",
        gitDisplay,
        "",
      ].join("\n")
    )
  },
})
