# ディレクトリ構成の原則

あらゆるプロジェクト種別に適用する普遍的な原則。
種別ごとの具体的な構成は `architectures/` を参照。

---

## 根本思想

ディレクトリ構成は「コードの住所録」ではなく「設計思想の可視化」である。
初めてリポジトリを見た人間・AIが、構成を眺めるだけで以下を理解できる状態を目指す：

- このプロジェクトは何をするものか
- どこに何を書くべきか
- 何が何に依存してよいか

---

## 普遍的ルール

### 1. 関心の分離を物理的に表現する

論理的に分離すべきものは、ディレクトリレベルで分離する。
「同じファイルに書ける」と「同じファイルに書くべき」は別の話。

```
# 良い例：関心が分離されている
src/
  features/     ビジネスロジック
  shared/       横断的な共通部品
  infra/        外部依存（API・DB）

# 悪い例：何でも入れる utils/ の肥大化
src/
  utils/        API呼び出し・日付処理・型変換・定数・... 何でも入っている
```

### 2. 凝集度：一緒に変わるものは一緒に置く

ある機能を削除するとき、関連ファイルが複数ディレクトリに散らばっていると取り残しが起きる。
関連するファイルは同じディレクトリに置く（コロケーション）。

```
# 良い：StockCardに関するものが一箇所にある
features/stock-card/
  StockCard.tsx
  useStockCard.ts
  stockCard.types.ts
  stockCard.module.css
  index.ts

# 悪い：削除時に4箇所を探す必要がある
components/StockCard.tsx
hooks/useStockCard.ts
types/stockCard.types.ts
styles/stockCard.module.css
```

### 3. 依存の方向を一方向に保つ

循環依存は設計の崩壊を示すサイン。依存は常に一方向。

```
# フロントエンドの場合（上から下への依存のみ許可）
pages → features → entities → shared

# バックエンドの場合
api → services → repositories → domain

# 禁止：shared が features に依存する
# 禁止：A → B → A の循環
```

### 4. ルートディレクトリは地図として機能させる

ルートを見た人が30秒でプロジェクト全体を把握できること。

```
project-root/
  src/              アプリケーションコード（唯一の聖域）
  tests/            テスト（srcと鏡像構造にする）
  docs/             ドキュメント
  scripts/          ビルド・デプロイ・開発補助スクリプト
  config/           自作設定ファイル（ツール規約でルート必須のものは除く）
  .github/          CI/CD設定
  .env.example      必要な環境変数のテンプレート（コミットする）
  ARCHITECTURE.md   このプロジェクトの設計思想・層のルール
  README.md         概要・セットアップ手順
```

### 5. 深さは3〜4階層に抑える

```
# 良い（4階層）
src/features/auth/hooks/useLogin.ts

# 悪い（7階層・探索不可能）
src/modules/core/features/auth/v2/hooks/custom/useLogin.ts
```

### 6. フォルダ名の先頭ナンバリングはプロダクションコードに使わない

ナンバリングはgit差分の汚染・importパスの破壊・AIのパス誤認識を招く。
有効な場面は以下のいずれかに限定する: (1) チュートリアル（ステップ1→ステップ2の順序で進行するもの）、(2) 研修教材（基礎→応用の順序で学習するもの）、(3) オンボーディングドキュメント（入社→環境構築→初タスクの順序で進むもの)。プロダクションコードのディレクトリ・ファイル名には使用しない。

```
# 禁止：プロダクションコード
src/
  01_auth/
  02_stock/
  03_screening/

# 許可：教材・ドキュメント
docs/
  01_getting-started/
  02_architecture/
  03_api-reference/
```

---

## ファイルサイズの指針

→ 詳細は `.opencode/standards/principles/file-size-and-cohesion.md` を参照。

目安：.opencode/standards/principles/file-size-and-cohesion.md の閾値（300行）を参照。超えたら責務を分割する。

---

## SSOTの適用

→ 詳細は `.opencode/standards/principles/ssot-and-constants.md` を参照。

型定義・APIエンドポイント・定数・マジックナンバーの管理方針はそちらに集約している。

---

## 環境変数ファイルの管理

```
.env                  gitにコミットしない（.gitignore必須）
.env.local            個人の上書き用
.env.development      開発環境用
.env.production       本番用（機密情報はCI/CDのシークレットで管理）
.env.example          必要な変数名だけ書いたテンプレート（コミットする・SSOTとして機能）
```

---

## テストディレクトリの配置

コロケーション型（推奨）とミラー型のどちらかに統一する。プロジェクト内で混在させない。

**コロケーション型**（推奨）

```
src/features/auth/
  useLogin.ts
  useLogin.test.ts   ← ソースの隣に置く
```

**ミラー型**

```
tests/
  features/
    auth/
      useLogin.test.ts
```

---

## 判断フローチャート（何かを決めるときの思考順序）

