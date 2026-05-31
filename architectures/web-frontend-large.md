# アーキテクチャ：Webフロントエンド（大規模・FSD）

**向いている場面**：機能が多い・チーム開発・長期メンテナンスが必要なWebアプリ
**採用パターン**：Feature-Sliced Design（FSD）

---

## ディレクトリ構成

```
src/
  app/                    エントリポイント・プロバイダー・グローバル設定
    providers/
    styles/
    index.tsx

  pages/                  ルーティング単位の画面（ページコンポーネント）
    home/
      index.tsx
    stock-detail/
      index.tsx
    screener/
      index.tsx

  widgets/                複数featureを組み合わせた独立UIブロック
    header/
    sidebar/
    stock-dashboard/

  features/               ユーザーの操作単位（1つの機能・1つのユースケース）
    stock-search/
      ui/
        StockSearchForm.tsx
      model/
        useStockSearch.ts
        stockSearch.types.ts
      index.ts            外部公開APIのみexport
    screening/
    auth/

  entities/               ビジネスエンティティ（ドメインオブジェクト）
    stock/
      ui/
        StockCard.tsx
        StockBadge.tsx
      model/
        stock.types.ts
        stock.constants.ts
        useStock.ts
      index.ts
    user/

  shared/                 汎用UI・utils・型・定数（ドメイン非依存）
    ui/                   汎用コンポーネント（Button・Input・Modal等）
    hooks/                汎用hooks（useDebounce・useLocalStorage等）
    utils/                純粋関数（formatNumber・formatDate等）
    types/                グローバル型（ApiResponse・Nullable等）
    constants/            グローバル定数（APIエンドポイント等）
    lib/                  外部ライブラリのラッパー（axios設定等）
```

---

## 依存ルール（厳守）

```
app → pages → widgets → features → entities → shared

上位層から下位層への依存のみ許可。逆方向は禁止。
同一層内の横断依存も原則禁止（shared経由にする）。
```

---

## featureの内部構造

```
features/stock-search/
  ui/               コンポーネント（表示に関する責務）
  model/            ロジック（hooks・型・定数）
  api/              この機能固有のAPIコール（shared/lib を使う）
  _internal/        このfeature内からのみ参照（外部に公開しない）
  index.ts          外部公開API（ここにないものは触れない）
```

---

## index.ts の書き方

```typescript
// features/stock-search/index.ts
// 外部から使うものだけをexport
export { StockSearchForm } from './ui/StockSearchForm';
export { useStockSearch } from './model/useStockSearch';
export type { StockSearchParams } from './model/stockSearch.types';

// _internal/ の中身はexportしない
```

---

## ファイル配置の判断フロー

```
新しいコードをどこに置くか迷ったとき：

1. 特定のページにしか使わない          → pages/[該当ページ]/components/
2. 特定のユーザー操作に紐づく          → features/[機能名]/
3. ビジネスエンティティの表示/処理     → entities/[エンティティ名]/
4. 複数featureで使う・ドメイン依存     → widgets/（表示）または features/ の共通化
5. ドメインに依存しない汎用コード      → shared/
```

---

## 設定ファイル群

```
project-root/
  src/                （上記の構成）
  tests/
    e2e/              E2Eテスト（Playwright等）
  public/             静的アセット
  config/
    vite.config.ts
    jest.config.ts
  .eslintrc.json      import/no-cycle ルールを必ず含める
  tsconfig.json
  .env.example
  ARCHITECTURE.md     FSDの層ルールをプロジェクト固有に記載
  README.md
```

---

## アーキテクチャ違反の機械的検出（ESLint）

このアーキテクチャは JavaScript / TypeScript を前提としている。
`eslint-plugin-boundaries` でFSD層ルールを機械的に強制し、
エラーメッセージに修正方法を記載することでAIが修正先を推測なしで判断できる。
`lint-and-typecheck.ts` Plugin と組み合わせると、ファイル編集のたびに
自動実行され、FSD違反が即座にAIに通知される（Plugin の設定方法は `.opencode/plugins/README.md` 参照）。

```json
{
  "rules": {
    "import/no-cycle": "error",
    "boundaries/element-types": [
      "error",
      {
        "default": "disallow",
        "rules": [
          {
            "from": "pages",
            "allow": ["widgets", "features", "entities", "shared"],
            "message": "[FSD違反] pages/ から直接 ${file.type} を import しています。pages は widgets/・features/・entities/・shared/ にのみ依存できます。"
          },
          {
            "from": "widgets",
            "allow": ["features", "entities", "shared"],
            "message": "[FSD違反] widgets/ から ${file.type} を import しています。widgets は features/・entities/・shared/ にのみ依存できます。pages/ への依存はアーキテクチャ違反です。"
          },
          {
            "from": "features",
            "allow": ["entities", "shared"],
            "message": "[FSD違反] features/ から ${file.type} を import しています。features は entities/・shared/ にのみ依存できます。他の features/ への依存は shared/ 経由に変更してください。"
          },
          {
            "from": "entities",
            "allow": ["shared"],
            "message": "[FSD違反] entities/ から ${file.type} を import しています。entities は shared/ にのみ依存できます。上位層への依存を削除してください。"
          },
          {
            "from": "shared",
            "allow": [],
            "message": "[FSD違反] shared/ がドメイン知識を持つ ${file.type} を import しています。shared はドメイン非依存を維持します。ドメインロジックは entities/ か features/ に移動してください。"
          }
        ]
      }
    ]
  }
}
```


---

## Design Contract

rules/design-contract.md に従う。design/token-ssot.json を色・フォント・スペーシングの正本とし、design/component-map.json でコンポーネント名と実装の対応を管理する。

---

## ARCHITECTURE.md テンプレート（このプロジェクト用）

```markdown
## アーキテクチャ：Feature-Sliced Design

### 層のルール
- app → pages → widgets → features → entities → shared の順で依存
- 逆方向の依存は禁止
- shared はドメイン知識を持たない

### featureの定義
- 1つのユーザー操作・ユースケースに対応する
- 他のfeatureを直接importしない（shared経由にする）

### 禁止事項
- shared/ から features/ への import
- features/ 間の直接 import
- ページコンポーネントへのビジネスロジックの記述
```
