# AGENTS.md

> **行動原則**: Think Before Coding > Simplicity First > Surgical Changes > Goal-Driven Execution
> **優先順位**: SSoT > 安全 > 品質。迷ったらこの順に従う。
> **安全原則**: 推測禁止 / 検証の明示 / 破壊的Git操作の禁止
> **言語**: 日本語（プロジェクトで指定された場合はそれに従う）。
> **SSoT**: このファイルが全エージェント・全自動化ツールの共通規範。詳細ルールは `.opencode/instructions/` に分離し、Plugin がイベント駆動で注入する。

<!-- 記入方法: .opencode/agents/agents-fill-guide.md を読む -->

## Project Overview

[プロジェクト名]：[何のためのプロジェクトか1〜2文。技術スタックとバージョンも含める]

## Commands

- Install: `[例: pnpm install / pip install -r requirements.txt / go mod download]`
- Dev: `[例: pnpm dev / python main.py / go run ./cmd/...]`
- Build: `[例: pnpm build / go build ./... / cargo build]`
- Type check: `[例: pnpm typecheck / mypy . / 型チェックがない言語は省略]`
- Lint: `[例: pnpm lint / ruff check . / cargo clippy / go vet ./...]`
- Format: `[例: pnpm prettier --write . / ruff format . / rustfmt / gofmt -w .]`
- Test: `[例: pnpm test / pytest / go test ./... / cargo test]`
- Test (single): `[例: pnpm test -- [ファイル] / pytest [ファイル] / go test ./[パッケージ]]`
- Deploy: `[デプロイコマンド。未定の場合は空欄]`

## Architecture

詳細は `ARCHITECTURE.md` を参照。
UIデザインの入口は `DESIGN.md` を参照（詳細は DESIGN.md の Read first に従う）。（UIなしプロジェクトはこの行を削除）

依存の方向（変更禁止）：[層A] → [層B] → [層C]

## Code Style

詳細は `.opencode/coding-conventions.md` を参照。
- ディレクトリ名：[例: kebab-case / snake_case]
- クラス・型名：[例: PascalCase]
- 関数・変数名：[例: camelCase（JS/TS）/ snake_case（Python/Go/Rust）]
- 定数：[例: UPPER_SNAKE_CASE]
- ファイル名：[例: kebab-case.ts / snake_case.py / PascalCase.tsx]

## Boundaries（禁止事項）

- `.env*` ファイルを変更・コミットしない
- 新しい環境変数を追加するときは `.env.example` にもキー名（値は空）を追記する
- `.env.example` は必ずコミット対象とする（チームとAIが必要な変数を把握するため）
- 機密情報をコードにハードコードしない・ログに出力しない
- `any` 型を使用しない
- マジックナンバーをコードに直書きしない（constants/に移す）
- テストコードを無断変更しない
- 指示されていない機能・抽象化・最適化を追加しない（YAGNI）
- 不明点は推測で実装せず、実装前に質問する
- セキュリティ問題を後回しにしない
- テストが通らない変更を本番に適用しない
- 1コミットに複数の目的の変更を混ぜない

## Safety Rules

- **推測禁止**: 読んでいないコードについて推測しない。関連ファイルを読み、利用箇所を検索してから判断する。
- **検証の明示**: 検証できない変更は、理由と手動確認手順を報告に含める。完了前に「何を変えたか」「何を検証したか」「何が未検証か」を明示する。
- **Git操作の制限**: 明示的に依頼されていない限り、commit・push・reset・rebase・force-push・ファイル削除・破壊的操作を行わない。

## コミット実行（Commit Execution）

セッション開始時に `ARCHITECTURE.md` の「開発プロセス」セクションを読み、
「コミット実行」設定を確認する。
設定がない場合・セクションが存在しない場合は「AI が提案・人間が実行」として動作する。

コミットメッセージの型・形式は `.opencode/standards/principles/naming-conventions.md` の
「コミットメッセージ（Conventional Commits）」セクションに従う。AI が常に生成する。

実行するコマンド（ステージングとコミットを一括で行う）：
```
git add -A && git commit -m "[生成したメッセージ]"
```
`.env*` ファイルは `git add -A` に含めない（pre-commit フックが検出するが二重の保護として）。

### 設定：「AI が自律実行」の場合

コミットのタイミング（上から順に確認し、最初に該当した条件を使う）：

1. **TDD フローが完了した直後**
   `.opencode/standards/principles/tdd-with-ai.md` の Step 8 に従う。これが最優先。
   TDD を使っているときはこの条件のみ適用する。

2. **人間が「コミットして」「commit して」と明示した直後**
   TDD を使っていない場合はこの条件のみ適用する。
   人間の明示指示なしに自律コミットしない。

### 設定：「AI が提案・人間が実行」の場合

