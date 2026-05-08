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
version: 1.0.0
status: active
---

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
新機能の要求を受けた場合は「リリース後に対応」と提案し、Current TaskのNextに記録する。
「機能が動く」と「本番で安全に動かせる」は別のことである。

1. **未対応項目の列挙**
   `.claude/standards/principles/production-readiness.md` を読んで
   未対応の必須項目をすべて列挙する。人間に報告して優先順位を確認する。

2. **セキュリティ対応**（必須・省略不可）
   `.claude/standards/principles/security-implementation.md` を使って
   認証・認可・入力バリデーション・エラーハンドリングを確認・実装する。
   完了後 `@security-auditor` を呼び出す。

3. **The Twelve-Factor App 適用**
   `.claude/standards/principles/production-deployment.md` を参照する。

4. **docs/operations.md の作成**
   デプロイ方法・ロールバック手順・障害対応手順をAIと対話しながら記入する。
   本番リリース前までに完成させる。

5. **最終確認**
   production-readiness.mdの必須項目がすべて完了したら `@resilience-checker` を呼び出す。

## 優先判断

迷ったとき：`.claude/standards/principles/risk-based-approach.md` のリスク4象限を参照する。
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
