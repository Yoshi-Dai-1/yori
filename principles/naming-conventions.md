# 命名規則

---

## このファイルの使い方（AIへの指示）

このファイルには2種類のルールが存在する。適用する前に必ず以下の順序で判断する。

```
1. ARCHITECTURE.md の「命名規則」セクションに確定値が記載されている
   → そちらを SSOT として従う。このファイルは参照しない。

2. ARCHITECTURE.md に記載がない
   → このファイルの「言語別」セクションを確認する。
     言語が確定している場合、言語別ルールが以下の基本ルールを上書きする。

3. 言語別セクションにも記載がない
   → 「命名規則の確定手順」セクションに従い、
     フレームワーク固有の追加命名規則を検索して確定させてから適用する。
```

**基本ルールと言語別ルールが矛盾する場合、言語別ルールが優先する。**
例：基本ルールは「ディレクトリ名は kebab-case」だが、
Python プロジェクトでは「snake_case」が言語別ルールとして上書きする。

---

## ケーススタイル一覧（基本ルール・JS/TS プロジェクトに適用）

| スタイル | 書き方 | 主な用途 |
|---------|--------|---------|
| `kebab-case` | `stock-detail` | ディレクトリ名・URLパス・CSSクラス・HTMLカスタム属性 |
| `camelCase` | `stockDetail` | JS/TS変数・関数名・オブジェクトキー |
| `PascalCase` | `StockDetail` | クラス名・Reactコンポーネント名・型名・インターフェース名 |
| `snake_case` | `stock_detail` | Python変数・DB列名・SQLカラム |
| `UPPER_SNAKE_CASE` | `STOCK_DETAIL` | 定数・環境変数名 |

---

## ディレクトリ名

**JS/TS プロジェクト：kebab-case を使う**
**Python / Go / Rust プロジェクト：snake_case を使う（言語別ルールが上書きする）**

```
features/stock-detail/
features/user-auth/
shared/form-components/
```

理由：
- 大文字小文字を区別しないOS（macOS）と区別するOS（Linux）の両方で安全
- URLパスと対称性がある
- スペースを含まないため `cd` コマンドや `import` パスで引用符不要

---

## ファイル名

| 対象 | 規則 | 例 |
|------|------|----|
| Reactコンポーネント | `PascalCase.tsx` | `StockCard.tsx` |
| カスタムhooks | `camelCase.ts`（`use` prefix必須） | `useStockData.ts` |
| ユーティリティ関数 | `camelCase.ts` | `formatNumber.ts` |
| サービス | `camelCase.ts`（`Service` suffix推奨） | `stockService.ts` |
| リポジトリ | `camelCase.ts`（`Repository` suffix推奨） | `stockRepository.ts` |
| 型定義ファイル | `*.types.ts` | `stock.types.ts` |
| 定数ファイル | `*.constants.ts` | `api.constants.ts` |
| テストファイル | 各言語の標準規約に従う（下記「テストファイル命名規則」参照） | `useStockData.test.ts` |
| 設定ファイル | ツールの規約に従う | `jest.config.ts` |
| スタイル（CSS Modules） | `*.module.css` | `stockCard.module.css` |

---

## テストファイル命名規則

テストファイルは原則として各言語の標準規約に従う。ARCHITECTURE.md に確定値がある場合はそちらを優先する。

| 言語 | 標準パターン | 例 |
|------|-------------|----|
| JavaScript / TypeScript | `*.test.ts` / `*.spec.ts` | `useLogin.test.ts` |
| React (JSX/TSX) | `*.test.tsx` / `*.spec.tsx` | `HomeScreen.test.tsx` |
| Python | `test_*.py` / `*_test.py` / `*.test.py` | `test_auth.py` |
| Go | `*_test.go`（Goコンパイラが強制） | `handler_test.go` |
| Rust | `*_test.rs`（`tests/` ディレクトリも可） | `lib_test.rs` |
| Java | `*Test.java` / `*Tests.java` / `*Spec.java` | `UserServiceTest.java` |
| Kotlin | `*Test.kt` / `*Spec.kt` | `AuthSpec.kt` |
| C# | `*Tests.cs` / `*Test.cs` | `ShoppingCartTests.cs` |
| Ruby | `*_spec.rb`（RSpec） / `*_test.rb`（Minitest） | `user_spec.rb` |
| Swift | `*Tests.swift` | `LoginTests.swift` |
| C / C++ | `*_test.cpp` / `*_test.c` / `*Test.cpp` / `*Test.c` | `calculator_test.cpp` |
| PHP | `*Test.php` / `*Tests.php` | `PaymentGatewayTest.php` |

