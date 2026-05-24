# AGENTS.md

<!-- 推奨行数：60〜100行（コメント行・空行を除いたコンテンツ行数）-->
<!-- このファイルはAIエージェントが自動で読み込む「作業指示書」-->
<!-- 詳細ドキュメントへの参照を書く。詳細をここに書かない（段階的開示）-->

## Project Overview

<!-- 記入方法：以下のプロンプトをAIに渡す
「AGENTS.md の Project Overview と Commands を記入してください。
 docs/project-definition.md と ARCHITECTURE.md を参照しながら、
 以下を1つずつ質問して埋めてください：
 1. プロジェクト名と目的（1〜2文）
 2. 技術スタックとバージョン
 3. 実行コマンド（install/dev/build/typecheck/lint/test）
 4. 依存の方向（ARCHITECTURE.mdから転記）
 5. 現在取り組んでいるタスク
 6. 設定ファイルの自動展開レベル（以下の3択から選んでください）：
    1. 自動展開：言語確定時に設定ファイルを確認なしで自動作成する（デフォルト・初心者〜標準）
    2. 確認付き展開：すべての設定ファイル作成前に内容を説明し、承認を得てから作成する（上級者向け）
    3. 展開なし：設定ファイルはすべて自分で管理する。AIは提案のみ行い作成はしない（上級者・独自構成あり）
    選択後、.claude/project-context.md の「未設定」を選択した値に書き換える。
 質問は1つずつ。私が答えるまで次に進まないでください。」
-->

[プロジェクト名]：[何のためのプロジェクトか1〜2文。技術スタックとバージョンも含める]

## Commands

<!-- エージェントが実行すべきコマンドを完全な形で書く -->
<!-- 言語・ツールに合わせて書き換える（ARCHITECTURE.md 記入後に stack-setup.md が補完する） -->
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
UIデザイン仕様は `DESIGN.md` を参照。（UIなしプロジェクトはこの行を削除）

依存の方向（変更禁止）：[層A] → [層B] → [層C]

## Code Style

詳細は `.claude/coding-conventions.md` を参照。
<!-- 言語・フレームワークに合わせて書き換える。不要な行は削除する -->
- ディレクトリ名：[例: kebab-case / snake_case]
- クラス・型名：[例: PascalCase]
- 関数・変数名：[例: camelCase（JS/TS）/ snake_case（Python/Go/Rust）]
- 定数：[例: UPPER_SNAKE_CASE]
- ファイル名：[例: kebab-case.ts / snake_case.py / PascalCase.tsx]

## Boundaries（禁止事項）

<!-- 最重要。省略しない -->
<!-- 実装テンプレート：.claude/standards/principles/security-implementation.md -->
<!-- 優先度・投資判断に迷ったとき：.claude/standards/principles/risk-based-approach.md -->
<!-- コード品質の基準：.claude/standards/principles/code-quality.md -->
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

## コミット実行（Commit Execution）

セッション開始時に `ARCHITECTURE.md` の「開発プロセス」セクションを読み、
「コミット実行」設定を確認する。
設定がない場合・セクションが存在しない場合は「AI が提案・人間が実行」として動作する。

コミットメッセージの型・形式は `.claude/standards/principles/naming-conventions.md` の
「コミットメッセージ（Conventional Commits）」セクションに従う。AI が常に生成する。

実行するコマンド（ステージングとコミットを一括で行う）：
```
git add -A && git commit -m "[生成したメッセージ]"
```
`.env*` ファイルは `git add -A` に含めない（pre-commit フックが検出するが二重の保護として）。

### 設定：「AI が自律実行」の場合

コミットのタイミング（上から順に確認し、最初に該当した条件を使う）：

1. **TDD フローが完了した直後**
   `tdd-with-ai.md` の Step 8 に従う。これが最優先。
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

<!-- 判断基準：.claude/standards/principles/network-resilience.md -->
<!-- 常駐ルール：.claude/rules/network-resilience.md -->
- 外部API・DB・内部サービスへの通信を実装するとき → 接続タイムアウトと読み取りタイムアウトの両方を設定する
- タイムアウト値・リトライ回数などの設定値をコードに直書きしない（constants/ に定数として定義する）
- 冪等でない操作（決済・メール送信・SMS送信・通知送信）にタイムアウト後のリトライを設定しない
- 通信設計の採否（タイムアウト・リトライ・冪等性・サーキットブレーカー・プーリング）を ARCHITECTURE.md の「通信設計」セクションに記録する
<!-- このプロジェクト固有の通信制約（@resilience-checker が自動追記） -->

