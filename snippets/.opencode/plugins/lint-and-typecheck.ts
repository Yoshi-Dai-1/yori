import type { Plugin } from "@opencode-ai/plugin"

interface LintConfig {
  enableTypecheck: boolean
  enableJsLint: boolean
  enableJsFormat: boolean
  typecheckCmd: string
  jsLintCmd: string
  jsFormatCmd: string
  enablePyLint: boolean
  enablePyFormat: boolean
  enableRustLint: boolean
  enableRustFormat: boolean
  enableGoLint: boolean
  enableGoFormat: boolean
  enableRubyLint: boolean
  enableRubyFormat: boolean
}

export const LintAndTypecheckPlugin: Plugin = async ({ $, client }) => {
  const cfg: LintConfig = {
    enableTypecheck: false,
    enableJsLint: false,
    enableJsFormat: false,
    typecheckCmd: "pnpm typecheck",
    jsLintCmd: "pnpm lint",
    jsFormatCmd: "pnpm prettier --write",
    enablePyLint: false,
    enablePyFormat: false,
    enableRustLint: false,
    enableRustFormat: false,
    enableGoLint: false,
    enableGoFormat: false,
    enableRubyLint: false,
    enableRubyFormat: false,
  }

  const exists = async (cmd: string) => {
    const name = cmd.split(/\s+/)[0]
    const r = await $`which ${name}`.nothrow()
    return r.exitCode === 0
  }

  const logFail = async (label: string, cmd: string, exitCode: number) => {
    await client.app.log({
      body: { service: "lint-and-typecheck", level: "warn", message: `${label} failed (exit ${exitCode}): ${cmd}` },
    })
  }

  return {
    "tool.execute.after": async (input) => {
      if (!["write", "edit", "multiedit"].includes(input.tool)) return

      const fp = input.args?.filePath || input.args?.path || ""
      if (!fp) return

      if (/\.(ts|tsx|js|jsx|mts|cts|mjs|cjs)$/.test(fp)) {
        if (cfg.enableJsFormat && await exists(cfg.jsFormatCmd)) {
          const r = await $`${cfg.jsFormatCmd} ${fp}`.nothrow()
          if (r.exitCode > 0) await logFail("jsFormat", cfg.jsFormatCmd, r.exitCode)
        }
        if (cfg.enableTypecheck && await exists(cfg.typecheckCmd)) {
          const r = await $`${cfg.typecheckCmd}`.nothrow()
          if (r.exitCode > 0) await logFail("typecheck", cfg.typecheckCmd, r.exitCode)
        }
        if (cfg.enableJsLint && await exists(cfg.jsLintCmd)) {
          const r = await $`${cfg.jsLintCmd} ${fp}`.nothrow()
          if (r.exitCode > 0) await logFail("jsLint", cfg.jsLintCmd, r.exitCode)
        }
      }

      if (/\.py$/.test(fp)) {
        if (cfg.enablePyFormat && await exists("ruff")) {
          const r = await $`ruff format ${fp}`.nothrow()
          if (r.exitCode > 0) await logFail("pyFormat", "ruff format", r.exitCode)
        }
        if (cfg.enablePyLint && await exists("ruff")) {
          const r = await $`ruff check ${fp}`.nothrow()
          if (r.exitCode > 0) await logFail("pyLint", "ruff check", r.exitCode)
        }
      }

      if (/\.rs$/.test(fp)) {
        if (cfg.enableRustFormat && await exists("rustfmt")) {
          const r = await $`rustfmt ${fp}`.nothrow()
          if (r.exitCode > 0) await logFail("rustFormat", "rustfmt", r.exitCode)
        }
        if (cfg.enableRustLint && await exists("cargo")) {
          const r = await $`cargo clippy --quiet`.nothrow()
          if (r.exitCode > 0) await logFail("rustLint", "cargo clippy", r.exitCode)
        }
      }

      if (/\.go$/.test(fp)) {
        if (cfg.enableGoFormat && await exists("gofmt")) {
          const r = await $`gofmt -w ${fp}`.nothrow()
          if (r.exitCode > 0) await logFail("goFormat", "gofmt -w", r.exitCode)
        }
        if (cfg.enableGoLint && await exists("go")) {
          const dir = fp.includes("/") ? fp.substring(0, fp.lastIndexOf("/")) : "."
          const pkg = fp.startsWith("/") ? `${dir}/...` : (dir === "." ? "./..." : `./${dir}/...`)
          const r = await $`go vet ${pkg}`.nothrow()
          if (r.exitCode > 0) await logFail("goVet", `go vet ./${dir}/...`, r.exitCode)
        }
      }

      if (/\.rb$/.test(fp)) {
        if (cfg.enableRubyFormat && await exists("rubocop")) {
          const r = await $`rubocop --autocorrect-all --no-color ${fp}`.nothrow()
          if (r.exitCode > 0) await logFail("rubyFormat", "rubocop --autocorrect-all", r.exitCode)
        }
        if (cfg.enableRubyLint && await exists("rubocop")) {
          const r = await $`rubocop --no-color ${fp}`.nothrow()
          if (r.exitCode > 0) await logFail("rubyLint", "rubocop", r.exitCode)
        }
      }
    },
  }
}
