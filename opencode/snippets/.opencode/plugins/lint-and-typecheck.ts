import type { Plugin } from "@opencode-ai/plugin"

/**
 * lint-and-typecheck.ts
 *
 * ファイル編集後に format・lint・typecheck を自動実行する。
 *
 * P1-2 修正（2026-06）：
 * - Package Manager 検出を Plugin init 時に1回だけ実行（毎回4回 which を呼ぶ無駄を排除）
 * - mypy をファイル単位 + --follow-imports=silent に変更（`mypy .` の全体実行を回避）
 * - Go の `go vet` を package 単位に変更（lint-and-typecheck.ts:90 周辺の処理を維持）
 *
 * 設計原則：Plugin 層はツールのインストールを行わない（plugins/README.md:75-83 参照）。
 * ツールのインストールは stack-setup.md（ルール層）が担当する。
 */

const exists = async ($: any, cmd: string): Promise<boolean> => {
  const name = cmd.split(/\s+/)[0]
  if (!name) return false
  if (name.includes("/")) {
    const r = await $`test -f ${name}`.nothrow().quiet()
    return r.exitCode === 0
  }
  const r = await $`which ${name}`.nothrow().quiet()
  return r.exitCode === 0
}

async function typecheck(
  $: any,
  cmd: string,
  tracker?: { n: number },
): Promise<string | null> {
  if (!(await exists($, cmd.split(/\s+/)[0]))) return null
  if (tracker) tracker.n++
  const r = await $`${cmd}`.nothrow().quiet()
  return r.exitCode === 0 ? null : r.text.substring(0, 4000)
}

async function lintFile(
  $: any,
  cmd: string,
  fp: string,
  tracker?: { n: number },
): Promise<string | null> {
  if (!(await exists($, cmd.split(/\s+/)[0]))) return null
  if (tracker) tracker.n++
  const r = await $`${cmd} ${fp}`.nothrow().quiet()
  return r.exitCode === 0 ? null : r.text.substring(0, 4000)
}

async function formatFile(
  $: any,
  cmd: string,
  fp: string,
  tracker?: { n: number },
): Promise<string | null> {
  if (!(await exists($, cmd.split(/\s+/)[0]))) return null
  if (tracker) tracker.n++
  const r = await $`${cmd} ${fp}`.nothrow().quiet()
  return r.exitCode === 0 ? null : r.text.substring(0, 2000)
}

export const LintAndTypecheckPlugin: Plugin = async ({ $, client }) => {
  // ★ P1-2 修正：Package Manager 検出を Plugin init 時に1回だけ実行
  // 優先順位：pnpm > npm > bun > yarn（2026年現在のシェアとパフォーマンスに基づく）
  const pmPrefix = (await exists($, "pnpm"))
    ? "pnpm run"
    : (await exists($, "npm"))
      ? "npm run"
      : (await exists($, "bun"))
        ? "bun run"
        : (await exists($, "yarn"))
          ? "yarn run"
          : null

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
      // npm install --save-dev で node_modules/.bin/ にインストールされるツールを優先
      if (/\.(ts|tsx|js|jsx|mts|cts|mjs|cjs)$/.test(fp)) {
        lang = "JS/TS"
        const prettierCmd = (await $`test -f node_modules/.bin/prettier`.nothrow().quiet()).exitCode === 0
          ? "node_modules/.bin/prettier --write"
          : "prettier --write"
        const e1 = await formatFile($, prettierCmd, fp, attempt)
        if (e1) errors.push("format: " + e1)

        if (pmPrefix) {
          const e2 = await typecheck($, `${pmPrefix} typecheck`, attempt)
          if (e2) errors.push("typecheck: " + e2)
          const e3 = await lintFile($, `${pmPrefix} lint`, fp, attempt)
          if (e3) errors.push("lint: " + e3)
        }
      }

      // --- Python ---
      // .venv/bin/ 内のツールのみを使用する（グローバルにはフォールバックしない）
      // _python.md / stack-setup.md が仮想環境作成 + ツールインストールを保証する
      if (/\.py$/.test(fp)) {
        lang = "Python"
        const pyRuff = (await $`test -f .venv/bin/ruff`.nothrow().quiet()).exitCode === 0
          ? ".venv/bin/ruff" : null
        if (pyRuff) {
          attempt.n++
          const r1 = await $`${pyRuff} format ${fp}`.nothrow().quiet()
          if (r1.exitCode !== 0) errors.push("pyFormat: " + r1.text.substring(0, 2000))
          attempt.n++
          const r2 = await $`${pyRuff} check ${fp}`.nothrow().quiet()
          if (r2.exitCode !== 0) errors.push("pyLint: " + r2.text.substring(0, 4000))
        }
        if (await $`test -f .venv/bin/mypy`.nothrow().quiet().then(r => r.exitCode === 0)) {
          attempt.n++
          const r3 = await $`.venv/bin/mypy --follow-imports=silent --no-incremental ${fp}`.nothrow().quiet()
          if (r3.exitCode !== 0) errors.push("pyType: " + r3.text.substring(0, 4000))
        }
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
        const pkg = fp.startsWith("/") ? `${dir}/...` : dir === "." ? "./..." : `./${dir}/...`
        attempt.n++
        const r2 = await $`go vet ${pkg}`.nothrow().quiet()
        if (r2.exitCode > 0) errors.push(`goVet: ${r2.text.substring(0, 4000)}`)
      }

      // --- Ruby ---
      // Gemfile.lock が存在する場合、bundle exec 経由でプロジェクトローカルツールを優先
      if (/\.rb$/.test(fp)) {
        lang = "Ruby"
        const rp = (await $`test -f Gemfile.lock`.nothrow().quiet()).exitCode === 0
          ? "bundle exec " : ""
        const e1 = await formatFile($, `${rp}rubocop --autocorrect-all --no-color`, fp, attempt)
        if (e1) errors.push("rbFormat: " + e1)
        const e2 = await lintFile($, `${rp}rubocop --no-color`, fp, attempt)
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

      // --- C/C++ (format only) ---
      if (/\.(c|cpp)$/.test(fp)) {
        lang = "C/C++"
        const e1 = await formatFile($, "clang-format -i", fp, attempt)
        if (e1) errors.push("cFormat: " + e1)
      }

      // --- C# ---
      if (/\.cs$/.test(fp)) {
        lang = "C#"
        const e1 = await typecheck($, "dotnet format", attempt)
        if (e1) errors.push("csFormat: " + e1)
        const e2 = await typecheck($, "dotnet format --verify --verbosity detailed", attempt)
        if (e2) errors.push("csLint: " + e2)
      }

      if (errors.length === 0 && attempt.n === 0) {
        await client.tui.showToast({
          body: {
            message: `lint-and-typecheck: no tools found for ${lang} — install via stack-setup.md`,
            variant: "warning",
          },
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
