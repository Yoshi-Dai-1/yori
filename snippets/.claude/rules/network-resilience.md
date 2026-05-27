---
paths:
  - "**/*.ts"
  - "**/*.tsx"
  - "**/*.js"
  - "**/*.py"
  - "**/*.go"
  - "**/*.rs"
  - "**/*.java"
  - "**/*.kt"
  - "**/*.c"
  - "**/*.cpp"
  - "**/*.cs"
  - "**/*.rb"
  - "ARCHITECTURE.md"
  - "docs/project-definition.md"
---

# 通信設計常駐ルール（Network Resilience Rules）

このファイルはコードファイルおよび設計ファイルの編集のたびに自動リロードされる。
AGENTS.md のコンテキスト消失後も、このルールが常に通信設計の判断を補完する。

詳細な判断基準・実装手順・例外対応は以下を参照（必要時に読む）：
- `.claude/standards/principles/network-resilience.md`

---

## 自律トリガー（人間の指示を待たずに実行する）

### ARCHITECTURE.md が作成・更新されたとき

1. `.claude/standards/principles/network-resilience.md` を読む
2. 「プロジェクト性質による採否の自律判断」の手順を実行する
3. 採否と根拠を ARCHITECTURE.md の「通信設計」セクションに記録する
4. 採用した対策の実装が必要な場合は、次のコードファイル作成時に
   network-resilience.md の実装手順に従うよう準備する
5. 判断結果のサマリーを人間に報告する

### 外部通信を含むコードファイルを作成・編集するとき

以下のいずれかのキーワードを含むコードファイルを作成・編集したとき：

| 編集内容 | 判定キーワード |
|---------|--------------|
| HTTPクライアントの実装 | fetch, axios, requests, http.client, net/http, reqwest, HttpClient |
| DBへのクエリ実行 | query, execute, findOne, findAll, SELECT, INSERT, UPDATE, DELETE |
| 外部APIの呼び出し | api_key, endpoint, baseURL, base_url, client.get, client.post |
| 非同期通信 | async, await, Promise, Future, goroutine, tokio |
| キャッシュ・メッセージキュー | redis, memcached, rabbitmq, kafka, sqs, pubsub |

チェック1：タイムアウトが設定されているか
  → コード内に `timeout` / `Timeout` / `TIMEOUT` / `connectTimeout` / `readTimeout` / `requestTimeout`
    のいずれのキーワードも含まれず、かつ外部通信（fetch/axios/requests/http.client/net/http/reqwest/HttpClient）の呼び出し箇所が存在する場合、タイムアウト未設定と判定する
  → 実装を止めて通知する:
    「このコードに接続タイムアウトと読み取りタイムアウトが設定されていません。
     network-resilience.md の原則1に従い実装します。」

チェック2：設定値（タイムアウト値・リトライ回数など）が定数として定義されているか
  → constants/ 以外の場所に2文字以上の数値リテラル（0・1・-1・2・10・100・1000を除く）が
    外部通信の設定値として直書きされている場合、定数化を指示する
  → ssot-and-constants.md の原則に従い constants/ に定義する

チェック3：冪等でない操作にリトライが設定されているか
  → 決済・メール送信・SMS送信・プッシュ通知送信のコードに
    タイムアウト後のリトライが設定されている場合は実装を止めて通知する：
    「この操作は冪等でないため、単純なリトライを設定すると二重処理になります。
     network-resilience.md の冪等性の確保を先に実装します。」

### ARCHITECTURE.md の「通信設計」セクションが未記入のまま実装フェーズに入ったとき

```
チェック1：ARCHITECTURE.md に「通信設計」セクションが存在するか
  → 存在しない場合：実装を止め、以下を人間に通知する：
    「通信設計が ARCHITECTURE.md に記録されていません。
     network-resilience.md の判断手順で採否を決定してから実装します。」

チェック2：「通信設計」セクションが記入済みか（テンプレートのままでないか）
  → テンプレートのままの場合：チェック1と同じ対応をする
```

---

## 常駐禁止事項（セッション中いつでも適用）

AGENTS.md の記憶が薄れても以下は常に有効：

- 外部通信（HTTP・DB・API）にタイムアウトを設定せずにコードを書かない
- タイムアウト値・リトライ回数などの設定値をコードに直接書かない（constants/ に定義する）
- 冪等でない操作（決済・メール送信・SMS送信・通知送信）にタイムアウト後のリトライを設定しない
- 通信設計の採否が ARCHITECTURE.md に記録されていない状態で通信コードを本番に適用しない

---

## 情報源の通知フォーマット（必須）

Webで検索した情報を提案・報告に使用した場合、必ず通知する：

```
📋 参照情報源
  - [情報源名（組織名）]：[URL]（取得日：[YYYY-MM-DD]）

⚠️ 誤りや古い内容があればご指摘ください。
   指摘は decisions/ に記録し、以降の提案に反映します。
```

Web検索で裏付けが取れなかった場合：

```
📋 参照情報源
  - AIの学習データに基づく提案（Web検索で裏付けが取れませんでした）
  - 確認を推奨：[公式サイト名と組織名]

⚠️ 情報の鮮度に限界がある可能性があります。
```

## WebSocket・GraphQL実装時の自律チェック

以下のいずれかの条件を満たすファイルを編集したとき、自律的に実行する：

**WebSocket実装を検出したとき（`WebSocket` / `socket.io` / `ws` / `useWebSocket` 等のキーワードがコードに含まれる場合）：**
- `.claude/standards/principles/network-resilience.md` の「WebSocket・リアルタイム通信の設計原則」を参照する
- 再接続戦略・Heartbeat・メッセージ順序保証が実装されているか確認する
- 問題がある場合は人間に報告してから修正案を提示する

**GraphQL実装を検出したとき（`graphql` / `gql` / `useQuery` / `useMutation` 等のキーワードがコードに含まれる場合）：**
- `.claude/standards/principles/network-resilience.md` の「GraphQL通信の設計原則」を参照する
- `.claude/standards/principles/security-implementation.md` の「GraphQLセキュリティ」を参照する
- N+1問題・クエリ深さ制限・Introspection設定が適切か確認する
- 問題がある場合は人間に報告してから修正案を提示する
