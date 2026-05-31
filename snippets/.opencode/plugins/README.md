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

## `lint-and-typecheck.ts` 詳細

### カバレッジ

| 言語 | フォーマッター | リンター | 型チェッカー |
|------|--------------|---------|------------|
| TypeScript / JavaScript | `prettier --write` | `(pm) run lint` | `(pm) run typecheck` |
| Python | `ruff format` | `ruff check` | `mypy .` |
| Go | `gofmt -w` | `go vet` | — (go vet が統合) |
| Rust | `rustfmt` | `cargo clippy --quiet` | — (cargo が統合) |
| Ruby | `rubocop --autocorrect-all` | `rubocop` | — (rubocop が統合) |
| Kotlin | `ktlint -F` | `ktlint` | — |
| Swift | `swift-format --in-place` | `swiftlint` | — |
| C/C++ | `clang-format -i` | — (clang-tidy は CI で) | — |
| C# | `dotnet format` | `dotnet format --verify` | — (dotnet build が統合) |
| Java | — (スキップ) | — (スキップ) | — (スキップ) |
| PHP | — (スキップ) | — (スキップ) | — (スキップ) |

**Java/PHP をスキップする理由：**
Java/PHP には lint-and-typecheck の全言語に共通して採用している「`which` で検出して即座に実行できる高速CLIツール」が標準化されていない。代わりにビルドツール（Maven/Gradle/Composer）経由の品質チェックが必要なため、Plugin 層ではなく `stack-setup.md` 層でプロジェクト固有対応として案内する。

### 動作の流れ

1. ファイル編集後、拡張子で言語を判定
2. 各ツールを `which` で自動検出（インストール有無を確認）
3. 見つかったツールだけを実行する（見つからないツールはサイレントスキップ）
4. 結果に応じて Toast 通知：
   - 🟢 `all checks passed` — すべてのツールが正常終了
   - 🟡 `no tools found for [lang]` — 1つもツールが見つからなかった（インストールが必要）
   - 🔴 `${N} check(s) failed` — エラーあり（AI に自動通知して修正させる）

### 責任境界

**`lint-and-typecheck.ts`（Plugin 層）はツールのインストールを行わない。**
インストールは `stack-setup.md`（ルール層）が担当し、auto-deploy level に従って
自動実行・確認付き実行・提案のみを切り替える。

- Plugin 層：ツールが既に存在することを前提に `which` 検出 → 実行 → 結果通知
- ルール層（stack-setup.md）：言語検出時に必要なツールを OS 別にインストール

### 設定変更

カスタマイズしたいときは「`lint-and-typecheck.ts` の lint コマンドを変更して」とAIに指示する。AIが該当 `.ts` ファイルを編集する。
`lint-and-typecheck.ts` は使用可能なツールを自動検出する（デフォルトで設定変更の必要なし）。
変更箇所の候補：
- `exists()` の引数（ツール名）を変更する
- 該当言語ブロック内のコマンド文字列（`formatFile` / `lintFile` / `typecheck` の第1引数）を変更する
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
