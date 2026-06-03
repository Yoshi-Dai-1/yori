# Session Context

<!-- セッション終了時に上書き更新する（追記しない）。
     前回の履歴は git log で参照可能。 -->

## 今回の変更（2026-06-02）

Qiita記事（@dropscar「OpenCodeを使ったAIハーネスのための最初の一歩」）に基づく評価と修正。

| ファイル | 内容 |
|---------|------|
| `principles/` (21 files) + `architectures/` (13 files) | P0-1: 参照パスを `.opencode/standards/principles/xxx.md` 形式に統一 |
| `setup-harness.sh` | P0-1: sed 書換え削除（不要化）、stale reference 検証に置換 |
| `snippets/agents/AGENTS.md` | P0-4: Session Protocol Step 4（`.env` 確認）追加。AI は `.env` の値を推測しない |
| `snippets/.opencode/plugins/harness-health.ts` | **P0-3 新設→v2撤回→v3採用**: global pool 方式を撤回、per-session sliding window + TTL cleanup 方式に変更。サブエージェント・並列セッションを分離 |
| `.design-notes/subagent-session.md` | 新規: サブエージェントの sessionID 仕様に関する仮定と検証方法を記録 |
| `snippets/.opencode/plugins/secrets-guard.ts` | P1-1: `secret-patterns.json` SSoT ベースで書き換え |
| `snippets/.opencode/plugins/lint-and-typecheck.ts` | P1-2: PM 検出を init 時キャッシュ、mypy スコープを単一ファイルに |
| `snippets/.opencode/plugins/arch-diag.ts` | P1-3: `client.tui.showToast` + `client.session.prompt` パターンに統一 |
| `snippets/.opencode/plugins/doc-links.ts` | P1-3: 同上 |
| `snippets/.opencode/plugins/README.md` | 8 Plugin への更新、Python mypy の動作変更を反映 |
| `snippets/.opencode/config/secret-patterns.json` | P1-1 新規: 12 file patterns + 16 content patterns |
| `snippets/.opencode/config/skills.lock.yaml` | P1-4 新規: 外部スキルのコミットハッシュ固定 |
| `setup-harness.sh` | P1-1: config ディレクトリコピー追加、P1-4: skills.lock.yaml 読み込み、P1-5: standards/ のマージコピー（.local/ 機構） |
| `setup-harness.sh` | P0-1: sed 書換えを差分検出（.local/ 上書き）に変更 |
| `README.md` | 構成図に `harness-health.ts` / `config/` 追加、各 Plugin の修正マーク更新 |

## 現在の設計判断

- **アーキテクチャ選定はAIが自律判断する**: 定義完了時点でAIはプロジェクト全容を把握しており、人間が「選んで」と指示する必要はない。Step 5 でフローチャートを読み、自律的に判断し結果を提示する
- **session-context.md は常に上書き**: 履歴ではなく現在の文脈スナップショット。履歴は git で追う
- **「など」の適否は機能ベース**: 開集合としての「など」は、機能カテゴリを定義している場合は正当。単なる曖昧さ回避の「など」は禁止
- **Context Anxiety 検知は per-session sliding window 方式**: セッション毎に独立した sliding window。サブエージェント・並列セッションを分離して追跡。TTL=30分で stale session を自動クリーンアップ（セッション境界検知に依存しない）
- **Plugin が AI に通知するパターン**: 警告は Toast + `client.session.prompt` で AI に通知するが、通知内容は「トリガー時点の事実」のみ。AI の記憶喪失に影響されないよう、毎回完全な文脈を含める
- **.env の値は人間が入力する**: AI は `.env` の値を推測・生成しない。機密情報の判断は人間のみが行う

## 残タスク

| タスク | 状態 |
|-------|------|
| `session.deleted` 実機テスト | 継続保留（opencode Plugin ランタイムが必要。初回リリース後に確認） |
| `harness-health.ts` の `session.idle` イベント動作 | 未検証（OpenCode 依存）。Plugin ランタイム実機テスト時に確認 |
| サブエージェントの sessionID 仕様 | 未検証（per-session 方式の前提）。詳細は `.design-notes/subagent-session.md` |
| P0-2（Plugin 自動有効化の明示化） | 対象外（ユーザー指示） |
| P0-5（handoff.ts `session.deleted` 実機テスト） | 対象外（ユーザー指示） |
| P2/P3 系 | 対象外（ユーザー指示により記録も不要） |
