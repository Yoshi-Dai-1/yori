# OpenCode 公式仕様との準拠性監査

監査日: 2026-07-02
対象: https://opencode.ai/docs/（Plugins, SDK, Skills, Agents, Config, Rules, Tools）

## 監査範囲

handoff 再設計（2026-07-01 完了）の全要素が公式仕様に準拠するか検証。

## 確認済み：準拠している設計要素

### Plugin イベント `session.idle`
- 公式 Plugins の events 一覧に `session.idle` が Session Event として記載
- Notification 例が `event.type === "session.idle"` をそのまま使用
- 30分デバウンスはランタイム上の工夫であり、仕様違反ではない

### `client.session.prompt({ noReply: true })`
- SDK の `session.prompt` 項で `body.noReply: true` は "Inject context without triggering AI response (useful for plugins)" と明記
- ユースケース・文言ともに設計と完全一致

### Plugin `event` hook パターン
- Notification 例と同一: `event: async ({ event }) => { if (event.type === "session.idle") {`

### Skill 設定
- 名前 `handoff`: `^[a-z0-9]+(-[a-z0-9]+)*$` に適合
- 配置: `.opencode/skills/handoff/SKILL.md` — 公式 discovery パスと一致
- Frontmatter: `name` + `description` required 項目を両方満たす

### Plugin 配置
- `.opencode/plugins/handoff.ts` — 公式の自動ロードディレクトリ

### AGENTS.md
- Rules 項でプロジェクトルートの `AGENTS.md` が永続コンテキストとして読み込まれる仕様 — 設計と合致

### `todowrite` ツール
- Tools 項でプライマリエージェントのデフォルト利用可。サブエージェントではデフォルト無効（注記あり）

### `Bun.write` / Bun ランタイム
- OpenCode は Bun 上で動作。Plugin の `$`（Shell API）およびグローバル `Bun` は利用可能

## 未確認（設計では前提・公式 Docs に記載なし）

### Plugin `event` ペイロードの形状

**問題**: Plugin の `event` hook に渡されるオブジェクトに `event.sessionId`（または session 情報）が含まれるか、公式 Docs に明記がない。

| 項目 | 状況 |
|------|------|
| SDK `event.subscribe()` | `event.type`, `event.properties` があることを示唆するが、Plugin hook と同じ構造か不明 |
| Plugin Notification 例 | `event.type` のみ使用。`event` の他のプロパティに言及なし |
| handoff.ts の前提 | `event.sessionId` で current session を取得することを前提 |

**影響**: `session.id` が取得できない場合、`client.session.prompt()` に path を渡せず、handoff 注入が不可能になる。

**回避策案**（優先順）:
1. `event` に sessionId が含まれている → 想定通り動作
2. 含まれていない場合 → Plugin の async function コンテキストから sessionId を取得する別手段を調査:
   - `project` パラメータから session 情報が取れるか
   - `client.session.list()` など SDK API で sessionId を間接取得
3. 上記も不可能の場合 → トリガーファイル書き込みのみ実施し、Skill 側のみに依存

**備考**: SDK の型定義（`@opencode-ai/plugin` パッケージ）を確認すれば `event` の型が分かる可能性がある。ただし yori はテンプレート配布プロジェクトであり、実機検証が確実。

## 推奨 Next Step

実機検証で未確認項目を確認:
1. `session.idle` の発火タイミングと頻度
2. Plugin `event` オブジェクトに `sessionId` が含まれるか
3. `noReply` 注入が正しく動作するか
4. 子セッションの `session.idle` が親 Plugin に到達するか
