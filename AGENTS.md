# AGENTS.md (dev-standards 固有)

<!-- このファイルは dev-standards リポジトリの開発用。
     snippets/agents/AGENTS.md とは別物。
     setup-harness.sh で他プロジェクトにコピーされない -->

## Project Overview

**dev-standards**：AIエージェントとともに開発するためのハーネスエンジニアリングのナレッジベース。
あらゆるプロジェクト種別に横断的に適用できる設計思想・テンプレート・原則を集積する。

**技術スタック**: Markdown + Bash（setup-harness.sh）

## Commands

- Lint: なし（Markdown ファイルのみ）
- Setup: `bash setup-harness.sh`（他プロジェクトで実行）

## Architecture

### ディレクトリ構造（重要）

```
dev-standards/
  principles/          ← 汎用原則（読む・参照する。setup-harness.sh が .opencode/standards/principles/ にコピー）
  architectures/       ← プロジェクト種別ごとの構成パターン（setup-harness.sh が .opencode/standards/architectures/ にコピー）
  decisions/           ← 判断の記録（setup-harness.sh が decisions/ 配下をコピー）
  snippets/            ← テンプレート集（コピーして使う）
    agents/            ← AGENTS.md テンプレート
    .opencode/         ← ハーネス雛形（instructions/ skills/ plugins/）
    docs/              ← ドキュメント雛形
  setup-harness.sh     ← セットアップスクリプト（新プロジェクト開始時に実行）
  AGENTS.md            ← このファイル（dev-standards固有・コピーされない）
  .design-notes/       ← 設計メモ（dev-standards固有・コピーされない）
```

### データフロー（OpenCode における実動作）

```
AGENTS.md（常時コンテキスト保持）
  ＋ opencode.json → instructions[]
    ├── instructions/*.md（セッション開始時にLLMに注入。マークダウン判断基準）
    │     ↓ 参照（必要時に読む）
    └── principles/（詳細ドキュメント）

plugins/*.ts（コードによるガードレール。イベント駆動・AIの意思に関わらず自動実行）
  ←→ instructions/（補完関係：コードによる強制 × マークダウンによる思考ガイド）
```

## Code Style

- ファイル名: kebab-case.md
- ディレクトリ名: kebab-case
- Plugin ファイル: `{purpose}.ts`（plugins/）
- ルールファイル: `{トピック}.md`（instructions/）

## Boundaries（禁止事項）

- `snippets/` 配下のテンプレートを直接編集しない（目的: テンプレートの改変）
- `setup-harness.sh` のコピー対象ディレクトリ（principles/ architectures/ snippets/ decisions/ instructions/）に dev-standards固有のファイルを置かない
- 他プロジェクトに混入する可能性があるファイルは `snippets/` にのみ配置する
- dev-standards固有の設計メモは `.design-notes/` に配置する
- Markdown のローカルリンク（`[text](path)`）の参照先ファイルが存在することを確認する

## Subagents

**ファイル参照の整合性を確認するとき**:
→ グローブ検索と grep を組み合わせて全参照を検証する

**テンプレートの改変**:
→ snippets/ 配下のファイルを編集する。principles/ や architectures/ は原則として編集しない（改善提案時は除く）

## Session Protocol

**セッション開始時**:
1. `.design-notes/session-context.md` が存在する場合 → 読んで設計文脈を復元する
2. `README.md` の「構成」セクションを参照可能にする（全482行。必要になった時点で読む）。ディレクトリ構造はAGENTS.mdのArchitectureセクションで把握済み
3. 前回のセッションで「変更が必要」とマークされたファイルを確認する

**セッション終了時**:
→ `.design-notes/session-context.md` を更新する
→ 完了した変更・未解決の課題・次のセッションでやることを記録する

## Report Format

```
変更ファイル：[パス] - [概要]
整合性チェック：[参照先ファイル数確認済み / 問題なし / 問題あり]
混入リスク：[他プロジェクトに混入しない / 要確認]
```
