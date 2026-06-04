import type { Plugin } from "@opencode-ai/plugin"

/**
 * harness-health.ts
 *
 * Context Anxiety の兆候を機械的に検知する。
 *
 * 設計判断（2026-06 修正履歴）：
 * - v1「直近 N 時間の編集回数」案 → ユーザー指摘により不採用
 * - v2「セッション内編集回数」案（global pool）→ 撤回
 *   - 並列セッションやサブエージェントで誤検知が起きる
 *   - サブエージェントの暴走が親セッションの閾値発火につながる
 * - v3「per-session sliding window + TTL cleanup」案 → 採用
 *   - セッション毎に独立した sliding window を持つ
 *   - セッション終了検知は不要、TTL（30分）で自動クリーンアップ
 *   - サブエージェントは独立 sessionID を持つと推定（未検証）
 *     → .design-notes/subagent-session.md 参照
 *   - 最悪ケース（subagent が親と sessionID 共有）でも現状と同じ
 *
 * 検知する3つのシグナル：
 *   1. 編集頻度の閾値超過（セッション単位、直近 EDIT_VOLUME_WINDOW_MS 内に EDIT_VOLUME_THRESHOLD 件）
 *   2. 同一ファイルの連続編集（セッション単位、直近 LOOP_WINDOW_MS 内に LOOP_THRESHOLD 件）
 *   3. tasks.json の pass 率が 50% 未満（session.idle 時、project-wide）
 *
 * 設計原則「Plugin は AI と対話する」に従い、警告は Toast + AI への prompt 通知を行う。
 * ただし通知は「トリガー時点の事実」のみ。AI に判断を委ねない。
 */

interface EditEvent {
  fp: string
  timestamp: number
}

interface SessionStats {
  edits: EditEvent[]
  lastActivity: number
}

// セッション毎の sliding window を保持
// サブエージェントや並列セッションを分離して追跡
const sessionStats = new Map<string, SessionStats>()

// 閾値設定
const EDIT_VOLUME_WINDOW_MS = 10 * 60 * 1000  // 10分
const EDIT_VOLUME_THRESHOLD = 20  // 10分で 20 回
const LOOP_WINDOW_MS = 5 * 60 * 1000  // 5分
const LOOP_THRESHOLD = 3  // 同一ファイルを5分以内に3回編集
const PASS_RATE_THRESHOLD = 0.5
const MIN_TASKS_FOR_ALERT = 5
const SESSION_TTL_MS = 30 * 60 * 1000  // 30分無操作で stale 判定

function getOrCreateStats(sessionId: string): SessionStats {
  let stats = sessionStats.get(sessionId)
  if (!stats) {
    stats = { edits: [], lastActivity: 0 }
    sessionStats.set(sessionId, stats)
  }
  return stats
}

function pruneSessionEdits(stats: SessionStats, now: number): void {
  stats.lastActivity = now
  while (stats.edits.length > 0 && now - stats.edits[0].timestamp > EDIT_VOLUME_WINDOW_MS) {
    stats.edits.shift()
  }
}

function pruneStaleSessions(now: number): void {
  for (const [id, stats] of sessionStats) {
    if (now - stats.lastActivity > SESSION_TTL_MS) {
      sessionStats.delete(id)
    }
  }
}

async function notifyAI(
  client: any,
  sessionId: string | undefined,
  message: string,
): Promise<void> {
  if (!sessionId) return
  await client.session.prompt({
    path: { id: sessionId },
    body: {
      noReply: true,
      parts: [{ type: "text", text: message }],
    },
  })
}

async function checkTasksPassRate(): Promise<{
  total: number
  passed: number
  rate: number
} | null> {
  const file = Bun.file("docs/tasks.json")
  const tasks = await file.json().catch(() => null)
  if (!tasks || !Array.isArray(tasks)) return null

  const total = tasks.length
  const passed = tasks.filter((f: any) => f.passes === true).length
  return { total, passed, rate: total > 0 ? passed / total : 0 }
}

export const HarnessHealthPlugin: Plugin = async ({ client }) => {
  return {
    "tool.execute.after": async (input) => {
      if (!["write", "edit", "multiedit"].includes(input.tool)) return

      const fp: string = input.args?.filePath || input.args?.path || ""
      if (!fp) return

      const sessionId = input.sessionID
      if (!sessionId) return  // sessionID 不明ならスキップ（既存 Plugin と統一）

      const now = Date.now()
      const stats = getOrCreateStats(sessionId)
      pruneSessionEdits(stats, now)
      pruneStaleSessions(now)  // 古いセッションを掃除（メモリリーク防止）
      stats.edits.push({ fp, timestamp: now })

      // シグナル1：編集頻度の閾値超過（セッション単位）
      if (stats.edits.length === EDIT_VOLUME_THRESHOLD) {
        const windowMin = EDIT_VOLUME_WINDOW_MS / 60000
        await client.tui.showToast({
          body: {
            message: `harness-health: 直近 ${windowMin} 分で ${stats.edits.length} 回編集（暴走の可能性）`,
            variant: "warning",
          },
        })
        await notifyAI(
          client,
          sessionId,
          `harness-health: 直近 ${windowMin} 分間で ${stats.edits.length} 回の編集を検知。` +
            `閾値 ${EDIT_VOLUME_THRESHOLD}/${windowMin}分 に達しました。` +
            `編集ペースが異常に高いため、Context Reset を強く推奨します。` +
            `（「今日はここまで」と伝える、または `.opencode/handoff-artifact.md` を生成して新規セッションを開始）`,
        )
      }

      // シグナル2：同一ファイルの連続編集（セッション単位）
      // セッション単位なので、親セッションの編集がサブエージェントの
      // 同一ファイル検知を巻き込むことはない
      const sameFileRecent = stats.edits.filter(
        (e) => e.fp === fp && now - e.timestamp < LOOP_WINDOW_MS,
      )
      if (sameFileRecent.length === LOOP_THRESHOLD) {
        const loopMin = LOOP_WINDOW_MS / 60000
        await client.tui.showToast({
          body: {
            message: `harness-health: ${fp} を ${loopMin} 分以内に ${LOOP_THRESHOLD} 回編集（ループ検知）`,
            variant: "warning",
          },
        })
        await notifyAI(
          client,
          sessionId,
          `harness-health: ${fp} を ${loopMin} 分以内に ${LOOP_THRESHOLD} 回編集しました。` +
            `これは「自己修正ループ」の兆候です。` +
            `考えられる原因：\n` +
            `1. 問題の本質が把握できていない（同じ修正を繰り返し適用）\n` +
            `2. テストが不足している（修正の正しさを検証できない）\n` +
            `3. 設計自体に問題がある（構造的問題で局所修正が効かない）\n` +
            `推奨：作業を停止し、根本原因を再分析してください。`,
        )
      }
    },

    "session.idle": async (input) => {
      const result = await checkTasksPassRate()
      if (!result) return
      if (result.total < MIN_TASKS_FOR_ALERT) return
      if (result.rate >= PASS_RATE_THRESHOLD) return

      const passRate = (result.rate * 100).toFixed(0)
      const sessionId = input?.sessionID

      await client.tui.showToast({
        body: {
          message: `harness-health: pass 率 ${passRate}%（${result.passed}/${result.total}）`,
          variant: "warning",
        },
      })

      await notifyAI(
        client,
        sessionId,
        `harness-health: tasks.json の pass 率は ${passRate}%（${result.passed}/${result.total}）です。` +
          `閾値 ${PASS_RATE_THRESHOLD * 100}% を下回っています。` +
          `未完了のタスクを見直してください。`,
      )
    },
  }
}
