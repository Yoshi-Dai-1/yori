# アーキテクチャ：サーバーレス（Serverless）

**向いている場面**：イベント駆動処理・APIエンドポイント・定期バッチ・Webhookハンドラー
**採用プラットフォーム例**：AWS Lambda / Cloudflare Workers / Vercel Edge Functions / Google Cloud Functions

---

## このアーキテクチャを選ぶ前に確認すること

```
条件1：処理がイベント（HTTPリクエスト・キューメッセージ・スケジュール）に応答する形か
  → 常時起動・WebSocketなど持続的接続が必要な場合は backend-api.md を選ぶ

条件2：1つの関数の最大実行時間が以下の範囲に収まるか
  AWS Lambda        → 最大15分
  Cloudflare Workers → 最大30秒（CPU時間）
  Vercel Edge Functions → 最大30秒
  → 長時間バッチ処理には backend-api.md + data-pipeline.md を選ぶ

条件3：グローバルなステートを関数間で共有しないか
  → 関数はステートレスが原則。DBやキャッシュを外部に持つ設計が必要

迷った場合：まず backend-api.md を選ぶ。
  サーバーコストの最適化や特定のイベント駆動要件が確定してから移行する。
```

---

## ディレクトリ構成

```
src/
  functions/              関数エントリポイント（1関数 = 1ファイル）
    api/                  HTTPリクエスト処理
      users.ts            GET /users, POST /users
      payments.ts         POST /payments
    events/               非同期イベント処理
      on-order-created.ts キューメッセージのハンドラー
      on-payment-completed.ts
    scheduled/            定期実行バッチ
      daily-report.ts     毎日0時実行

  shared/                 関数間で共有するコード
    services/             ビジネスロジック
      userService.ts
      paymentService.ts
    repositories/         データアクセス
      userRepository.ts
    infra/                外部依存の実装
      db/                 DBクライアント（接続プール設定含む）
        client.ts
      external/           外部APIクライアント（タイムアウト設定含む）
        stripeClient.ts
    constants/            定数（タイムアウト値・リトライ回数・設定値）
      api.constants.ts
      function.constants.ts
    errors/
      AppError.ts

  config/
    env.ts                環境変数の読み込みと型検証
```

---

## サーバーレス固有の設計原則

### コールドスタートへの対応

```
コールドスタートとは：
  関数が一定時間実行されないと、次の実行時に初期化処理が走り
  レスポンスが遅くなる現象（AWS Lambda: 数百ms〜数秒）

対策1：初期化処理をハンドラー関数の外に出す
  正しい例：DBクライアントをモジュールレベルで初期化する（再利用される）
  誤った例：DBクライアントをハンドラー内で毎回初期化する（毎回コストがかかる）

対策2：依存ライブラリのバンドルサイズを最小化する
  未使用の依存関係を含めない
  ツリーシェイキングが有効なバンドラー設定を使う

対策3：コールドスタートの許容時間をARCHITECTURE.mdの非機能要件に定義する
  ユーザー向けAPIで許容できないなら Provisioned Concurrency（AWS）等を検討する
  → 「[プラットフォーム名] cold start optimization [現在年]」で検索してから設定する
```

### 関数タイムアウトの設定

```
原則：関数全体のタイムアウトを必ず設定する（デフォルト値で運用しない）
  設定値はプラットフォームの制約とユースケースから決定する：

  HTTPエンドポイント（ユーザー向け）：
    タイムアウト値 = 期待するレスポンス時間の2〜3倍を目安にする
    例：DB + 外部API呼び出しが合計5秒以内なら → 関数タイムアウト15秒

  非同期イベント処理：
    タイムアウト値 = 処理の最大想定時間の2倍を目安にする

  定期バッチ：
    プラットフォームの上限内で最大値に近い値を設定する

  設定値は constants/ に定数として定義する（ハードコードしない）
  「[プラットフォーム名] function timeout configuration [現在年]」で検索して確認する
```

### ステートレス設計の徹底

