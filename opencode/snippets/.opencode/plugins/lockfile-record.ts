import type { Plugin } from "@opencode-ai/plugin"

const LOCKFILE = ".opencode/config/skills.lock.yaml"

function sanitizeYamlKey(s: string): string {
  return s.replace(/[^a-zA-Z0-9._@/-]/g, "_")
}

function esc(s: string): string {
  return s.replace(/"/g, '\\"')
}

function extractName(pkgRef: string): string {
  const cleaned = pkgRef.replace(/^["']|["']$/g, "")
  const atIdx = cleaned.lastIndexOf("@")
  if (atIdx > 0) {
    const afterAt = cleaned.slice(atIdx + 1)
    if (afterAt.includes("/")) return afterAt.split("/").pop() || afterAt
    return afterAt
  }
  return cleaned.split("/").pop() || cleaned
}

function nameFromPath(path: string): string | null {
  const m = path.match(/\.opencode\/skills\/([^/\s/]+?)(?:\/|$)/)
  return m ? m[1] : null
}

function detect(
  command: string,
): { name: string; command: string } | null {
  const trimmed = command.trim()

  // npx skills add <pkg>  (フラグ -y などが npx と skills の間に入るケースも対応)
  const npx = trimmed.match(/npx(?:\s+-[a-zA-Z]+)*\s+skills\s+add\s+(\S+)/)
  if (npx) {
    const name = extractName(npx[1])
    return { name: sanitizeYamlKey(name), command }
  }

  // git clone <url> [dest] where dest references .opencode/skills/<name>
  if (/^git\s+clone\s/.test(trimmed)) {
    const n = nameFromPath(trimmed)
    if (n) return { name: sanitizeYamlKey(n), command }
  }

  // git submodule add <url> [path] where path references .opencode/skills/<name>
  if (/^git\s+submodule\s+add\s/.test(trimmed)) {
    const n = nameFromPath(trimmed)
    if (n) return { name: sanitizeYamlKey(n), command }
  }

  // cp -r <src> <dest> where dest (last arg) contains .opencode/skills/<name>
  if (/^cp\s+-r\s/.test(trimmed)) {
    const parts = trimmed.split(/\s+/)
    const lastArg = parts[parts.length - 1]
    const n = nameFromPath(lastArg)
    if (n) return { name: sanitizeYamlKey(n), command }
  }

  // bash .../_install.sh where path contains .opencode/skills/<name>
  const installMatch = trimmed.match(
    /bash\s+\S*\.opencode\/skills\/([^/\s/]+?)\/_install\.sh/,
  )
  if (installMatch) {
    return { name: sanitizeYamlKey(installMatch[1]), command }
  }

  return null
}

export const LockfileRecordPlugin: Plugin = async ({ $, client }) => ({
  "tool.execute.after": async (input, output) => {
    if (input.tool !== "bash") return
    const command = (input.args?.command || "") as string
    const exitCode = (output as any)?.exitCode ?? 0
    if (exitCode !== 0) return

    const detected = detect(command)
    if (!detected) return

    const { name, command: fullCmd } = detected
    const today = new Date().toISOString().split("T")[0]

    // Dedup: skip if already in lock file
    const exists =
      await $`grep -q "^  ${name}:" ${LOCKFILE}`.nothrow().quiet()
    if (exists.exitCode === 0) return

    // Append entry under external_skills
    const appendResult = await $`
      printf '  %s:\n    source: "%s"\n    recorded_at: %s\n' \
        ${name} ${esc(fullCmd)} ${today} >> ${LOCKFILE}
    `.nothrow().quiet()

    if (appendResult.exitCode !== 0) {
      await client.app.log({
        body: {
          service: "lockfile-record",
          level: "error",
          message: `failed to append ${name} to ${LOCKFILE}`,
        },
      })
    }
  },
})
