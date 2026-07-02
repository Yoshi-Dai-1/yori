import type { Plugin } from "@opencode-ai/plugin"

/**
 * arch-diag.ts
 *
 * ARCHITECTURE.md の技術スタック変更を検知し、関連スキルの確認を促す。
 *
 * P1-3 修正（2026-06）：AI 通知パターンに統一
 * - 旧：`client.app.log` のみ（OpenCode のログファイルに書き出すだけ。AI も人間も気づかない）
 * - 新：`client.tui.showToast` + `client.session.prompt` で AI に通知
 * - 他の Plugin（lint-and-typecheck.ts:165-176、harness-health.ts など）と同じパターン
 */

const TECH_SECTION_PATTERNS = [
  /^##\s+技術スタック/m,
  /^##\s+Tech Stack/m,
  /^##\s+採用アーキテクチャ/m,
  /^##\s+Architecture/m,
  /^\|\s*(フレームワーク|Framework|言語|Language|Database|Storage|Cache)\s+\|/m,
  /^#\s+技術スタック/m,
]

export const ArchDiagPlugin: Plugin = async ({ client, $ }) => ({
  "tool.execute.after": async (input) => {
    if (!["write", "edit", "multiedit"].includes(input.tool)) return

    const fp = input.args?.filePath || input.args?.path || ""
    if (!fp.includes("ARCHITECTURE.md")) return

    const content = await Bun.file(fp).text().catch(() => "")
    if (!content) return

    const hasTechContent = TECH_SECTION_PATTERNS.some((p) => p.test(content))
    if (!hasTechContent) return

    const sessionId = input.sessionID
    if (!sessionId) return

    await client.tui.showToast({
      body: {
        message: "arch-diag: ARCHITECTURE.md の技術スタックが変更されました",
        variant: "info",
      },
    })

    await client.session.prompt({
      path: { id: sessionId },
      body: {
        noReply: true,
        parts: [
          {
            type: "text",
            text:
              `ARCHITECTURE.md の技術スタックセクションが変更されました。\n` +
              `推奨アクション：\n` +
              `1. Skill ツールで skill_name="find-skills" を実行し、関連スキルを追加検討\n` +
              `2. @planner に新スタックでの実装影響を確認\n` +
              `3. 影響範囲に応じて security-requirements.md / network-resilience.md の参照を更新\n` +
              `この変更が古いハーネス構成と整合しない場合、ハーネス健全性チェックも実施してください。`,
          },
        ],
      },
    })

    // --- Layer enforcement check ---
    const layerRowPattern = /^\|\s*\w+\s+\|\s*`[^`]+`\s+\|/m
    const hasPlaceholderLayers = /\[層[A-D]\]/.test(content)
    if (!layerRowPattern.test(content) || hasPlaceholderLayers) return

    let enforcementFound = false

    if (/TypeScript|JavaScript/i.test(content)) {
      for (const cfg of ['eslint.config.mjs', 'eslint.config.js', '.eslintrc.json', 'eslint.config.cjs']) {
        const r = await $`test -f ${cfg}`.nothrow().quiet()
        if (r.exitCode !== 0) continue
        const cfgContent = await Bun.file(cfg).text().catch(() => '')
        if (cfgContent.includes('no-restricted-imports') || cfgContent.includes('boundaries')) {
          enforcementFound = true
          break
        }
      }
    }

    if (!enforcementFound && /Python/i.test(content)) {
      const r = await $`test -f pyproject.toml`.nothrow().quiet()
      if (r.exitCode === 0) {
        const tomlContent = await Bun.file('pyproject.toml').text().catch(() => '')
        if (tomlContent.includes('TID251') || tomlContent.includes('flake8-tidy-imports')) {
          enforcementFound = true
        }
      }
    }

    if (!enforcementFound) {
      const manualLangs = ['Go', 'Rust', 'Ruby', 'Swift', 'Kotlin', 'Java', 'PHP']
      const hasLangWord = manualLangs.some((l) => new RegExp(`\\b${l}\\b`, 'i').test(content))
      const hasCFamily = /(?:^|\s)C(?:\+\+|#)?(?:\s|$)/m.test(content)
      if (hasLangWord || hasCFamily) {
        if (content.includes('@code-quality-auditor')) {
          enforcementFound = true
        }
      }
    }

    if (!enforcementFound) {
      await client.tui.showToast({
        body: {
          message: 'arch-diag: アーキテクチャ違反検出が未設定です',
          variant: 'warning',
        },
      })

      await client.session.prompt({
        path: { id: sessionId },
        body: {
          noReply: true,
          parts: [
            {
              type: 'text',
              text:
                `⚠️ アーキテクチャ違反検出が未設定です\n\n` +
                `ARCHITECTURE.md に層のルールが定義されていますが、依存方向の違反を自動検出する設定がありません。\n\n` +
                `対処：stack-setup.md Step 4（.opencode/instructions/stack-setup/_step-36-arch.md）を実行し、\n` +
                `アーキテクチャ違反検出を設定してください。\n\n` +
                `設定後はコード編集のたびに lint-and-typecheck.ts Plugin が自動で違反を検出します。\n` +
                `設定しない場合、層違反に気づかないまま開発が進み、後からの修正が困難になります。`,
            },
          ],
        },
      })
    }
  },
})
