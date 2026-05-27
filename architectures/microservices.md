# アーキテクチャ：マイクロサービス

**向いている場面**：独立してデプロイ・スケールできる複数のサービスで構成するシステム
**採用パターン**：マイクロサービスアーキテクチャ

---

## このアーキテクチャを選ぶ前に確認すること

マイクロサービスはモノリスより複雑になる。以下の条件をすべて満たさない場合は
`backend-api.md`（モノリス）から始めることを強く推奨する。

```
条件1：機能ごとに独立してデプロイする必要があるか
  → 「決済だけ更新したい」「通知だけスケールしたい」という要件があるか
  → なければモノリスで十分

条件2：人間の開発者が2人以上おり、それぞれが独立したサービス（または機能モジュール）を担当して開発するか（AIエージェントはチーム数に含めない）
  → 1チームなら調整コストがかさむだけでメリットが薄い

条件3：運用チームにKubernetes・サービスメッシュの知識があるか
  → なければモノリスから始めて後で分割する方が安全

迷った場合：`backend-api.md` のモノリスで開始し、
  ボトルネックが実際に発生してから分割する。
  「将来スケールするかもしれない」だけの理由でマイクロサービスを選ばない。
```

---

## ディレクトリ構成（モノレポで複数サービスを管理する場合）

```
services/
  api-gateway/            外部からのリクエストを各サービスにルーティング
    src/
      routes/
      middleware/
      config/
    Dockerfile
    package.json

  user-service/           ユーザー管理・認証
    src/
      api/
      services/
      repositories/
      domain/
      infra/
        db/
        messaging/        サービス間通信（イベント発行）
      config/
        constants/        タイムアウト・リトライ回数・エンドポイント
    Dockerfile
    package.json

  payment-service/        決済処理
    src/
      （user-service と同じ構造）
      infra/
        messaging/
        external/         Stripe / 決済プロバイダークライアント

  notification-service/   メール・SMS・プッシュ通知
    src/
      （user-service と同じ構造）

shared/
  types/                  サービス間で共有する型定義
    events/               イベントのスキーマ定義
      user-created.event.ts
      payment-completed.event.ts
    errors/
      shared-errors.ts

infra/
  docker-compose.yml      ローカル開発環境
  k8s/                    Kubernetes マニフェスト（本番）
    deployments/
    services/
    configmaps/
```

---

## マイクロサービス固有の設計原則

### サービス間通信の設計

```
同期通信（REST / gRPC）：
  使う場面：即時レスポンスが必要な場合（ユーザー情報の取得など）
  注意点：呼び出し先のサービスが停止すると呼び出し元も影響を受ける
  → サーキットブレーカーは「必ず」実装する（network-resilience.md の判断不要）
  → タイムアウトとリトライは「必ず」実装する

非同期通信（メッセージキュー）：
  使う場面：即時レスポンスが不要な場合（注文後のメール送信など）
  ツール例：Kafka / RabbitMQ / AWS SQS / Google Pub/Sub
  注意点：メッセージの重複配信が発生する前提で設計する
  → コンシューマーを「必ず」冪等に実装する（network-resilience.md の冪等性参照）
  → 使用するメッセージキューは「[ツール名] idempotent consumer [現在年]」で検索する

gRPC を使う場合：
  実装前に「[使用言語] gRPC best practices [現在年]」を検索する
  信頼できる情報源：gRPC（grpc.io）公式ドキュメント
```

### サービス間の障害伝播を防ぐ

```
原則：1つのサービスの障害をシステム全体に波及させない（カスケード障害の防止）

サーキットブレーカーの必須設定（各サービスの infra/ に実装する）：
  → 同期通信でサービスを呼び出す箇所すべてに適用する
  → network-resilience.md の「サーキットブレーカー」の原則に従って実装する

タイムアウトは全サービス間通信に設定する（デフォルト値を禁止する）：
  → 各サービスの constants/ にタイムアウト値を定数として定義する
  → デフォルトのタイムアウトなし設定で運用しない

フォールバックの定義：
  呼び出し先サービスが応答しないとき、何を返すかを必ず定義する
  例：ユーザーサービスが停止 → キャッシュした最終既知の値を返す / エラーレスポンスを返す
  → ARCHITECTURE.md の「フォールバック設計」セクションに記録する
```