## Security Boundaries

<!-- 判断基準：.claude/standards/principles/security-requirements.md / 常駐ルール：.claude/rules/security.md -->

- 認証・決済・個人情報・外部APIの実装依頼を受けたとき → 実装前に `@security-auditor` を呼び出す
- 認証・認可・機密データ・入力バリデーションを実装したとき → 完了後に `@security-auditor` を呼び出す
- 外部入力を受け取るエンドポイントを実装したとき → バックエンドバリデーションを確認する
- 環境変数を追加したとき → `.env.example` に反映しシークレットスキャンを実行する
- package.json / requirements.txt / requirements-dev.txt / pyproject.toml / go.mod / Cargo.toml / pom.xml / build.gradle / build.gradle.kts / Gemfile / composer.json / pubspec.yaml / *.csproj / packages.config を編集したとき → rules/security.md の言語別コマンド対応表に従いauditを実行する。対応表にない言語の場合は人間に確認を促す
<!-- このプロジェクト固有の制約（@security-auditor が自動追記）-->

## TDD Cycle

詳細は `.claude/standards/principles/tdd-with-ai.md` を参照。
実装完了後の確認順序（型チェック → lint → テスト → @code-reviewer → 人間レビュー）も同ファイルに定義。

**TDDサイクルのStep2（テストコードの生成）**：
→ `@test-generator` を呼び出す

**バグを修正するとき**：
→ 修正の前に、バグを再現するテストを先に書く。`@test-generator` を呼び出す

## Subagents

<!-- [プロジェクト名]・依存の方向・Taking on がプレースホルダーのままなら、このセクションを無視しARCHITECTURE.mdの記入を先に促す -->

**仕様が1〜4文の実装依頼 かつ 複数ファイル・複数機能が必要なとき**：
→ `@planner` を呼び出し docs/spec.md と docs/features.json を作成する

**各スプリント開始前**：
→ `@evaluator` に Sprint Contract レビューを依頼する（承認まで繰り返す）
  `passes` フィールドは **Evaluator のみ** が更新する

**スプリント完了後**：
→ `@evaluator` でQA評価。PASS → 次のスプリントへ。FAIL → 修正して再評価。セキュリティ関連の実装が含まれる場合は rules/security.md のスプリント完了後トリガーに従う

**調査が必要なとき**（影響範囲・原因調査）：
→ `@codebase-investigator` を呼び出す（メインのコンテキストを汚さない）
**本番環境が稼働中のコードを変更するとき**：
→ 変更前に `.claude/skills/live-operation/` の Pre-Change Checklist を実行する

## Current Task

<!-- 毎セッション開始時に更新する。.claude/project-context.md の「現在のタスク」も同じ内容に合わせて更新する -->
**Taking on**: [取り組んでいる機能]
**Done**: [完了部分]
**Next**: [次にやること]

## Session Protocol

**セッション開始時**：
1. `.claude/handoff-artifact.md` が存在する場合 → 読んで前のセッションの文脈を復元する
   `## Security Status` セクションを確認し、未対応のセキュリティ要件がある場合は最初に報告する
   存在しない場合 → `AGENTS.md` と `ARCHITECTURE.md` を読み、Current Task を確認する
2. `docs/features.json` が存在する場合、未完了フィーチャー（`"passes": false`）を確認する
3. **Smoke Test**：Dev コマンドが定義されており実装が存在する場合のみ実行する
   （コードなし・APIのみ・CLIはスキップ。代わりにテストコマンドを使う）
   → ビルドエラー・基本機能が壊れている場合は修復を優先する
4. Current Task と `.claude/project-context.md` の「現在のタスク」を現在の状態に更新する

**セッション終了時**：`Stop` イベントのHook（`.claude/hooks/on-stop.generate-handoff.sh`）が
`.claude/handoff-artifact.md` のテンプレートを自動生成し、`docs/build-log.md` に日付行を追記する。
作業内容を確実に引き継ぐには handoff スキルを使う（`@handoff` または「今日はここまで」と伝える）。

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

<!-- decisions/ テンプレート：.claude/standards/tech-decision.md.template -->
<!-- 保存先：decisions/[連番]-[内容を表すslug].md -->
