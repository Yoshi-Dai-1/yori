import type { Plugin } from "@opencode-ai/plugin"

const exists = async ($: any, cmd: string) => {
  const name = cmd.split(/\s+/)[0]
  const r = await $`which ${name}`.nothrow().quiet()
  return r.exitCode === 0
}

async function typecheck($: any, cmd: string, tracker?: { n: number }): Promise<string | null> {
  if (!(await exists($, cmd.split(/\s+/)[0]))) return null
  if (tracker) tracker.n++
  const r = await $`${cmd}`.nothrow().quiet()
  return r.exitCode === 0 ? null : r.text.substring(0, 4000)
}

async function lintFile($: any, cmd: string, fp: string, tracker?: { n: number }): Promise<string | null> {
  if (!(await exists($, cmd.split(/\s+/)[0]))) return null
  if (tracker) tracker.n++
  const r = await $`${cmd} ${fp}`.nothrow().quiet()
  return r.exitCode === 0 ? null : r.text.substring(0, 4000)
}

async function formatFile($: any, cmd: string, fp: string, tracker?: { n: number }): Promise<string | null> {
  if (!(await exists($, cmd.split(/\s+/)[0]))) return null
  if (tracker) tracker.n++
  const r = await $`${cmd} ${fp}`.nothrow().quiet()
  return r.exitCode === 0 ? null : r.text.substring(0, 2000)
}

export const LintAndTypecheckPlugin: Plugin = async ({ $, client }) => {
  return {
    "tool.execute.after": async (input) => {
      if (!["write", "edit", "multiedit"].includes(input.tool)) return

      const fp = input.args?.filePath || input.args?.path || ""
      if (!fp) return
      const sessionId = input.sessionID

      const errors: string[] = []
      const attempt = { n: 0 }
      let lang = ""

      // --- JS/TS ---
      if (/\.(ts|tsx|js|jsx|mts|cts|mjs|cjs)$/.test(fp)) {
        lang = "JS/TS"
        const e1 = await formatFile($, "prettier --write", fp, attempt)
        if (e1) errors.push("format: " + e1)

        const pmPrefix = await exists($, "pnpm") ? "pnpm run"
          : await exists($, "npm") ? "npm run"
          : await exists($, "yarn") ? "yarn run"
          : await exists($, "bun") ? "bun run"
          : null
        if (pmPrefix) {
          const e2 = await typecheck($, `${pmPrefix} typecheck`, attempt)
          if (e2) errors.push("typecheck: " + e2)
          const e3 = await lintFile($, `${pmPrefix} lint`, fp, attempt)
          if (e3) errors.push("lint: " + e3)
        }
      }

      // --- Python ---
      if (/\.py$/.test(fp)) {
        lang = "Python"
        const e1 = await formatFile($, "ruff format", fp, attempt)
        if (e1) errors.push("pyFormat: " + e1)
        const e2 = await lintFile($, "ruff check", fp, attempt)
        if (e2) errors.push("pyLint: " + e2)
        const e3 = await typecheck($, "mypy .", attempt)
        if (e3) errors.push("pyType: " + e3)
      }

      // --- Rust ---
      if (/\.rs$/.test(fp)) {
        lang = "Rust"
        const e1 = await formatFile($, "rustfmt", fp, attempt)
        if (e1) errors.push("rsFormat: " + e1)
        const e2 = await lintFile($, "cargo clippy --quiet", fp, attempt)
        if (e2) errors.push("rsClippy: " + e2)
      }

      // --- Go ---
      if (/\.go$/.test(fp) && (await exists($, "go"))) {
        lang = "Go"
        attempt.n++
        const e1 = await formatFile($, "gofmt -w", fp)
        if (e1) errors.push("goFormat: " + e1)

        const dir = fp.includes("/") ? fp.substring(0, fp.lastIndexOf("/")) : "."
        const pkg = fp.startsWith("/") ? `${dir}/...` : (dir === "." ? "./..." : `./${dir}/...`)
        const r2 = await $`go vet ${pkg}`.nothrow().quiet()
        attempt.n++
        if (r2.exitCode > 0) errors.push(`goVet: ${r2.text.substring(0, 4000)}`)
      }

      // --- Ruby ---
      if (/\.rb$/.test(fp)) {
        lang = "Ruby"
        const e1 = await formatFile($, "rubocop --autocorrect-all --no-color", fp, attempt)
        if (e1) errors.push("rbFormat: " + e1)
        const e2 = await lintFile($, "rubocop --no-color", fp, attempt)
        if (e2) errors.push("rbLint: " + e2)
      }

      // --- Kotlin ---
      if (/\.kt$/.test(fp)) {
        lang = "Kotlin"
        const e1 = await formatFile($, "ktlint -F", fp, attempt)
        if (e1) errors.push("ktFormat: " + e1)
        const e2 = await lintFile($, "ktlint", fp, attempt)
        if (e2) errors.push("ktLint: " + e2)
      }

      // --- Swift ---
      if (/\.swift$/.test(fp)) {
        lang = "Swift"
        const e1 = await formatFile($, "swift-format --in-place", fp, attempt)
        if (e1) errors.push("swFormat: " + e1)
        const e2 = await lintFile($, "swiftlint", fp, attempt)
        if (e2) errors.push("swLint: " + e2)
      }

      // --- C/C++ (format only; clang-tidy は実行に数秒かかるため per-edit では不採用) ---
      if (/\.(c|cpp)$/.test(fp)) {
        lang = "C/C++"
        const e1 = await formatFile($, "clang-format -i", fp, attempt)
        if (e1) errors.push("cFormat: " + e1)
      }

      // --- C# (project-level commands) ---
      if (/\.cs$/.test(fp)) {
        lang = "C#"
        const e1 = await typecheck($, "dotnet format", attempt)
        if (e1) errors.push("csFormat: " + e1)
        const e2 = await typecheck($, "dotnet format --verify --verbosity detailed", attempt)
        if (e2) errors.push("csLint: " + e2)
      }

      // --- Java --- skipped (no universally adopted fast CLI tool for per-file linting)
      // Use build-level tools (checkstyle/pmd) via stack-setup.md

      // --- PHP --- skipped (no universally adopted fast CLI tool for per-file linting)
      // Use project-level tools (phpstan/psalm) via stack-setup.md

      if (errors.length === 0 && attempt.n === 0) {
        await client.tui.showToast({
          body: { message: `lint-and-typecheck: no tools found for ${lang} — install via stack-setup.md`, variant: "warning" },
        })
        return
      }

      if (errors.length === 0) {
        await client.tui.showToast({
          body: { message: "lint-and-typecheck: all checks passed", variant: "success" },
        })
        return
      }

      await client.tui.showToast({
        body: { message: `lint-and-typecheck: ${errors.length} check(s) failed`, variant: "error" },
      })

      if (!sessionId) return

      await client.session.prompt({
        path: { id: sessionId },
        body: {
          noReply: true,
          parts: [
            {
              type: "text",
              text: `Fix these issues in ${fp}:\n${errors.join("\n---\n")}`,
            },
          ],
        },
      })
    },
  }
}