### 分散トレーシング（サービスをまたいだ問題調査のため）

```
マイクロサービスでは1つのリクエストが複数のサービスをまたぐ。
どのサービスで何が起きたかを追跡できなければ、本番障害の原因を特定できない。

実装すべきこと：
  1. 各リクエストに一意のトレースIDを付与する
  2. サービス間でトレースIDを引き継ぐ（リクエストヘッダーで伝播させる）
  3. 各サービスのログにトレースIDを含める

ツール：
  → 「distributed tracing [使用言語] [現在年]」で検索してから選定する
  信頼できる情報源：OpenTelemetry（opentelemetry.io）→ 分散トレーシングの標準
```

### APIゲートウェイの役割を明確にする

```
APIゲートウェイが担う責務（ARCHITECTURE.md に記録する）：
  ルーティング：外部リクエストを適切なサービスに転送する
  認証：JWTの検証はゲートウェイで一元管理する（各サービスで重複実装しない）
  レートリミット：外部からの大量リクエストをゲートウェイでブロックする
  SSLターミネーション：HTTPSはゲートウェイで終端する

APIゲートウェイが担わない責務：
  ビジネスロジック：各サービスに委譲する
  DB操作：各サービスに委譲する
```

### データの独立性（各サービスが自分のDBを持つ）

```
原則：サービス間でDBを共有しない
  共有すると：スキーマ変更が他サービスに影響する・スケーリングができない

各サービスが持つDB：
  user-service     → usersテーブル
  payment-service  → paymentsテーブル（usersテーブルを直接参照しない）
  → サービスをまたぐデータ参照はAPIで行う

データの結合が必要な場合：
  → イベント駆動で各サービスが必要なデータのコピーを持つ（CQRS / イベントソーシング）
  → 「CQRS event sourcing」で検索してパターンを確認する
     （アーキテクチャパターン自体は普遍のため[現在年]不要。使用ライブラリのAPIは別途確認する）
```

---

## 信頼できる情報源（実装前に検索する）

URLは変更される可能性があるため、組織名・ドメインで判断する。

```
設計パターン：
  Martin Fowler（martinfowler.com）→ マイクロサービスパターンの原典
    → サービス分割・サーキットブレーカー・Strangler Fig パターン等

通信プロトコル：
  gRPC（grpc.io）→ サービス間同期通信の実装
  OpenTelemetry（opentelemetry.io）→ 分散トレーシングの標準

メッセージキュー（使用するツールに応じて選択）：
  Apache Kafka（kafka.apache.org）→ 高スループット・ログ集約向き
  RabbitMQ（rabbitmq.com）→ タスクキュー・柔軟なルーティング向き
  AWS SQS（aws.amazon.com）→ AWSを使う場合
  Google Pub/Sub（cloud.google.com）→ GCPを使う場合

コンテナ・オーケストレーション：
  Kubernetes（kubernetes.io）→ 本番環境のコンテナ管理の標準
  Google SRE Book（sre.google）→ 本番運用の信頼性設計の実践知
```

---

## ARCHITECTURE.md への追記セクション（マイクロサービス固有）

```markdown
## サービス構成

| サービス名 | 責務 | 通信方式 | DB |
|-----------|------|---------|-----|
| api-gateway | ルーティング・認証 | REST（外部受け） | なし |
| user-service | ユーザー管理 | REST（同期）/ Kafka（非同期） | PostgreSQL |
| payment-service | 決済処理 | REST（同期）/ Kafka（非同期） | PostgreSQL |

## フォールバック設計

| 呼び出し元 | 呼び出し先 | 障害時の動作 |
|-----------|----------|-----------|
| api-gateway | user-service | 503を返す |
| payment-service | user-service | キャッシュ値を返す（TTL: 60秒） |

## 分散トレーシング
- 採用ツール：[OpenTelemetry / Jaeger / その他]
- トレースIDのヘッダー名：X-Trace-ID
```