言語別表にない言語は、その言語の標準テスティングフレームワークの規約に従う。
ARCHITECTURE.md の「命名規則」セクションが常に最優先される。

---

## 命名の意図を伝えるパターン

ファイル名・変数名・関数名は「ドメイン + 種別」の構造で命名する。
名前を見ただけで「何のドメインの・何をするものか」が分かることが目標。

```
useStockScreener.ts   "use" → フック  "Stock" → ドメイン  "Screener" → 機能
StockCard.tsx         "Stock" → ドメイン  "Card" → UIパターン
stockRepository.ts    "stock" → ドメイン  "Repository" → 層（データアクセス）
formatCurrency.ts     動詞始まり → 純粋関数
STOCK_LIMITS.ts       UPPER_SNAKE → 定数（グローバルに不変）
```

---

## 変数・関数名の規則

### 関数名は動詞始まり

```typescript
// 良い
getUserById()
formatCurrency()
validateStockCode()
fetchEarnings()
calculateROE()

// 悪い
userById()         // 何をする関数か分からない
currency()         // 名詞だけ
```

### Boolean変数・プロパティは `is` / `has` / `can` で始める

```typescript
const isLoading = true;
const hasError = false;
const canSubmit = true;

// 悪い
const loading = true;
const error = false;
```

### 配列・コレクションは複数形

```typescript
const stocks = [];
const userIds = [];

// 悪い
const stock = [];   // 単数形だと1件に見える
```

### イベントハンドラの prefix は役割で決まる

- **実装側（関数の定義）**：`handle` prefix を使う
- **props として受け取る側（コンポーネントの引数）**：`on` prefix を使う

```typescript
// 実装側：handle prefix
const handleSubmit = () => { ... };
const handleClose = () => { ... };

// props の型定義：on prefix
type ModalProps = {
  onClose: () => void;
  onSubmit: (data: FormData) => void;
};

// 呼び出し側：props には on prefix の名前を渡し、実装は handle prefix の関数を渡す
<Modal onClose={handleClose} onSubmit={handleSubmit} />
```

---

## 型名・インターフェース名

```typescript
// 型名はPascalCase、意味のある名前
type StockSummary = { ... };
type ApiResponse<T> = { ... };

// インターフェースは I prefix を使わない（現代的な慣習）
interface StockRepository { ... }  // 良い
interface IStockRepository { ... } // 古い慣習・使わない

// ユーティリティ型は意図が明確な名前
type Nullable<T> = T | null;
type AsyncResult<T> = Promise<{ data: T; error: string | null }>;
```

---

## 定数名

```typescript
// グローバル定数：UPPER_SNAKE_CASE
const API_BASE_URL = 'https://...';
const MAX_RETRY_COUNT = 3;

// ローカル定数（関数内）：camelCase でも可
const maxRetries = 3;

// オブジェクト定数：PascalCase
const HttpStatus = {
  OK: 200,
  NOT_FOUND: 404,
} as const;
```

---

## REST APIエンドポイント命名規則

REST APIのエンドポイント設計は変化しない原則を適用する。
フレームワーク固有のルーティング記法はブロックC（フレームワーク固有設計の深掘り）が自律検索して補完する。

**URLパス：kebab-case・複数形・リソース名は名詞**

```
# 推奨
GET    /users                    一覧取得
GET    /users/{id}               1件取得
POST   /users                    作成
PUT    /users/{id}               全項目更新
PATCH  /users/{id}               一部更新
DELETE /users/{id}               削除

GET    /stock-prices              複合語は kebab-case
GET    /users/{userId}/orders     ネストは親→子の順

# 禁止
GET    /getUsers                  動詞をパスに含めない
GET    /user                      単数形にしない（コレクションは複数形）
GET    /Users                     大文字を使わない
GET    /users_list                アンダースコアを使わない
```

