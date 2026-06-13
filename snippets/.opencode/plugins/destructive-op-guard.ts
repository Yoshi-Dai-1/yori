import type { Plugin } from "@opencode-ai/plugin"

/**
 * destructive-op-guard.ts
 *
 * tool.execute.before で破壊的Git操作・ファイル削除をブロックする。
 * AGENTS.md の Safety Rules をコードで強制するガードレール。
 * 明示的に依頼された場合（人間の許可）はバイパスするため、完全ブロックではなくヒューマンインザループ。
 *
 * 設計意図：Safety Rules の完全実装ではなく、復元が困難な操作のみをブロックする。
 * - ブロック対象：reset --hard, rebase, push --force, rm -rf 等（復元困難 or 履歴破壊）
 * - ブロックしない：通常 push, commit, add, 単一ファイル削除（復元可能・AI 自発遵守に委ねる）
 *   commit は commit-review.ts が別途レビュー強制、push --force 以外の push は正常操作。
 *   単一ファイル削除は誤検知リスク（正常なリファクタリング・リネーム）を回避するため。
 */

const DESTRUCTIVE_PATTERNS = [
  // Git 破壊的操作
  /^git\s+reset\s+--hard/i,
  /^git\s+rebase\s+/i,
  /^git\s+push\s+--force/i,
  /^git\s+push\s+--force-with-lease/i,
  /^git\s+branch\s+(-[dD]|--delete)\s+/i,
  /^git\s+clean\s+-[fd]/i,
  // ファイル削除・強制削除
  /^rm\s+-rf\s+/,
  /^rm\s+-r\s+/,
  // コミット強制スキップ
  /--no-verify/,
]

export const DestructiveOpGuardPlugin: Plugin = async () => ({
  "tool.execute.before": async (input, output) => {
    if (input.tool !== "bash") return

    const cmd = (output.args?.command || "").trim()

    // 読み取り専用 git コマンドは許可
    if (/^git\s+(status|log|diff|show|branch\s*$|checkout\s+-?[bB]\s+)/.test(cmd)) return
    // 安全な git 操作も許可（--no-verify はブロック対象）
    if (/^git\s+(add|commit|stash|fetch|pull|merge|tag)/.test(cmd) && !/--no-verify/.test(cmd)) return

    for (const pattern of DESTRUCTIVE_PATTERNS) {
      if (pattern.test(cmd)) {
        throw new Error(
          `[destructive-op-guard] 破壊的操作を検出しました: "${cmd}"\n` +
            `この操作は AGENTS.md Safety Rules により制限されています。\n` +
            `実行する必要がある場合は、人間に以下のコマンドを確認してから再実行してください。`,
        )
      }
    }
  },
})