人間から「コミットして」と指示されたとき、以下の形式で提案する：
```
以下のコマンドを実行してください：
git add -A && git commit -m "[生成したメッセージ]"
```
実行はしない。人間が確認・修正してから実行する。

## Security Boundaries

<!-- 判断基準：.opencode/standards/principles/security-requirements.md / event-injected rule: .opencode/instructions/security.md -->

- 認証・決済・個人情報・外部APIの実装依頼を受けたとき → 実装前に `@security-auditor（設計モード）` を呼び出す
- 認証・認可・機密データ・入力バリデーションを実装したとき → 完了後に `@security-auditor（監査モード）` を呼び出す
- 外部入力を受け取るエンドポイントを実装したとき → バックエンドバリデーションを確認する
- 環境変数を追加したとき → `.env.example` に反映しシークレットスキャンを実行する
- 依存関係ファイル編集時 → `.opencode/instructions/security.md` の言語別audit対応表に従う
<!-- このプロジェクト固有の制約（@security-auditor が自動追記）-->

## TDD Cycle

詳細は `.opencode/standards/principles/tdd-with-ai.md` を参照。
基本方針: 実装前にテストを書き、`@test-generator` を呼び出す。確認順序: 型チェック → lint → テスト → `@code-reviewer` → 人間レビュー。
テストドリフト（ソース編集後にテスト未更新の検出）: `.opencode/instructions/tdd-cycle.md` 参照。

## Subagents

<!-- [プロジェクト名]・依存の方向・Taking on がプレースホルダーのままなら、ARCHITECTURE.mdの記入を先に促す -->

- 複数ファイル・複数タスクの実装 → `@planner`（spec.md + tasks.json 生成。作業ディレクトリ判断基準は harness-engineering.md）
- スプリント開始前 → `@evaluator`（Sprint Contract レビュー。承認まで繰り返す）
- スプリント完了後 → `@evaluator`（QA評価。PASS → 次、FAIL → 修正）
- 調査・原因特定 → `@codebase-investigator`（メインコンテキストを汚さない）
- 本番コード変更前 → `.opencode/skills/live-operation/` Pre-Change Checklist
- 月次診断 → `@resilience-checker` + `@code-quality-auditor`
- 本番リリース前 → `@resilience-checker` 最終確認

## Current Task

<!-- 毎セッション開始時に更新する。.opencode/project-context.md の「現在のタスク」も同じ内容に合わせて更新する -->
**Taking on**: [取り組んでいる機能]
**Done**: [完了部分]
**Next**: [次にやること]

## Session Protocol

**セッション開始時**：
1. `.opencode/handoff-artifact.md` を確認 → 存在すれば読んで文脈復元（`## Security Status` も確認）。なければ `AGENTS.md` + `ARCHITECTURE.md` を読む
2. `docs/tasks.json` の未完了タスク（`"passes": false`）を確認
3. `docs/working/` 内の各 `<group>/plan.md` を読み未完了タスクの文脈を復元
4. **Smoke Test**: Dev コマンドが定義されており実装が存在する場合のみ実行（コードなし・APIのみ・CLIはスキップ）。ビルドエラーは修復を優先
5. **`.env` の状態確認**：空なら `.env.example` のキー一覧を空値で `.env` にコピーし、人間に値入力を促す。値を推測・自動生成しない
6. Current Task と `.opencode/project-context.md` の「現在のタスク」を現在の状態に更新する
7. **Plugin 正常性チェック**: `.opencode/plugins/*.ts` が存在しプロジェクト名が埋まっているのに `bun` 未インストールの場合 → インストールを提案
8. **月次診断期限チェック**: `docs/quality-scorecard.md` の最終診断日が30日以上前（または不存在）なら診断実施を提案

**セッション終了時**：`handoff.ts` Plugin（`session.deleted`）が `.opencode/handoff-artifact.md` のテンプレートを自動生成し、`docs/build-log.md` に日付行を追記する。詳細な引き継ぎは `@handoff` または「今日はここまで」と伝える。handoff スキル実行済みの場合（`<!-- HANDOFF_FILLED -->` マーカーあり）、Pluginは既存ファイルを上書きしない。

## Report Format

実装・変更の完了時は必ず以下の形式で報告し、`@code-reviewer` を呼び出す：
```
変更ファイル：[パス] - [概要]
テスト結果：[通過N件 / 失敗N件]
層のルール：[問題なし / 問題あり（詳細）]
影響範囲：[変更が影響するコンポーネント]
ロールバック：git revert [コミットID]（本番稼働中の場合のみ記載）
懸念点：[あれば記載。なければ「なし」]
要記録判断：[ライブラリ選定・データモデル・認証方式・方針変更があれば decisions/ への記録を提案する。なければ「なし」]
```

<!-- decisions/ テンプレート：.opencode/standards/tech-decision.md.template -->
<!-- 保存先：decisions/[連番]-[内容を表すslug].md -->