**クエリパラメータ：camelCase**

```
GET /users?pageSize=10&sortOrder=asc&filterBy=active
```

**バージョニング：URLパスにメジャーバージョンを含める**

```
/api/v1/users       バージョン1
/api/v2/users       破壊的変更が生じた場合に v2 に上げる
```

**フレームワーク固有のルーティング規則：**
Next.js の App Router・Django のURL設定・FastAPIのパスなど、
フレームワークが強制するルーティング記法はブロックC（フレームワーク固有設計の深掘り）が自律検索して確認する。

---

## GraphQL命名規則

GraphQL固有の命名は変化しない原則を適用する。
スキーマの詳細設計（フラグメント・ディレクティブ等）はブロックC（フレームワーク固有設計の深掘り）が自律検索して補完する。

**型・フィールド・操作の命名：**

```graphql
# 型名：PascalCase
type StockPrice { ... }
type UserProfile { ... }

# フィールド名：camelCase
type StockPrice {
  stockCode: String!
  closingPrice: Float!
  updatedAt: DateTime!
}

# クエリ名：camelCase（動詞始まり）
query getStockPrice($code: String!) { ... }
query listStocks { ... }

# ミューテーション名：camelCase（動詞始まり・操作を明示）
mutation createWatchlist($input: CreateWatchlistInput!) { ... }
mutation updateStockAlert($id: ID!, $input: UpdateAlertInput!) { ... }
mutation deleteWatchlist($id: ID!) { ... }

# サブスクリプション名：camelCase（on + イベント名）
subscription onStockPriceUpdated($code: String!) { ... }

# 入力型：PascalCase + Input suffix
input CreateWatchlistInput { ... }
input UpdateAlertInput { ... }

# Enum：PascalCase（値はUPPER_SNAKE_CASE）
enum OrderStatus {
  PENDING
  COMPLETED
  CANCELLED
}
```

---

## WebSocketイベント命名規則

WebSocketのイベント名は変化しない原則を適用する。
フレームワーク固有の実装（Socket.io等）はブロックC（フレームワーク固有設計の深掘り）が自律検索して補完する。

**イベント名：kebab-case（動詞:リソース名 の形式）**

```
# 推奨（動詞:リソース名）
stock:updated          株価の更新通知
order:created          注文の作成通知
user:disconnected      ユーザー切断通知
room:joined            ルーム参加通知

# 禁止
stockUpdated           camelCase は使わない（混在を防ぐ）
STOCK_UPDATED          UPPER_SNAKE_CASE は使わない
update_stock           アンダースコアは使わない
```

**クライアント→サーバー送信イベントとサーバー→クライアント送信イベントを区別する：**

```
# クライアント→サーバー：command: の prefix
command:subscribe-stock    株価の購読リクエスト
command:unsubscribe-stock  購読解除リクエスト

# サーバー→クライアント：event: の prefix
event:stock-updated        株価更新の通知
event:error                エラー通知
```

---

## データベース設計の命名規則

DBスキーマの設計原則は変化しない。マイグレーション戦略の実装詳細はブロックC（フレームワーク固有設計の深掘り）が自律検索して補完する。

**テーブル名・カラム名：snake_case**

```sql
-- テーブル名：複数形・snake_case
CREATE TABLE stock_prices ( ... );
CREATE TABLE user_watchlists ( ... );

-- カラム名：snake_case
stock_code        VARCHAR(10) NOT NULL,
closing_price     DECIMAL(10, 2) NOT NULL,
created_at        TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
updated_at        TIMESTAMP NOT NULL,

-- 主キー：id（単純な場合）または [テーブル名の単数形]_id
id                BIGINT PRIMARY KEY,

-- 外部キー：[参照テーブルの単数形]_id
user_id           BIGINT REFERENCES users(id),
stock_id          BIGINT REFERENCES stocks(id),

-- 真偽値カラム：is_ または has_ prefix
is_active         BOOLEAN NOT NULL DEFAULT TRUE,
has_notification  BOOLEAN NOT NULL DEFAULT FALSE,

-- インデックス名：idx_[テーブル名]_[カラム名]
CREATE INDEX idx_stock_prices_stock_code ON stock_prices(stock_code);
```