```
関数の実行間でローカル変数・メモリ・ファイルシステムを共有できない前提で設計する。

共有が必要なデータはすべて外部に持つ：
  セッション情報 → DB / Redis（外部キャッシュ）
  ファイル       → S3 / GCS / Cloudflare R2（外部ストレージ）
  設定           → 環境変数 / シークレットマネージャー

/tmp（AWS Lambda）のような一時ストレージは
  同一実行コンテナ内でのみ再利用される可能性があるが、
  保証されないため永続データの保管に使わない
```

### 冪等性の確保（サーバーレスでは特に重要）

```
サーバーレス環境ではイベントが重複配信される可能性がある。
  AWS SQS：少なくとも1回（At-least-once）の配信を保証する → 重複が起きる
  Kafka：設定によって配信保証が変わる

すべてのイベントハンドラーは冪等に実装する：
  同じイベントを2回処理しても結果が変わらない設計にする
  → network-resilience.md の「冪等性の確保」原則に従う

具体的な実装：
  イベントIDをDBに記録して2回目以降はスキップする
  UPSERTを使う（同じデータを2回書いても1件になる）
```

### 通信設計（network-resilience.md に加えてサーバーレス固有の考慮が必要）

```
DBコネクションの管理：
  関数は並列実行されるため、コネクション数がDBの上限を超える可能性がある
  → RDS Proxy（AWS）/ PgBouncer などのコネクションプールを関数の外側に置く
  → 「[DB名] serverless connection pooling [現在年]」で検索してから設計する

外部API呼び出し：
  タイムアウトは関数全体のタイムアウトより短く設定する
  関数タイムアウト15秒 → 外部API読み取りタイムアウト10秒（余裕を持たせる）
  → network-resilience.md の実装原則に従う

リトライ：
  プラットフォームが自動リトライする設定がある場合は
  アプリケーションレベルのリトライと二重にならないよう注意する
  → 「[プラットフォーム名] retry configuration [現在年]」で確認する
```

---

## 信頼できる情報源（実装前に検索する）

URLは変更される可能性があるため、組織名・ドメインで判断する。

```
プラットフォーム公式（使用するプラットフォームのものを参照する）：
  AWS Lambda（docs.aws.amazon.com）→ Lambda 公式ドキュメント
  Cloudflare Workers（developers.cloudflare.com）→ Workers 公式ドキュメント
  Vercel（vercel.com/docs）→ Edge Functions 公式ドキュメント
  Google Cloud Functions（cloud.google.com）→ Cloud Functions 公式ドキュメント

設計パターン：
  AWS Well-Architected Serverless Lens（aws.amazon.com）
  → 「AWS Well-Architected Serverless Lens [現在年]」で検索する

コールドスタート最適化：
  使用プラットフォームの公式ドキュメント
  → 「[プラットフォーム名] cold start optimization [現在年]」で検索する

DBコネクション管理：
  使用DBの公式ドキュメント
  → 「[DB名] serverless connection pooling [現在年]」で検索する
```

---

## ARCHITECTURE.md への追記セクション（サーバーレス固有）

```markdown
## サーバーレス設計

### プラットフォーム
- 実行環境：[AWS Lambda / Cloudflare Workers / Vercel Edge Functions / Google Cloud Functions]
- ランタイム：[Node.js / Python / Go / Rust / その他]
- 最大関数タイムアウト：[秒]

### コールドスタート
- 許容するコールドスタート時間：[ms / 許容しない]
- Provisioned Concurrency：[設定する / 設定しない]（許容しない場合のみ設定する）

### ステート管理
- セッション：[DB名 / Redis / なし]
- 一時ファイル：[S3 / GCS / R2 / なし]

### DBコネクション
- コネクション管理方式：[RDS Proxy / PgBouncer / 直接接続]
- 最大コネクション数：[数値]（constants/ に定数として定義する）

### イベント配信保証
- 使用するキュー：[SQS / Kafka / Pub/Sub / なし]
- 配信保証：[At-least-once / Exactly-once]
- 重複排除方式：[イベントIDをDBに記録 / UPSERTのみ / 不要]
```
