# アーキテクチャ：IaC（インフラストラクチャ as コード）

**向いている場面**：クラウドリソースの定義・プロビジョニング・構成管理
**ツール**：Terraform / OpenTofu / AWS CDK / Pulumi / Ansible / Helm

アプリコードとは別リポジトリで管理することを推奨する。
アプリコードと同一リポジトリで管理する場合は `infra/` ディレクトリに配置する。

---

## このファイルの使い方

具体的なツールが確定したら、`stack-setup.md` の Step 3.5 ブロックB・C が
ツール公式ドキュメントから固有の必須ファイルと構成を自律検索して補完する。
このファイルは「共通の設計思想」を提供し、ツール固有の詳細は自律検索で調達する。

---

## ツール選定の判断基準

ツールが未定の場合、以下の基準で選択する：

| 要件 | 推奨ツール |
|------|----------|
| マルチクラウド・宣言的定義・状態管理が必要 | Terraform / OpenTofu（OSSのTerraforクローン）|
| AWSのみ・プログラミング言語で書きたい | AWS CDK（TypeScript / Python / Java / C#）|
| マルチクラウド・プログラミング言語で書きたい | Pulumi |
| サーバー構成管理・プロビジョニング自動化 | Ansible |
| Kubernetes上のアプリデプロイ管理 | Helm |

選択後、以下を検索してツール固有の必須ファイルと推奨構成を確認する：
`[ツール名] project structure best practices [現在年]`

**Terraform / OpenTofu 以外のツールの基本思想：**

- **Pulumi**：クラウドリソースをプログラミング言語（TypeScript / Python / Go / C#）で定義する。
  Terraform との最大の違いは「ループ・条件分岐・関数などのコード構造を直接使える」点。
  ディレクトリ構成・必須ファイルはブロックCが自律検索して調達する。

- **Ansible**：すでに存在するサーバーの「設定・ソフトウェアインストール・コマンド実行」を自動化する。
  インフラの作成（Terraform）ではなく、作成後のサーバー設定管理が主な用途。
  冪等性（何度実行しても同じ結果になること）を保つPlaybookの設計が重要。
  ディレクトリ構成・必須ファイルはブロックCが自律検索して調達する。

- **Helm**：Kubernetes上のアプリケーションのデプロイ設定を「Chart」としてパッケージ化・バージョン管理する。
  Kubernetes のマニフェスト（YAML）を直接管理する代わりに、Helm Chart に環境差異を変数で吸収させる。
  ディレクトリ構成・必須ファイルはブロックCが自律検索して調達する。

---

## ディレクトリ構成（Terraform の場合）

```
project-root/
  environments/               環境ごとの変数定義
    dev/
      main.tf                 devの設定（本番と分離する）
      terraform.tfvars        環境固有の変数値（gitignoreする場合がある）
      backend.tf              状態ファイルの保存先
    staging/
    prod/

  modules/                    再利用可能なモジュール（環境間で共通のロジック）
    [resource-name]/
      main.tf
      variables.tf
      outputs.tf
      README.md               モジュールの使い方を必ず記載する

  .terraform.lock.hcl         プロバイダーのバージョンロック（必ずコミットする）
  .gitignore                  .terraform/ terraform.tfstate を除外する
  README.md
```

## ディレクトリ構成（AWS CDK の場合）

```
project-root/
  lib/                        スタック定義
    [resource]-stack.ts
  bin/                        エントリポイント（cdk deploy で参照される）
    app.ts
  test/                       スナップショットテスト
  cdk.json                    必須（CDK設定ファイル）
  cdk.context.json            コンテキスト値（コミットする）
  package.json
  tsconfig.json
```

---

## IaC固有の設計原則

**環境の分離**

本番・ステージング・開発の環境は必ず分離する。
環境間でコードを共通化し、変数（tfvars / CDKのContext）で差異を表現する。
本番環境のリソース定義を開発環境から変更できない権限設計にする。

**状態ファイルの管理**

```
Terraform の state ファイル（terraform.tfstate）は：
  - ローカルに置かない（S3 / GCS / Azure Blob などのリモートバックエンドを使う）
  - gitignore する（機密情報が含まれる場合がある）
  - バックエンドのバージョニングを有効にする（誤操作からの復旧のため）
```

**最小権限の原則**

IaCツールが使用するIAMロール・サービスアカウントには、必要最小限の権限のみを付与する。
権限を確認する：`[クラウド名] least privilege IaC best practices [現在年]`

**ドリフト検出**

手動でクラウドコンソールから変更を加えると、IaCの定義と実際のリソースに差異（ドリフト）が生じる。
定期的にドリフトを検出して修正する仕組みを設計初期に決める。

**シークレット管理**

```
IaCのコードにシークレット（パスワード・APIキー）を直接書かない。
  → AWS Secrets Manager / GCP Secret Manager / Azure Key Vault を使う
  → Terraform の sensitive = true でログ出力を抑制する
  → .env.example と同じルール：値ではなくキー名のみをコードで管理する
```

---

## 必須ファイル（共通）

| ファイル | 役割 | 備考 |
|---------|------|------|
| `README.md` | セットアップ手順・デプロイ手順 | 必須 |
| `.gitignore` | 状態ファイル・機密ファイルの除外 | 必須 |
| `.env.example` | 必要な環境変数の一覧 | |

ツール固有の必須ファイル（`cdk.json` / `.terraform.lock.hcl` 等）は
`stack-setup.md` の Step 3.5 ブロックB が自律検索して記録する。

---

## セキュリティ

IaCはクラウドインフラ全体を制御するため、セキュリティリスクが高い。
`security-requirements.md` の Lv.3 以上の対応を推奨する。

静的解析ツールで設定ミスを検出する：
`[ツール名] security scanning static analysis [現在年]`

---

## 参照ドキュメント

- `.claude/standards/principles/security-requirements.md`（セキュリティ対応レベル）
- `.claude/standards/principles/resilience.md`（バックアップ・障害設計）
- `.claude/standards/principles/production-readiness.md`（リリース前チェックリスト）
- `.claude/standards/principles/commercial-operations.md`（コスト管理・SLA設計）
