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
 質問は1つずつ。私が答えるまで次に進まないでください。
 記入完了後、.claude/project-context.md の記入も案内してください。」
-->

[プロジェクト名]：[何のためのプロジェクトか1〜2文。技術スタックとバージョンも含める]

## Commands

<!-- エージェントが実行すべきコマンドを完全な形で書く -->
- Install: `pnpm install`
- Dev: `pnpm dev`
- Build: `pnpm build`
- Type check: `pnpm typecheck`
- Lint: `pnpm lint`
- Test: `pnpm test`
- Test (single file): `pnpm test -- [ファイルパス]`
- Deploy: [デプロイコマンド。未定の場合は空欄]

## Architecture

詳細は `ARCHITECTURE.md` を参照。
UIデザイン仕様は `DESIGN.md` を参照。（UIなしプロジェクトはこの行を削除）

依存の方向（変更禁止）：[層A] → [層B] → [層C]

## Code Style

詳細は `.claude/coding-conventions.md` を参照。

- ディレクトリ名：kebab-case
- コンポーネント：PascalCase.tsx
- hooks：camelCase.ts（use prefix必須）
- 定数：UPPER_SNAKE_CASE（constants/に定義）

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
→ `@evaluator` でQA評価。PASS → 次のスプリントへ。FAIL → 修正して再評価

**調査が必要なとき**（影響範囲・原因調査）：
→ `@codebase-investigator` を呼び出す（メインのコンテキストを汚さない）


**認証・認可・機密データ・入力バリデーションを実装したとき**：
→ Report Format の後に必ず `@security-auditor` を呼び出す

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
