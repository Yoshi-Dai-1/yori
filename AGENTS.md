# AGENTS.md (yori 固有)

<!-- このファイルは yori リポジトリの開発用。
     opencode/snippets/agents/AGENTS.md とは別物。
     opencode/setup-harness.sh で他プロジェクトにコピーされない -->

## Project Overview

**yori**：AIエージェントとともに開発するためのハーネスエンジニアリングのナレッジベース。
あらゆるプロジェクト種別に横断的に適用できる設計思想・テンプレート・原則を集積する。

**技術スタック**: Markdown + Bash（opencode/setup-harness.sh）

## Commands

- Lint: なし（Markdown ファイルのみ）
- Setup: `bash opencode/setup-harness.sh`（ターゲットプロジェクトで実行）

## Commit Convention

コミットメッセージは conventional commits 形式（`fix:`, `feat:`, `feat!:`, `chore:`, `docs:`）に従うこと。semantic-release がコミットメッセージから次バージョンを自動判定するため。

## Architecture

### ディレクトリ構造

```
yori/
  opencode/             ← ハーネス一式（ターゲットプロジェクトに配布）
    principles/          ← 汎用原則
    architectures/       ← プロジェクト種別ごとの構成パターン
    decisions/           ← 判断の記録
    snippets/            ← テンプレート集
    setup-harness.sh     ← セットアップスクリプト
    README.md            ← 使用方法
  AGENTS.md              ← このファイル（yori 開発用・コピーされない）
  .design-notes/         ← 設計メモ（yori 開発用・コピーされない）
```

### データフロー（OpenCode における実動作）

```
AGENTS.md（ランタイム常時注入）
  ＋ opencode.json instructions[]
    ├── .opencode/instructions/cli-first.md（常時注入）
    ├── ARCHITECTURE.md（常時注入）
    └── docs/project-definition.md（常時注入）

instructions/*.md（rule-injector.ts がコード編集時にイベント駆動注入）
  ↓ 参照
principles/（詳細ドキュメント）

plugins/*.ts（コードによるガードレール。イベント駆動・自動実行）
  ←→ instructions/（補完関係：コード強制 × マークダウン思考ガイド）
```

## Code Style

- ファイル名: kebab-case.md
- ディレクトリ名: kebab-case
- Plugin ファイル: `{purpose}.ts`（plugins/）
- ルールファイル: `{トピック}.md`（instructions/）

## Boundaries

- `opencode/snippets/` 配下のテンプレートを直接編集しない（目的: テンプレートの改変）
- `opencode/setup-harness.sh` のコピー対象ディレクトリに yori 固有のファイルを置かない
- 他プロジェクトに混入する可能性があるファイルは `opencode/snippets/` にのみ配置する
- yori 固有の設計メモは `.design-notes/` に配置する
- Markdown のローカルリンク（`[text](path)`）の参照先ファイルが存在することを確認する

## Subagents

**ファイル参照の整合性を確認するとき**:
→ グローブ検索と grep を組み合わせて全参照を検証する

**テンプレートの改変**:
→ opencode/snippets/ 配下のファイルを編集する。opencode/principles/ や opencode/architectures/ は原則として編集しない（改善提案時は除く）

## Session Protocol

**セッション開始時**:
1. `.design-notes/session-context.md` が存在する場合 → 読んで設計文脈を復元する
2. `opencode/README.md` の「Directory Structure」セクションを参照可能にする。ディレクトリ構造はAGENTS.mdのArchitectureセクションで把握済み
3. 前回のセッションで「変更が必要」とマークされたファイルを確認する

**セッション終了時**:
→ `.design-notes/session-context.md` を更新する
→ 完了した変更・未解決の課題・次のセッションでやることを記録する

## Report Format

```
変更ファイル：[パス] - [概要]
整合性チェック：[参照先ファイル数確認済み / 問題なし / 問題あり]
混入リスク：[他プロジェクトに混入しない / 要確認]
公開README更新：[README.md / opencode/README.md / plugins/README.md / 不要（内部変更のみ）]
```
