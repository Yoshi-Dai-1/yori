# Session Context

<!-- セッション終了時に上書き更新する（追記しない）。
     前回の履歴は git log で参照可能。 -->

## 今回の変更（2026-06-03）

作業ディレクトリ パターンの Plugin 化完了。AGENTS.md 追記 + 2本の Plugin 新規作成。

| ファイル | 内容 |
|---------|------|
| `snippets/.opencode/plugins/working-dir-guide.ts` | **新規**: tool.execute.before で docs/working/ の Read/Write/Edit を検知し、ルールを注入 |
| `snippets/.opencode/plugins/compaction-context.ts` | **新規**: experimental.session.compacting で作業ディレクトリの状態をコンテキストに注入 |
| `snippets/agents/AGENTS.md` | Session Protocol に Step 3（docs/working/ 確認）を追加。@planner に作業ディレクトリ作成の数値基準を追記 |
| `snippets/.opencode/plugins/README.md` | working-dir-guide.ts / compaction-context.ts を追加 |
| `principles/harness-engineering.md` | plugins/ の役割記述を更新（「プロアクティブなルール注入」を追加） |

## 現在の設計判断

- **アーキテクチャ選定はAIが自律判断する**: 定義完了時点でAIはプロジェクト全容を把握しており、人間が「選んで」と指示する必要はない。Step 5 でフローチャートを読み、自律的に判断し結果を提示する
- **session-context.md は常に上書き**: 履歴ではなく現在の文脈スナップショット。履歴は git で追う
- **「など」の適否は機能ベース**: 開集合としての「など」は、機能カテゴリを定義している場合は正当。単なる曖昧さ回避の「など」は禁止
- **Context Anxiety 検知は per-session sliding window 方式**: セッション毎に独立した sliding window。サブエージェント・並列セッションを分離して追跡。TTL=30分で stale session を自動クリーンアップ（セッション境界検知に依存しない）
- **Plugin が AI に通知するパターン**: 警告は Toast + `client.session.prompt` で AI に通知するが、通知内容は「トリガー時点の事実」のみ。AI の記憶喪失に影響されないよう、毎回完全な文脈を含める
- **.env の値は人間が入力する**: AI は `.env` の値を推測・生成しない。機密情報の判断は人間のみが行う
- **作業ディレクトリは「状態分離の箱」**: タスク間の揮発的状態を分離する。並列実行はサブエージェントが担う（P1 Phase 1 では逐次実装を前提）
- **タスクアーカイブは Plugin が提案・AI が実行**: task-archive.ts は `session.idle` 検知時にアーカイブ提案のみ。ファイル移動は AI が行う（Plugin はファイル操作しない）
- **Phase 2/3 は条件充足時のみ導入**: サブエージェント sessionID 未検証・観測指標なし・マージ戦略未確立のため
- **Plugin は AI の記憶に依存しない**: working-dir-guide.ts は tool.execute.before で毎回ルールを注入。compaction-context.ts はコンパクション時に状態を維持。AGENTS.md への最小追記（+3行）は常時ロードされる参照経路として機能
- **作業ディレクトリの判断基準は数値で定義**: 「複数タスクが想定される場合」のような曖昧表現は禁止。タスク数6以上 / docs/working/ 内ディレクトリが2以上で判断

## 残タスク

| タスク | 状態 |
|-------|------|
| `working-dir-guide.ts` の `tool.execute.before` 動作 | 未検証（OpenCode 依存）。Plugin ランタイム実機テスト時に確認 |
| `compaction-context.ts` の `experimental.session.compacting` 動作 | 未検証（OpenCode 依存）。Plugin ランタイム実機テスト時に確認 |
| `session.deleted` 実機テスト | 継続保留（opencode Plugin ランタイムが必要。初回リリース後に確認） |
| `harness-health.ts` の `session.idle` イベント動作 | 未検証（OpenCode 依存）。Plugin ランタイム実機テスト時に確認 |
| `task-archive.ts` の `session.idle` イベント動作 | 未検証（OpenCode 依存）。Plugin ランタイム実機テスト時に確認 |
| サブエージェントの sessionID 仕様 | 未検証（per-session 方式の前提）。詳細は `.design-notes/subagent-session.md` |
| Phase 2 導入条件の充足確認 | 未（将来） |
| Phase 3 導入条件の充足確認 | 未（遠い将来） |
