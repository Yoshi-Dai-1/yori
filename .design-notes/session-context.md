# Session Context

## Goal
yori の Session Protocol 改善：既存プロジェクト対応、SSoT 常時読込、要件変更検出。

## Changes Made

### AGENTS.md Session Protocol 改善
- Step 1 修正：handoff-artifact.md が存在する場合でも ARCHITECTURE.md + project-definition.md を常に読む（else 分岐削除）
- セッション中セクション追加：要件変更検出ルール（Must/Won't 矛盾検出 + 承認ゲート）

### requirements-change.md（新規 instruction）
- 自律検出（明示的変更発言 or Must/Won't 矛盾）→ 人間承認ゲート → 波及チェック → decisions/ 記録
- 自律更新許可リスト（ディレクトリ構成/Current Task/project-context の同期）
- 適用範囲外の定義（バグ修正・リファクタリング等）

### その他
- directory-structure.md の参照パス修正（ARCHITECTURE.md の「## ディレクトリ構成」セクション）
- project-context.md.template の古いコメント削除
- ARCHITECTURE.md.template に「## ディレクトリ構成」セクション追加（SSoT）
- README Features テーブルの Instructions 数量 9→10 に修正

### 検討・却下した選択肢
- プロトコル検出 Plugin → 却下（harness-health の編集頻度監視で代替）
- cli-first との競合解決を rule-injector タイミング変更で → 却下（Step 0 で解決）
- ARCHITECTURE.md に「現状→目標」欄 → 却下（選択A：目標のみ）

## Open Questions
- (none)

## Next Session
- opencode/principles/harness-engineering.md に requirements-change.md を明示追記するか検討
