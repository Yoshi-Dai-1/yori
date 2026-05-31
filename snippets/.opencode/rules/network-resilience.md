---
paths:
  - "**/*.ts"
  - "**/*.tsx"
  - "**/*.js"
  - "**/*.jsx"
  - "**/*.py"
  - "**/*.go"
  - "**/*.rs"
  - "**/*.java"
  - "**/*.kt"
  - "**/*.c"
  - "**/*.cpp"
  - "**/*.cs"
  - "**/*.rb"
  - "**/*.swift"
  - "**/*.php"
  - "ARCHITECTURE.md"
  - "docs/project-definition.md"
---

# 通信設計常駐ルール（Network Resilience Rules）

このファイルはコードファイルおよび設計ファイルの編集のたびに自動リロードされる。
AGENTS.md のコンテキスト消失後も、このルールが常に通信設計の判断を補完する。

詳細な判断基準・実装手順・例外対応は以下を参照（必要時に読む）：
- `.opencode/standards/principles/network-resilience.md`

---

## 自律トリガー（人間の指示を待たずに実行する）

各トリガーの詳細手順は対応するサブファイルを読んで実行する：

| トリガー | 参照先 |
|---------|--------|
| ARCHITECTURE.md 作成・更新時（採否判断） | `.opencode/rules/network-resilience/_trigger-arch.md` |
| ARCHITECTURE.md の「通信設計」が未記入のまま実装フェーズに入ったとき | `.opencode/rules/network-resilience/_trigger-implementation-phase.md` |

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
  → `.opencode/standards/principles/ssot-and-constants.md` の原則に従い constants/ に定義する

チェック3：冪等でない操作にリトライが設定されているか
  → 決済・メール送信・SMS送信・プッシュ通知送信のコードに
    タイムアウト後のリトライが設定されている場合は実装を止めて通知する：
    「この操作は冪等でないため、単純なリトライを設定すると二重処理になります。
     network-resilience.md の冪等性の確保を先に実装します。」

---

## 常駐禁止事項（セッション中いつでも適用）

AGENTS.md の記憶が薄れても以下は常に有効：

- 外部通信（HTTP・DB・API）にタイムアウトを設定せずにコードを書かない
- タイムアウト値・リトライ回数などの設定値をコードに直接書かない（constants/ に定義する）
- 冪等でない操作（決済・メール送信・SMS送信・通知送信）にタイムアウト後のリトライを設定しない
- 通信設計の採否が ARCHITECTURE.md に記録されていない状態で通信コードを本番に適用しない

---

## 情報源の通知フォーマット（必須）
→ `.opencode/rules/_shared/_info-source-format.md` を読む

## WebSocket・GraphQL実装時の自律チェック
→ `.opencode/rules/network-resilience/_ws-graphql.md` を読む
