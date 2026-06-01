# Session Context

<!-- セッション終了時に上書き更新する（追記しない）。
     前回の履歴は git log で参照可能。 -->

## 今回の変更（2026-06-01）

| ファイル | 内容 |
|---------|------|
| `principles/project-definition-guide.md:225` | Step 5: 提案→自律判断＋実行。定義完了後、AIがフローチャートを読みプロジェクト内容から自律的にアーキテクチャを選定する |
| `principles/production-deployment.md:194-198` | 「AIが1ヶ月後にも読める粒度」→4基準に具体化（完全コマンド・期待出力明記・フォールバック・委ね表現禁止）。「など」「または」の扱いを3版で修正 |
| `setup-harness.sh` 実機テスト | 21principles + 13architectures コピー、path書換え（bare→フルパス）を確認。全件正常 |
| `.design-notes/session-context.md` | 追記設計→更新設計に修正 |
| `.design-notes/session-context-protocol.md` | 新規作成。追記再発時の検証計画とフェイルオーバーを記録 |
| `.design-notes/session-context.md` 冒頭コメント | 上書きルールを明記。次回以降のセッションで検証 |
| `AGENTS.md:77` | Session Protocol Step 2: 「README.mdの構成セクションを確認し構造を把握」→「参照可能にする（全482行、必要時に読む）。構造はAGENTS.mdで把握済み」に修正 |
| `README.md` 構成セクション | 3ヶ所のズレを修正: .design-notes/（3ファイルに拡充）、decisions/（3ADR追加）、.opencode/usage/（新規追加） |

## 現在の設計判断

- **アーキテクチャ選定はAIが自律判断する**: 定義完了時点でAIはプロジェクト全容を把握しており、人間が「選んで」と指示する必要はない。Step 5 でフローチャートを読み、自律的に判断し結果を提示する
- **session-context.md は常に上書き**: 履歴ではなく現在の文脈スナップショット。履歴は git で追う
- **「など」の適否は機能ベース**: 開集合としての「など」は、機能カテゴリを定義している場合は正当。単なる曖昧さ回避の「など」は禁止

## 残タスク

| タスク | 状態 |
|-------|------|
| `session.deleted` 実機テスト | 継続保留（opencode Plugin ランタイムが必要。初回リリース後に確認） |