**マイグレーションの設計原則（変化しない）：**

```
可逆性：すべてのマイグレーションは up（適用）と down（ロールバック）を定義する
        down が実装できない変更（データ削除を伴うもの）は decisions/ に理由を記録する

ゼロダウンタイム：本番稼働中のマイグレーションはカラム追加・インデックス追加のみ安全
                  カラム削除・リネームは2段階で行う
                  （1. 新カラム追加・アプリ更新 → 2. 旧カラム削除）

命名規則：マイグレーションファイルは [タイムスタンプ]_[動詞]_[対象] の形式
          例：20240115_add_stock_code_index.sql
              20240115_create_watchlists_table.sql
```

マイグレーションツール固有の設定（Flyway / Liquibase / Alembic / Prisma Migrate 等）は
ブロックC（フレームワーク固有設計の深掘り）が自律検索して確認する：`[ツール名] migration best practices [現在年]`

---

## gitブランチ名

```
main              本番ブランチ
develop           開発統合ブランチ

feature/stock-screener     機能追加
fix/login-error            バグ修正
refactor/auth-layer        リファクタリング
docs/add-architecture-md   ドキュメント
chore/update-dependencies  依存関係更新
```

---

## コミットメッセージ（Conventional Commits）

仕様：conventionalcommits.org
型の追加・変更は `Conventional Commits specification [現在年]` で確認する。

```
feat: 株式スクリーナーの条件保存機能を追加
fix: ログイン時のトークンリフレッシュエラーを修正
refactor: 認証レイヤーをrepositoriesパターンに移行
docs: ARCHITECTURE.mdにFSD層のルールを追記
chore: ESLintをv9に更新
test: useStockDataのユニットテストを追加
```

---

## 禁止パターン

```
# ファイル名
image1.png          → hero-banner.png
最終版.md           → v2-proposal.md（日本語ファイル名は避ける）
new_component2.tsx  → 何の意味もない連番

# 変数名
data                → stockData, apiResponse など具体的に
info                → userInfo → user で十分
temp                → 何がtempなのかを書く
x, y, i            → ループ変数以外では使わない

# 関数名
doStuff()           → 何をするか明示する
process()           → 何を処理するか明示する
handleEverything()  → 単一責任に分割する
```

---

## セキュア命名ルール

命名はセキュリティの一部である。変数名・ログ出力・コメントから機密情報の存在・構造を推測させない。

**機密情報を示す変数名の扱い**

機密情報を保持する変数には、値の種類が特定されない汎用名を使う。
変数名から「何の機密情報か」が推測できる名前は、攻撃者へのヒントになる。

```
# 禁止：ログ・エラーメッセージ・スタックトレースに出力される可能性がある
const adminPassword = ...
const dbConnectionString = ...
const stripeSecretKey = ...

# 推奨：役割を示しつつ値の種類を限定しない
const adminCredential = ...
const dbConfig = ...
const paymentApiKey = ...
```

**ログ出力変数の命名規約**

ログに出力する変数・オブジェクトには、機密フィールドを含まない専用の型・変数を用意する。
「ログ用オブジェクト」であることを名前で示す。

```typescript
// 禁止：userオブジェクトをそのままログに渡す（passwordHashが漏洩する）
logger.info('login', { user })

// 推奨：ログ用に機密フィールドを除いた変数を明示的に作る
const userForLog = { id: user.id, email: user.email }
logger.info('login', { user: userForLog })
```

**環境変数名の規約**

環境変数名は `UPPER_SNAKE_CASE`。機密情報の環境変数には `_KEY` / `_SECRET` / `_TOKEN` / `_CREDENTIAL` のいずれかを suffix に付ける。これにより secrets スキャナーが自動検出できる。

