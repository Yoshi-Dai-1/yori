# Session Context

## Goal
ADR 提案の信頼性向上（A）と過去 ADR の参照改善（B）。

## Changes Made

### A: adr-prompt.ts（新規 Plugin）
- `opencode/snippets/.opencode/plugins/adr-prompt.ts`
- `tool.execute.after` + noReply、Write/Edit 3回検出で ADR 記録を促す
- 冗長発火防止（per-session flag）、UX影響ゼロ
- `plugins/README.md` に追記済み

### B: 月次診断に ADR 索引生成を追加
- `monthly-diagnosis.md` の decisions/ 確認ブロック内に `.opencode/adr-index.md` の自動生成を追加
- 各 ADR から {番号, タイトル, タグ, 要約} のテーブル形式
- AGENTS.md 非肥大化（Session Protocol は変更なし）
- 古い ADR の強制注入はしない（AI が自律的に参照するだけ）

### やらなかったこと
- B の `adr-context.ts` Plugin → 古い ADR の悪影響リスクのため中止
- B の Session Protocol 追加 → AGENTS.md 肥大化回避

### テンプレート追加（後日、ユーザー指示により実施）
- `opencode/snippets/docs/adr-index.md.template` 新規作成
- `setup-harness.sh` に `.opencode/adr-index.md` のコピー追加
- `monthly-diagnosis.md` でテンプレート参照に更新

### README 更新
- `opencode/README.md` / `opencode/README.ja.md` の「セットアップ後のプロジェクト構成」に `.opencode/adr-index.md` を追記

### 最終確認
- 全7ファイルの整合性チェック完了（孤立ファイル・Typo・矛盾・パス不整合なし）

## Open Questions
- (none)

## Next Session
- 引き続き yori の設計課題があれば着手
