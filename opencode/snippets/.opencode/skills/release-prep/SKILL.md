---
name: release-prep
description: |
  This skill should be used when preparing for a production release.
  Use this skill whenever the user says: 「本番に出したい」「公開したい」「リリースしたい」
  「ユーザーに使ってもらいたい」「デプロイしたい」「本番環境に上げたい」
  Make sure to use this skill even when the codebase is not fully ready —
  this skill identifies what is missing before going live.
  Do NOT use after release (use live-operation instead).
  Do NOT use for development-only deployments with no real users.
  優先順位：Security（即死系・省略不可）> The Twelve-Factor App > チェックリスト完了 > 新機能停止
---

<!-- template-version: 1.0.0, template-status: active -->

## When to Use

このスキルを使うべきタイミング：
- 初めて本番環境にデプロイするとき
- 大きな機能追加後のリリース準備
- 「本番に出したい」「デプロイしたい」と伝えられたとき

このスキルを使わないタイミング：
- 本番リリース後の変更（→ live-operation を使う）
- 開発専用環境へのデプロイ（実ユーザーがいない場合）

## Workflow

**開始前の確認（必須）**
新機能の追加を停止する。このSkillが参照されている間、
新機能の要求を受けた場合は「リリース後に対応」と提案し、`.opencode/project-context.md` の「現在のタスク」に Next として記録する。
「機能が動く」と「本番で安全に動かせる」は別のことである。

1. **未対応項目の列挙**
   `.opencode/standards/principles/production-readiness.md` を読んで
   未対応の必須項目をすべて列挙する。人間に報告して優先順位を確認する。

1.5 **バージョニングと CHANGELOG の準備**

   ARCHITECTURE.md の「開発プロセス」セクションを read_file で読んで以下を実行する。
   「開発プロセス」セクションが存在しない場合は ARCHITECTURE.md の記入が未完了なので、完了させるよう人間に伝える。

   **SemVer の適用判断：**

   ARCHITECTURE.md の「バージョニング：SemVer 採用」を確認する。
   - 「SemVer 採用」→ 以下のバージョン番号決定ロジックを実行する
   - 「なし」または「管理しない」→ このステップを完全にスキップする

   **バージョン番号の決定（SemVer 採用の場合のみ）：**
   （仕様：semver.org。改訂確認は `Semantic Versioning specification [現在年]` で行う）

   Step 1：過去のリリースタグを確認する
   ```
   git tag --sort=-version:refname | head -5
   ```
   タグが1件も存在しない（初回リリース）場合：
   以下の1つの質問を人間に提示する：
   ```
   「今回のリリースは安定版（本番運用できる状態）ですか？
    → はい：v1.0.0 からスタートします
    → いいえ（まだ実験段階）：v0.1.0 からスタートします」
   ```
   人間が回答したら提示されたバージョン番号を採用する。

   Step 2：前回タグ以降のコミットを確認する（初回以外）
   ```
   git log [前回タグ]..HEAD --oneline
   ```
   以下のルールを上から順に適用し、最初に該当したルールを使う：
   - コミットメッセージに `BREAKING CHANGE:` または `!:` が含まれる → MAJOR を +1、MINOR と PATCH を 0 にリセット
   - コミットメッセージに `feat:` が含まれる → MINOR を +1、PATCH を 0 にリセット
   - それ以外（fix: / docs: / chore: 等のみ） → PATCH を +1
   決定したバージョン番号を人間に提示して確認を取る。

   **CHANGELOG の確認と更新（ARCHITECTURE.md に「CHANGELOG：管理する」の記載がある場合）：**

   Step 1：プロジェクトルートに CHANGELOG.md が存在するか確認する
   存在しない場合 → 以下の形式で新規作成する
   （形式の根拠：keepachangelog.com。改訂確認は `Keep a Changelog [現在年]` で行う）：
   ```markdown
   # Changelog

   すべての主要な変更はこのファイルに記録する。

   ## [Unreleased]

   ## [バージョン番号] - YYYY-MM-DD
   ### Added
   - [このリリースで追加した機能]
   ### Fixed
   - [このリリースで修正したバグ]
   ### Security
   - [セキュリティ関連の変更（ない場合はこの行ごと削除）]
   ```

   存在する場合 → read_file で読み込んで以下を実行する：
   - `## [Unreleased]` セクションが空の場合：git log から Added / Fixed の内容を生成して記入する
   - `## [Unreleased]` セクションに内容がある場合：その内容をそのまま使う
   - `## [Unreleased]` を `## [バージョン番号] - YYYY-MM-DD` に書き換える
   - 先頭に空の `## [Unreleased]` セクションを追加する（次のリリースに向けて）
   - write_file で保存する

2. **セキュリティ対応**（必須・省略不可）
   `.opencode/standards/principles/security-implementation.md` を使って
   認証・認可・入力バリデーション・エラーハンドリングを確認・実装する。
   完了後 `@security-auditor` を呼び出す。

3. **The Twelve-Factor App 適用**
   `.opencode/standards/principles/production-deployment.md` を参照する。

4. **docs/operations.md の作成**
   デプロイ方法・ロールバック手順・障害対応手順をAIと対話しながら記入する。
   本番リリース前までに完成させる。

5. **最終確認**
   `.opencode/standards/principles/production-readiness.md` の必須項目がすべて完了したら `@resilience-checker` を呼び出す。

## 優先判断

迷ったとき：`.opencode/standards/principles/risk-based-approach.md` のリスク4象限を参照する。
「即死系」（セキュリティ・法的要件）は妥協しない。

## Output Format

```
## リリース準備状況レポート

### 未対応の必須項目
- [ ] [項目名]：[対応内容]

### 完了済み項目
- [x] [項目名]

### 次に着手すべき項目
[優先度順に1つ提示]
```