```
1. これはどのレイヤーに属するか？              → ARCHITECTURE.mdで確認
2. 一緒に変わるものは一緒に置かれているか？     → 凝集度の確認
3. 依存の方向は正しいか？                      → 循環依存の確認
4. 名前を見ただけで責務が分かるか？             → .opencode/standards/principles/naming-conventions.md で確認
5. 1ファイルが .opencode/standards/principles/file-size-and-cohesion.md の閾値を超えていないか？           → 分割を検討
6. 同じ情報が複数箇所にないか？                 → .opencode/standards/principles/ssot-and-constants.md で確認
7. 非機能要件（性能・セキュリティ）を満たすか？ → .opencode/standards/principles/non-functional-requirements.md で確認
```

---

## 必須ファイルの調達ルール

必須ファイルとは「そのツール・言語が正常に動作するために公式仕様として定められたファイル」である。
命名・配置を変更すると該当ツールが動作しなくなるため、公式仕様に従う。

**静的リストを持たない理由**：言語・フレームワーク・ツールのバージョンアップにより必須ファイルの仕様は変化する。
静的リストは陳腐化する。AIが言語確定時に公式ドキュメントから都度調達する設計が正しい。

### 必須ファイルの確認手順（`.opencode/instructions/stack-setup.md` Step 3.5 ブロックB（必須ファイルの確認・記録）から呼び出される）

このセクションは `.opencode/instructions/stack-setup.md` の Step 3.5 ブロックB（必須ファイルの確認・記録）が呼び出したときのみ実行する。
トリガーと実行タイミングは `.opencode/instructions/stack-setup.md` が管理する。このファイルは手順のみを定義する。

**Step 1：必須ファイルの仕様をWeb検索で確認する**

以下の検索クエリを実行する。URLではなく組織名・ドメインで情報源を判断する。

```
[言語名] project required files [現在年]
[フレームワーク名] project structure required files [現在年]
[ビルドツール名] required configuration file [現在年]
```

**信頼できる情報源の優先順位**

1. 言語・ツールの公式組織が管理するドキュメント（一次情報源）
2. フレームワークの公式ドキュメント（一次情報源）
3. パッケージマネージャーの公式仕様（下記テーブルの「信頼できるドメイン」列を参照）

URLは変更される可能性があるため、ドメイン名・組織名で情報源を判断する。
具体的なドメインの例：

| 対象 | 信頼できるドメインの例 |
|------|----------------------|
| Node.js / npm | nodejs.org, docs.npmjs.com |
| Python / pip | docs.python.org, packaging.python.org |
| Go | go.dev |
| Rust / Cargo | doc.rust-lang.org, crates.io |
| Java / Maven | maven.apache.org |
| Java / Gradle | docs.gradle.org |
| Ruby / Bundler | bundler.io, rubygems.org |
| Swift / SPM | swift.org |
| PHP / Composer | getcomposer.org |

**Step 2：プロジェクト種別・規模・クラウド・業種による構成の差異を確認する**

ARCHITECTURE.md の以下のセクションが確定している場合、追加の検索を実行する。

| 確定している情報 | 追加検索クエリ |
|----------------|--------------|
| クラウドプロバイダー（AWS / GCP / Azure、およびそれ以外のプロバイダー） | `[プロバイダー名] project structure best practices [現在年]` |
| フレームワーク（Next.js / Django / Rails、およびそれ以外のフレームワーク） | `[フレームワーク名] recommended directory structure [現在年]` |
| アーキテクチャ（マイクロサービス / サーバーレス、およびそれ以外のアーキテクチャ） | `[アーキテクチャ名] directory structure best practices [現在年]` |
| 業種・ドメイン（金融 / 医療 / EC、およびそれ以外の業種） | `[業種名] software project structure compliance [現在年]` |

**Step 3：検索結果を情報源通知テンプレートで人間に通知する**

```
**プロジェクト構成の参照情報源**
  - [情報源名（組織名）]：[URL]（取得日：[YYYY-MM-DD]）
  確認した必須ファイル・推奨構成：[1〜2行の要約]
```

Web検索で公式情報が確認できなかった場合：
```
**プロジェクト構成の参照情報源**
  - AIの学習データに基づく構成です（Web検索で公式情報が確認できませんでした）
  - 確認を推奨する情報源：[言語名] / [フレームワーク名] の公式ドキュメント（[ドメイン名]）
```

**Step 4：確認した必須ファイルを ARCHITECTURE.md に記録する**

ARCHITECTURE.md の「技術スタック」セクション末尾に以下を追記する。
これが SSOT となり、以後このファイルを参照する。

```markdown
**確認済み必須ファイル**（[YYYY-MM-DD] 時点）
- [ファイル名]：[役割]（出典：[情報源ドメイン]）
- [ファイル名]：[役割]（出典：[情報源ドメイン]）
```