```
DATABASE_URL          → 接続文字列（URL形式）
STRIPE_SECRET_KEY     → 決済APIの秘密鍵
SENDGRID_API_KEY      → メール送信APIキー
JWT_SECRET            → JWT署名用シークレット
```

---

## 命名規則の確定手順（`.opencode/instructions/stack-setup.md` Step 3.5 ブロックA（命名規則の確定・転記）から呼び出される）

このセクションは `.opencode/instructions/stack-setup.md` の Step 3.5 ブロックA（命名規則の確定・転記）が呼び出したときのみ実行する。
トリガーと実行タイミングは `.opencode/instructions/stack-setup.md` が管理する。このファイルは手順のみを定義する。

### 実行内容

**Step 1：フレームワーク固有の追加命名規則をWeb検索で確認する**

**検索対象はケーススタイル（camelCase / snake_case 等の原則）ではない。**
ケーススタイルは変化しない情報であり、このファイルの冒頭「ケーススタイル一覧」と各言語別セクションを参照すれば足りる。
検索対象は「フレームワークが強制する追加の命名規則」に限定する。

フレームワークが ARCHITECTURE.md に記載されている場合のみ以下を実行する。
フレームワークが未定義の場合、このステップをスキップしてStep 2へ進む。

| フレームワークの有無 | 検索クエリ | 信頼できる情報源のドメイン |
|---------------------|-----------|--------------------------|
| フレームワークあり | `[フレームワーク名] file naming conventions [現在年]` | フレームワークの公式ドメイン（例：nextjs.org, docs.djangoproject.com, rubyonrails.org） |
| フレームワークなし | 検索しない。このファイルの各言語別セクションをそのまま適用する。 | — |

URLは変更される可能性があるため、フレームワーク名で検索し、フレームワークの公式組織が管理するドメインの情報源を採用する。

**信頼できる情報源の優先順位**

1. フレームワークの公式ドキュメント（フレームワーク公式組織が管理するドメイン）
2. 言語の公式組織が管理するドメイン（このファイルの各言語別セクションに記載のドメイン）
3. 業界標準として広く採用されているスタイルガイド（Google Style Guide / Airbnb JavaScript Style Guide / PEP 8 のように、組織名と正式名称で特定できるもの）

検索結果が複数ある場合は優先順位1のものを採用し、見つからない場合は順位を下げて探す。

**Step 2：検索結果を情報源通知テンプレートで人間に通知する**

```
**命名規則の参照情報源**
  - [情報源名（組織名）]：[URL]（取得日：[YYYY-MM-DD]）
  確認した規則：[ケーススタイルの要約を1〜2行]
```

Web検索で公式情報が確認できなかった場合：
```
**命名規則の参照情報源**
  - AIの学習データに基づく規則です（Web検索で公式情報が確認できませんでした）
  - 確認を推奨する情報源：[言語名] の公式ドキュメント（[ドメイン名]）
```

**Step 3：AGENTS.md の `## Code Style` セクションを確定値で上書きする**

`[例:` で始まるすべてのプレースホルダー行を、確認した公式規則の確定値に置き換える。
「例:」という表記を残さない。選択肢を並べない。1つの確定値のみを書く。

```markdown
# 置き換え前（プレースホルダー）
- ディレクトリ名：[例: kebab-case / snake_case]
- 関数・変数名：[例: camelCase（JS/TS）/ snake_case（Python/Go/Rust）]

# 置き換え後（TypeScript プロジェクトの場合の確定値）
- ディレクトリ名：kebab-case
- クラス・型名：PascalCase
- 関数・変数名：camelCase
- 定数：UPPER_SNAKE_CASE
- ファイル名（コンポーネント）：PascalCase.tsx
- ファイル名（その他）：camelCase.ts
```

**Step 4：ARCHITECTURE.md の `## 命名規則` セクションに確定値を転記する**

ARCHITECTURE.md の命名規則テーブルのプレースホルダーを確定値で上書きする。
参照情報源も同セクションの末尾に記録する。これが SSOT となる。
以後、AGENTS.md の `## Code Style` は ARCHITECTURE.md から転記した値であることをコメントで明示する。
