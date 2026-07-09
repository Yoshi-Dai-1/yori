# AGENTS.md

> **行動原則**: Think Before Coding > Simplicity First > Surgical Changes > Goal-Driven Execution
> **優先順位**: SSoT > 安全 > 品質。迷ったらこの順に従う。
> **安全原則**: 推測禁止 / 検証の明示 / 破壊的Git操作の禁止
> **言語**: 日本語（プロジェクトで指定された場合はそれに従う）。
> **SSoT**: このファイルが全エージェント・全自動化ツールの共通規範。詳細ルールは `.opencode/instructions/` に分離し、Plugin がイベント駆動で注入する。

<!-- 記入方法: .opencode/instructions/agents-fill-guide.md を読む -->

## 初期セットアップ（初回セッションのみ）

<!-- このセクションが存在することが「初回セッション」のシグナル。完了後は全文を削除する -->
<!-- 注意: このセクション実行中は「## Session Protocol」のセッション開始時手順を実行しない。このセクションの手順を最優先する -->

`docs/project-definition.md` が未記入（空セクションが多い）の場合のみ実行する。

### 0-a. 状況確認（CLI 状態確認のみ）

プロジェクトフォルダ内の既存ファイルを確認し、
CLI で外部リソース（DB・API・クラウドサービス等）の状態を確認する。
`.opencode/instructions/cli-first.md` の手順に従う。

- ✅ **許可**: 状態確認とそれに必要な認証（一覧表示・ログ取得・ヘルスチェック等）
- ❌ **禁止**: プロジェクトのソースコードとなるファイルのローカル取得・作成・編集
   — これらはプロジェクト定義完了後の後続セッションで行う

確認結果を人間に報告する。

### 0-b. プロジェクト定義の作成（対話）

`.opencode/standards/principles/project-definition-guide.md` の
5項目（Why → Who → What Must/Won't → Constraint → Security/Risk → DoD）を
1つずつ質問し、回答を `docs/project-definition.md` に記入する。

- Won't は必ず1つ以上引き出す
- Security/Risk はスキップしない

### 0-c. 自己検証（ゲート）

`docs/project-definition.md` の全セクションが埋まっているか確認する。
空セクションが残っている → 0-b に戻る。
全セクション完了 → 0-d に進む。

### 0-d. アーキテクチャ選定 → ARCHITECTURE.md 記入

1. `.opencode/standards/architectures/_how-to-choose.md` でアーキテクチャを選定する
2. `ARCHITECTURE.md` の**テンプレート全文を先に読んでから**、一回の編集で記入する
3. テンプレート内のコメント指示（「削除する」「該当セクションのみ記入」等）に従い、不要なセクションや未使用のコメントアウトブロックを削除する。プレースホルダーを残さない
4. アーキテクチャ選定の理由を `decisions/001-choose-[アーキテクチャ名].md` として作成する（`.opencode/standards/tech-decision.md.template` 参照）

### 0-e. AGENTS.md の Project Overview / Commands / Subagents を更新

`docs/project-definition.md` と `ARCHITECTURE.md` を参照して、
プロジェクト名・目的・コマンドを記入する。
Subagents のプレースホルダーコメントが解決済みなら削除する。

### 0-f. 完了処理

1. この「## 初期セットアップ（初回セッションのみ）」セクション全文を削除する
2. 人間に「新規セッションを開始してください」と促す
3. 以降の実作業は新規セッションで継続する

<!-- 注意: Report Format（後述）はコード実装の完了時に使用する。
     初期セットアップ完了時はこの手順のみ実行し、Report Format はスキップする。 -->

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

セッション開始時に `ARCHITECTURE.md` の「開発プロセス」セクションから
「コミット実行」設定を確認する。設定がない場合は「AI が提案・人間が実行」として動作する。

コミットメッセージは `.opencode/standards/principles/naming-conventions.md` の
Conventional Commits 形式に従う。実行コマンド:
```
git add -A && git commit -m "[生成したメッセージ]"
```
`.env*` ファイルは `git add -A` に含めない（pre-commit フックが二重保護）。

### 設定：「AI が自律実行」の場合

1. **TDD フロー完了直後**（`.opencode/standards/principles/tdd-with-ai.md` Step 8）。TDD 使用時はこの条件のみ。
2. **人間の明示指示（「コミットして」）直後**（TDD 非使用時のみ）。

### 設定：「AI が提案・人間が実行」の場合

1. **TDD 確認順序完了後**（型チェック → lint → テスト → @code-reviewer → 人間レビュー → 提案）
2. **人間の明示指示時**

提案後、人間が「実行して」と指示 → AI が bash 実行し commit-review.ts が発火する。
人間のターミナル手動実行では commit-review.ts は動作しない。

## Security Boundaries

<!-- 判断基準：.opencode/standards/principles/security-requirements.md / event-injected rule: .opencode/instructions/security.md -->

- 認証・決済・個人情報・外部APIの実装依頼を受けたとき → 実装前に `@security-designer` を呼び出す
- 認証・認可・機密データ・入力バリデーションを実装したとき → 完了後に `@security-auditor` を呼び出す
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

- 複数ファイル・複数タスクの実装 → `@planner`（spec.md + tasks.json 生成。作業ディレクトリ判断基準は `.opencode/standards/principles/harness-engineering.md`）
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
1. `.opencode/handoff-artifact.md` が存在する場合のみ Read して文脈復元（`## Security Status` も確認）。`.opencode/.handoff-trigger` が存在する場合 → 前回の handoff が未完了。build-log.md 等から文脈復元し、handoff スキルの生成を促す
2. `docs/tasks.json` の未完了タスク（`"passes": false`）を確認
3. `docs/working/` 内の各 `<group>/plan.md` を読み未完了タスクの文脈を復元
4. **Smoke Test**: Dev コマンドが定義されており実装が存在する場合のみ実行（コードなし・APIのみ・CLIはスキップ）。ビルドエラーは修復を優先
5. **`.env` の状態確認**：`.opencode/instructions/stack-setup/_env-gitignore.md` が存在し「設定ファイルの自動展開レベル」が「自動展開」または「確認付き展開」ならその指示に従う。なければ `.env.example` のキー一覧を空値で `.env` にコピーし、人間に値入力を促す。値を推測・自動生成しない。
6. Current Task と `.opencode/project-context.md` の「現在のタスク」を現在の状態に更新する
7. **Plugin 正常性チェック**: `.opencode/plugins/*.ts` が存在しプロジェクト名が埋まっているのに `bun` 未インストールの場合 → インストールを提案
8. **月次診断期限チェック**: `docs/quality-scorecard.md` の最終診断日が30日以上前（または不存在）なら診断実施を提案

**セッション中**：
- 要件変更の検出と反映：人間が目標変更を示した場合、または指示が `docs/project-definition.md` の Must/Won't と矛盾する場合、`.opencode/instructions/requirements-change.md` の手順に従う。変更の適用は必ず人間の承認を得てから行う

**セッション終了時**：`handoff.ts` Plugin が `session.idle`（30分デバウンス + noReply）で trigger file を書き込み AI に handoff 生成を依頼する。明示的な終了時は handoff スキルが complete handoff を生成し Build Log に追記する。`<!-- HANDOFF_FILLED -->` があれば Plugin は発火しない（重複防止）。

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
 所感：[変更の意図と影響を技術知識の有無にかかわらず理解できる平易な日本語で1〜2文]
```

<!-- decisions/ テンプレート：.opencode/standards/tech-decision.md.template -->
<!-- 保存先：decisions/[連番]-[内容を表すslug].md -->
