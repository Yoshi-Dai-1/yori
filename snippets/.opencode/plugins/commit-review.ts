import type { Plugin } from "@opencode-ai/plugin"
import { join } from "path"

/**
 * commit-review.ts
 *
 * git commit 実行前にコードレビューとセキュリティ監査を自動実行する。
 * 子セッションで @code-reviewer（一般レビュー + CRITICAL security）と
 * @security-auditor（全severityセキュリティ監査）を並列実行し、
 * いずれかが問題を検出したらコミットをブロックする。
 *
 * 設計思想：
 * - AI の判断に依存せず、コードで強制する（dev-standards の中核原則）
 * - 子セッションを使用するためメインセッションのコンテキストを消費しない
 * - @code-reviewer の委譲（HIGH以下は @security-auditor）を解決する
 * - 問題なし = commit 通過、問題あり = Error() で commit ブロック + 結果を注入
 */

function isGitCommit(cmd: string): boolean {
  return /\bgit\s+commit\b/.test(cmd)
}

function hasIssues(text: string): boolean {
  if (/\[重要度:\s*(HIGH|MEDIUM|LOW)\]/.test(text)) return true
  if (/^\[(CRITICAL|HIGH|MEDIUM|LOW)\]\s/m.test(text)) return true
  return false
}

function stripFrontmatter(md: string): string {
  return md.replace(/^---[\s\S]*?---\n*/, "").trim()
}

async function readAgentPrompt(worktree: string, name: string): Promise<string | null> {
  try {
    const content = await Bun.file(join(worktree, ".opencode/agents", name)).text()
    return stripFrontmatter(content)
  } catch {
    return null
  }
}

async function runReviewInSession(
  client: any,
  parentSessionId: string,
  title: string,
  systemPrompt: string,
  userMessage: string,
): Promise<string | null> {
  let childSessionId: string
  try {
    const child = await client.session.create({
      body: { parentID: parentSessionId, title },
    })
    childSessionId = (child as any).data.id
  } catch {
    return null
  }

  try {
    const resp = await client.session.prompt({
      path: { id: childSessionId },
      body: {
        parts: [{ type: "text", text: userMessage }],
        system: systemPrompt,
      },
    })
    const parts = (resp as any).data?.parts || (resp as any).parts || []
    return parts
      .filter((p: any) => p.type === "text")
      .map((p: any) => p.text)
      .join("\n")
  } catch {
    return null
  }
}

function formatLabel(result: string | null, i: number): string | null {
  if (!result) return null
  const label = i === 0 ? "【コードレビュー】" : "【セキュリティ監査】"
  return `${label}\n${result}`
}

export const CommitReviewPlugin: Plugin = async ({ client, $, worktree }) => ({
  "tool.execute.before": async (input) => {
    if (input.tool !== "bash") return
    const cmd = input.args?.command || ""
    if (!isGitCommit(cmd)) return

    const sessionId = input.sessionID
    if (!sessionId) return

    // 1. ステージ済み差分を取得
    if (/^git\s+add\s+-A\s*&&\s*git\s+commit\b/.test(cmd)) {
      await $`git add -A`.nothrow().quiet()
    }
    const diffResult = await $`git diff --cached`.nothrow().quiet()
    const diff = (diffResult as any).text
    if (!diff || !diff.trim()) return

    // 2. 両方のプロンプトを並列読み込み
    const [reviewerMd, auditorMd] = await Promise.all([
      readAgentPrompt(worktree, "code-reviewer.md"),
      readAgentPrompt(worktree, "security-auditor.md"),
    ])
    if (!reviewerMd) return

    // 3. 両方のレビューを並列実行
    const diffBlock = `\`\`\`diff\n${diff}\n\`\`\``
    const reviewMessage = `以下の git diff のコードレビューを実施してください。\n\n${diffBlock}`
    const auditMessage = `監査モードで動作してください。以下の git diff のセキュリティ監査を実施してください。\n\n${diffBlock}`

    const [reviewResult, auditResult] = await Promise.all([
      runReviewInSession(client, sessionId, "commit-review-code", reviewerMd, reviewMessage),
      auditorMd
        ? runReviewInSession(client, sessionId, "commit-review-security", auditorMd, auditMessage)
        : Promise.resolve(null),
    ])

    // 4. 結果を結合
    const combined = [reviewResult, auditResult].filter(Boolean).join("\n\n")
    if (!combined.trim()) return

    const details = [reviewResult, auditResult]
      .map((r, i) => formatLabel(r, i))
      .filter(Boolean)
      .join("\n\n")

    // 5. ブロック or 通過
    if (hasIssues(combined)) {
      await client.session.prompt({
        path: { id: sessionId },
        body: {
          noReply: true,
          parts: [
            {
              type: "text",
              text: `[commit-review] レビューで問題を検出しました。以下を修正してから再度コミットしてください：\n\n${details}`,
            },
          ],
        },
      })

      await client.tui.showToast({
        body: {
          message: "commit-review: レビューで問題を検出しました",
          variant: "warning",
        },
      })

      throw new Error(
        "[commit-review] コードレビューまたはセキュリティ監査で問題が見つかりました。修正してから再度コミットしてください。",
      )
    }

    // 問題なし
    await client.session.prompt({
      path: { id: sessionId },
      body: {
        noReply: true,
        parts: [
          {
            type: "text",
            text: `[commit-review] 全てのレビュー完了：問題なし\n\n${details}`,
          },
        ],
      },
    })
  },
})
