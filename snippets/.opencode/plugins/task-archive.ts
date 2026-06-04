import type { Plugin } from "@opencode-ai/plugin"

/**
 * task-archive.ts
 *
 * 作業ディレクトリ（docs/working/<group>/）の自動アーカイブ提案。
 *
 * session.idle 検知時に：
 *   1. docs/tasks.json を読み group フィールドを持つタスクを確認
 *   2. docs/working/ と group フィールドの対応関係を特定
 *   3. 各作業ディレクトリに属する全タスクの passes が true なら提案
 *
 * 設計原則「Plugin は AI と対話する」に従い、提案は Toast + AI への prompt 通知。
 * アーカイブの実行は AI に委ねる（Plugin はファイル移動を行わない）。
 */

interface Task {
  id: string
  passes: boolean
  group?: string
}

interface ArchiveCandidate {
  dirName: string
  taskIds: string[]
}

async function readTasksJson(): Promise<Task[] | null> {
  const file = Bun.file("docs/tasks.json")
  const tasks = await file.json().catch(() => null)
  if (!tasks || !Array.isArray(tasks)) return null
  return tasks as Task[]
}

async function listWorkingDirs(): Promise<string[]> {
  const dir = Bun.dir("docs/working")
  if (!dir) return []

  const entries: string[] = []
  try {
    for await (const entry of new Bun.Glob("*").scan({ cwd: dir, onlyFiles: false })) {
      const fullPath = `${dir}/${entry}`
      const stat = await Bun.file(fullPath).stat().catch(() => null)
      if (stat && stat.isDirectory()) {
        entries.push(entry)
      }
    }
  } catch {
    return []
  }
  return entries
}

async function archiveDir(
  client: any,
  sessionId: string | undefined,
  candidate: ArchiveCandidate,
): Promise<void> {
  await client.tui.showToast({
    body: {
      message: `task-archive: ${candidate.dirName} の全タスクが完了（${candidate.taskIds.join(", ")}）`,
      variant: "info",
    },
  })

  await notifyAI(
    client,
    sessionId,
    `task-archive: docs/working/${candidate.dirName}/ に属する全タスク（${candidate.taskIds.join(", ")}）の passes が true です。` +
      `この作業ディレクトリは完了状態です。` +
      `以下の手順でアーカイブしてください：\n` +
      `1. docs/working/${candidate.dirName}/ の内容を docs/archive/${candidate.dirName}/ に移動\n` +
      `   移動先の構造：\n` +
      `   docs/archive/${candidate.dirName}/\n` +
      `     plan.md\n` +
      `     notes.md\n` +
      `     review-checklist.md\n` +
      `2. docs/working/${candidate.dirName}/ を削除\n` +
      `（archive/ は .gitignore に含まれるためコミットされません）`,
  )
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

export const TaskArchivePlugin: Plugin = async ({ client }) => ({
  "session.idle": async (input) => {
    const tasks = await readTasksJson()
    if (!tasks) return

    // group フィールドを持つタスクのみ対象
    const groupTasks = tasks.filter((f) => f.group)
    if (groupTasks.length === 0) return

    const workingDirs = await listWorkingDirs()
    if (workingDirs.length === 0) return

    // 各作業ディレクトリの全タスクが passes:true か確認
    const candidates: ArchiveCandidate[] = []

    for (const dirName of workingDirs) {
      const dirTasks = groupTasks.filter((f) => f.group === dirName)
      if (dirTasks.length === 0) continue

      const allPassed = dirTasks.every((f) => f.passes === true)
      if (allPassed) {
        candidates.push({
          dirName,
          taskIds: dirTasks.map((f) => f.id),
        })
      }
    }

    // アーカイブ提案がない場合は何もしない
    if (candidates.length === 0) return

    const sessionId = input?.sessionID

    for (const candidate of candidates) {
      await archiveDir(client, sessionId, candidate)
    }
  },
})
