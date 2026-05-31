# Plugins

OpenCode Plugin は TypeScript + Bun ランタイムで動作するイベント駆動型の自動実行仕組み。
AGENTS.md への言語指示と異なり、エージェントの意思に関わらず自動実行される。

## ファイル一覧

| Plugin | イベント | 目的 |
|--------|----------|------|
| `secrets-guard.ts` | `tool.execute.before` | 機密ファイル・パターンの書き込み防止 |
| `features-guard.ts` | `tool.execute.before` | features.json passes 保護 |
| `lint-and-typecheck.ts` | `tool.execute.after` | ファイル編集後の lint・format・typecheck |
| `doc-links.ts` | `tool.execute.after` | ドキュメントリンクの整合性チェック |
| `arch-diag.ts` | `tool.execute.after` | アーキテクチャ変更検知・スキル診断推奨 |
| `skill-tracker.ts` | `tool.execute.after` | スキル使用履歴の記録 |
| `handoff.ts` | `session.deleted` | セッション終了時の引き継ぎファイル生成 |

## イベントの種類

**`tool.execute.before`**: ツール実行前に発火。エラーを投げるとツール実行をブロックする。
- 引数: `(input: ToolCall, output: WritableToolArgs)`
- ブロック: `throw new Error("message")`

**`tool.execute.after`**: ツール実行後に発火。ブロック不可（サイドエフェクトのみ）。
- 引数: `(input: ToolCall, output: ToolResult)`
- ログ: `client.app.log({ body: { service, level, message } })`

**`session.deleted`**: セッション削除時に発火。ファイル書き込み可能。
- 引数: なし
- 用途: handoff アーティファクト生成

## セットアップ

`setup-harness.sh` が自動でファイルをコピーする。
手動で有効化する場合は `.opencode/plugins/` に .ts ファイルを配置するだけでよい。
opencode.json への登録は不要（auto-loading）。

依存関係のインストール：
```bash
cd .opencode
bun install
```

## 設定変更

各 Plugin の先頭にある設定オブジェクト（`LintConfig` 等）を編集する。
設定を変更した場合は `bun install` の再実行は不要（TypeScript は実行時コンパイルされる）。

## 無効化

不要な Plugin の .ts ファイルを削除するだけで無効化できる。

## 新規 Plugin の追加

`.opencode/plugins/` に .ts ファイルを作成し、`Plugin` 型に従ってエクスポートする：

```typescript
import type { Plugin } from "@opencode-ai/plugin"

export const MyPlugin: Plugin = async ({ client, $ }) => ({
  "tool.execute.after": async (input) => {
    // ...
  },
})
```

型定義は `@opencode-ai/plugin` パッケージから提供される。
