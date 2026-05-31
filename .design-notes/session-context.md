# Session Context (2026-05-30) — トリガーアーキテクチャ再設計

## 完了（旧セッションからの継続）

**Plugin 修正**: multiedit対応 / エラー握り潰し修正 / HANDOFF_FILLED永久停止解消 / arch-diag拡張 / features-guard改善 / skill-tracker改善 / lint opt-in化 / secrets正規表現改善

**Subagent発見修正10件**: .env矛盾解消 / desktop-app/iac ブロック誤属性修正 / AGENTS.md モード追記 / production-readiness.md 曖昧修正 / stack-setup.md条件明確化 / security/network-resilience イベントプロキシ追加 / handoff git status化 / go vet絶対パス修正

## 本セッションの変更 — トリガーアーキテクチャ再設計

### 問題の発見
- `> **自律トリガー**` ブロックが principles ファイル（常時コンテキスト外）にあり、発動経路がない
- 前回セッション（Issue B）で8ファイルに追加したが、Claude Code 設計パターンから逸脱していた

### Claude Code 設計パターン（再確認）
1. **paths frontmatter**: 該当ファイルアクセス時に自動リロード
2. **`### [条件]` heading**: rules ファイル内にトリガー条件を宣言
3. **principles 参照**: rules から principles を「必要時に読む」参照
4. **principles にトリガーを書かない**: トリガーは rules/ の専責

### 実施した修正

| 操作 | ファイル | 内容 |
|------|---------|------|
| 削除 | `principles/` 全8ファイル | `> **自律トリガー**` ブロックを除去（Issue Bの逆転） |
| 作成 | `rules/code-quality.md` | code-quality + file-size-and-cohesion 統合トリガー |
| 作成 | `rules/naming-conventions.md` | 命名規則トリガー（新規追加） |
| 作成 | `rules/code-review.md` | コードレビュートリガー |
| 作成 | `rules/production.md` | production-readiness + production-deployment 統合トリガー |
| 作成 | `rules/directory-structure.md` | ディレクトリ構成トリガー |
| 削除 | `AGENTS.md:62-64` | コメント行トリガーを削除（rules/ に移行完了） |

### 新しいトリガーカバレッジ

| principles | 発動元 | ファイル |
|-----------|--------|---------|
| code-quality | ファイル作成・編集時 | rules/code-quality.md |
| file-size-and-cohesion | ファイル作成・編集時 | rules/code-quality.md（統合） |
| naming-conventions | ファイル作成・命名時 | rules/naming-conventions.md |
| code-review | @code-reviewer 呼出前 | rules/code-review.md |
| production-readiness | デプロイ前・リリース時 | rules/production.md |
| production-deployment | デプロイ時 | rules/production.md（統合） |
| directory-structure | 新規ディレクトリ作成時 | rules/directory-structure.md |
| tdd-with-ai | 実装開始・バグ修正時 | AGENTS.md TDD Cycle |
| design-contract | UI作成時 | rules/design-contract.md（既存） |
| security-requirements | project-definition更新時 | rules/security.md（既存） |
| network-resilience | 通信コード作成時 | rules/network-resilience.md（既存） |

## 確立した設計判断

- **トリガーは rules/ に置く**: principles は純粋な参照ドキュメント。トリガー条件を principles に書かない
- **rules が常時コンテキスト**: `instructions[]` の glob で全 rules がセッション開始時に注入される
- **Plugin はトリガーに使わない**: 確実性は高いがノイズ・偽陽性・トークンコストの面で rules に劣る
- **発動条件は `### heading`**: Claude Code 時代のパターンを継承。heading が AI の検出条件

## 2026-05-30 第2部 — OpenCode 移行に伴う参照修正

### 実施した修正

| 操作 | ファイル | 内容 |
|------|---------|------|
| 修正 | `snippets/.opencode/rules/stack-setup.md` | 7ヶ所の `.sh.example` → `lint-and-typecheck.ts` 参照 + Step 0（自動 bun install）追加 |
| 修正 | `snippets/.opencode/rules/stack-setup.md:517,523` | `non-functional-requirements.md` bare filename → フルパス `.opencode/standards/principles/...` |
| 修正 | `snippets/.opencode/rules/network-resilience.md:62` | `ssot-and-constants.md` bare filename → フルパス `.opencode/standards/principles/...` |
| リネーム | `principles/project-definition.md` → `principles/project-definition-guide.md` | `docs/project-definition.md` との同名衝突解消 |
| 修正 | `principles/project-definition-guide.md:244` | 内部自己参照を `.opencode/standards/principles/project-definition-guide.md` に更新 |
| 修正 | `snippets/.opencode/rules/security.md:46-54` | project-definition トリガーに guide 参照 + 対話プロンプトステップを追加（計7ステップ） |
| 修正 | `setup-harness.sh:376,684` | パスを `project-definition-guide.md` に更新 |

### 最終検証結果

- `.sh.example` 残骸: 0件
- bare filename → フルパス未修正: 0件（ssot-and-constants, non-functional-requirements とも対応済み）
- `.claude/` 残骸: 0件
- 孤立 principle（snippets/ から参照なし）: `harness-engineering.md`, `subagents.md`（cda0a26 から変化なし）
- cda0a26（Claude Code最終）との比較: 上位互換。弱体化なし
- 自律トリガーパターン維持: `paths` + `### [条件]` の二段構え、3層段階的開示、Plugin 自動実行

### 第3部 — Claude Code Hook 残骸の完全除去（徹底調査）

| 操作 | ファイル | 内容 |
|------|---------|------|
| 修正 | `snippets/.opencode/usage/skill-usage.md:3` | `Hook` → `skill-tracker.ts Plugin` |
| 修正 | `snippets/.opencode/usage/skill-usage.md:15` | `Hook（未設定の場合...）` → `skill-tracker.ts Plugin` |
| 修正 | `principles/harness-engineering.md:56` | `hooks/` → `plugins/`（ディレクトリ一覧） |
| 修正 | `principles/harness-engineering.md:82` | `hooks/` → `plugins/`（役割分担テーブル） |

全78ファイルを対象に以下を確認：
- `.sh.example` 実体・参照: 0件（session-context.md を除く）
- `.claude/` パス: 0件（session-context.md を除く）
- `Hook`（Claude Code機構）: 0件（4ヶ所修正済み）
- `hooks/`（Claude Codeの旧ディレクトリ名）: 0件（2ヶ所修正済み）
- 残存する `hook` 関連語はすべて React hooks / webhook / git pre-commit hook のみ

### 第4部 — README の矛盾修正

| 操作 | ファイル | 内容 |
|------|---------|------|
| 修正 | `README.md:35` | `project-definition.md` → `project-definition-guide.md`（ファイル名＋説明文） |
| 修正 | `README.md:247` | 旧パス → `.opencode/standards/principles/project-definition-guide.md` |
| 修正 | `README.md:358` | 旧パス → `project-definition-guide.md` の対話プロンプトに従い作成（開発フロー対応表） |

README の全473行を確認。残る `project-definition.md` 参照はすべて `docs/project-definition.md`（プロジェクト設定ファイル）への正しい参照のみ。

## 残タスク

1. **setup-harness.sh 実機テスト**: 継続保留
2. **session.deleted 実機テスト**: 継続保留
3. **Plugin 設定ドキュメント充実化**: 継続保留（優先度低）
