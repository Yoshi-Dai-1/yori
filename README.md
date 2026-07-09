# yori

[English](README.md) | [日本語](README.ja.md)

[![MIT License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![npm version](https://img.shields.io/npm/v/@yoshi-dai/yori)](https://www.npmjs.com/package/@yoshi-dai/yori)
[![GitHub Stars](https://img.shields.io/github/stars/Yoshi-Dai-1/yori?style=flat)](https://github.com/Yoshi-Dai-1/yori)

> **A harness engineering knowledge base for AI co-development.**
> Embed design principles, rules, and decision records into your project so AI agents reason autonomously — without you repeating instructions every session.

A **harness** is an external structure (rules + plugins + decision records) that guides AI agent behavior. Instead of telling AI what to do each session, you embed the guidance into the project itself.

`yori` (this repository) is the blueprint and template collection of the harness. Run `opencode/setup-harness.sh` in your target project to deploy a working harness.

## Why yori

- AI output quality varies session by session
- Repeating the same instructions to AI every time
- AI forgets past decisions
- AI cuts corners when context window is full (context anxiety)
- AI commits secrets accidentally
- Project knowledge trapped in human heads

## Quick Start

```bash
# Run in your target project root (recommended)
bash <(curl -s https://raw.githubusercontent.com/Yoshi-Dai-1/yori/main/opencode/setup-harness.sh)
```

See [opencode/README.md](opencode/README.md) for alternative setup methods (npm / git clone).

After setup, open the project in OpenCode and start a session. The AI will automatically guide you through project definition, architecture, and design setup.

## Features

| Category | Count | Description |
|---|---|---|
| Principles | 23 | Universal principles: harness engineering, security, code quality, test strategy, etc. |
| Architectures | 13 | Architecture patterns by project type (Web API / CLI / monorepo / mobile / etc.) |
| Plugins | 18 | TypeScript event-driven guardrails (secrets prevention, diagnostics, env check, lint, skill tracking, etc.) |
| Instructions | 11 | Rule files injected on session events |
| Subagents | 9 | Agent definitions specialized for specific tasks |
| ADRs | 3 | Architecture Decision Records |

## Project Structure

```
yori/
  opencode/                 Harness blueprint & templates (distributed by setup-harness.sh)
    principles/             Universal principles
    architectures/          Architecture patterns
    decisions/              Decision records (ADR)
    snippets/               Templates (distribution)
    setup-harness.sh        Setup script
    README.md               Harness setup instructions (English)
    README.ja.md            Harness setup instructions (Japanese)
  AGENTS.md                 yori's own agent definition (not distributed)
  README.md                 Project overview (English)
  README.ja.md              Project overview (Japanese)
  package.json              npm package definition
  cli.js                    npm CLI entry point
  setup-harness.ps1         Windows (WSL2) wrapper
  .releaserc.json           semantic-release configuration
  .github/                  GitHub Actions workflows
  .design-notes/            Design notes (yori development, not distributed)
  .releaserc.json           semantic-release config
  .github/                  GitHub Actions workflows
  .design-notes/            Design memos (yori-internal, not distributed)
```

## Links

- [opencode/README.md](opencode/README.md) — Harness setup & new project guide
- [AGENTS.md](AGENTS.md) — yori's agent definition for development
- [LICENSE](LICENSE) — MIT License

## License

MIT
