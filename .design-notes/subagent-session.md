# サブエージェントの sessionID 仕様（未検証）

`harness-health.ts` を per-session sliding window 方式に移行するにあたり、
以下の仮定を置いている。実機検証が必要。

## 仮定

### 1. サブエージェントは独立した sessionID を持つ

- 根拠: `principles/subagents.md:5`「メインエージェントとは独立したコンテキストウィンドウで動作する」
- 推定: OpenCode 内部で各 spawned task = new session として実装されているはず
- 未検証: 実際の OpenCode Plugin イベントで `input.sessionID` を確認していない

### 2. `input.sessionID` はサブエージェント自身の ID を返す

- 親エージェントの sessionID ではない
- 推定: OpenCode の標準パターン（タスク単位で session を切替）
- 未検証

### 3. `client.session.prompt` の通知は対象 session のコンテキストに届く

- サブエージェントへの通知はサブエージェント自身が見る
- 親エージェントは通常サブエージェントの中間コンテキストを見ない
- 親が警告を知るには、サブエージェントの結果として親に伝わる必要がある
- 未検証

### 4. 複数並列サブエージェントはそれぞれ一意の sessionID を持つ

- sessionID の衝突は起きない
- 未検証

### 5. SESSION_TTL_MS = 30分 は妥当な値

- 30分以上無操作のセッションは「stale」とみなして Map から削除
- 短すぎる: 長時間作業中のセッションが誤って削除される
- 長すぎる: メモリ使用量が増える
- 妥当な値: 15-60分の範囲で要調整
- 根拠: AI エージェントの連続稼働は通常 30 分以内という前提

### 6. `input.sessionID` はほぼ全てのイベントで存在する

- 4 つの既存 Plugin（harness-health, lint-and-typecheck, arch-diag, doc-links）が
  全て `if (!sessionId) return` パターンを採用している
- これは「sessionID が存在しない場合はスキップする」防御的設計
- つまり sessionID 欠落は稀だが、起きる可能性はある
- **対応**: 仮定が崩れた場合、per-session 方式では該当イベントがカウントされなくなる
  - 既存 Plugin と同じ「スキップ」挙動で統一

## 検証方法

OpenCode ランタイムで以下を確認:

1. サブエージェントを spawn する
2. サブエージェント内で edit イベントを発火
3. Plugin ログで `input.sessionID` を確認
4. 期待値: サブエージェント独自の ID（親と異なる）
5. 期待値: 複数並列サブエージェントで ID が異なる

検証結果は本ファイルに `## 検証結果` セクションを追加して記録する。

## 最悪ケースの分析

| 仮定の状態 | 挙動 | 影響 |
|-----------|------|------|
| 仮定1-4 すべて正しい | サブエージェント・並列セッションが完全に分離 | 理想的 |
| 仮定がすべて外れた | `input.sessionID` が常に同一（親のみ） | global pool と同等（現状と同じ） |
| 一部だけ正しい | 親と sub の一部だけ分離 | 中間的 |

**結論**: 仮定がすべて外れても、現状より悪化することはない。
最悪でも `Map<sessionId, Stats>` が 1 つのエントリだけになり、global pool と同じ挙動になる。

## 移行判断の理由

1. 現状の global pool は並列セッション・サブエージェントで誤検知する
2. per-session 方式は最悪ケースでも現状と同等
3. 実装変更は `harness-health.ts` 1 ファイルのみ
4. 既存の sliding window 設計哲学と整合（時間も session もタイムスタンプベース）

## 関連ファイル

- `snippets/.opencode/plugins/harness-health.ts`: per-session sliding window 実装
- `.design-notes/plugin-events.md`: `session.deleted` → `session.idle` + noReply への改訂経緯
- `principles/subagents.md`: サブエージェントの設計思想
