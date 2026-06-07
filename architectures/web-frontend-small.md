# アーキテクチャ：Webフロントエンド（小規模・シンプル構成）

**向いている場面**：個人開発・プロトタイプ・機能が10以下・短期プロジェクト
**採用パターン**：pages + components + hooks のフラット構成

FSDは強力だが、小規模プロジェクトには過剰。
シンプルな構成から始め、複雑になったら web-frontend-large.md に移行する。

---

## ディレクトリ構成

```
src/
  pages/                  ルーティング単位の画面
    HomePage.tsx
    StockDetailPage.tsx
    ScreenerPage.tsx

  components/             UIコンポーネント
    common/               複数ページで使う汎用コンポーネント
      Button.tsx
      Modal.tsx
      Table.tsx
    stock/                stockドメイン固有のコンポーネント
      StockCard.tsx
      StockChart.tsx
    screener/             screenerドメイン固有のコンポーネント
      FilterPanel.tsx

  hooks/                  カスタムhooks
    useStockData.ts
    useScreener.ts
    useDebounce.ts        （汎用）

  services/               APIコール・外部通信
    stockService.ts
    authService.ts

  types/                  型定義
    stock.types.ts
    api.types.ts

  constants/              定数
    api.constants.ts
    domain.constants.ts

  utils/                  純粋関数
    formatNumber.ts
    formatDate.ts

  styles/                 グローバルスタイル
    globals.css
    variables.css
```

---

## 依存ルール

```
pages → components → hooks → services → utils/constants/types

上位から下位への一方向依存。
components は services を直接呼ばない（hooks 経由にする）。
```

---

## FSDへの移行タイミング

以下のいずれかが発生したら web-frontend-large.md に移行を検討する：

- `components/` が50ファイルを超えた（stack-setup.md Step 3.5 ブロックB（必須ファイルの確認・記録）の実行時、および月次品質診断時にファイル数をカウントする。超過を検出した場合、ARCHITECTURE.md の「アーキテクチャ移行検討」セクションに警告を記録し、人間に通知する）
- `hooks/` が20ファイルを超えた（同様にカウント・通知する）
- 同じドメインのコンポーネントとhooksを探すのに時間がかかるようになった
- チーム開発になった

---

## 設定ファイル群

```
project-root/
  src/           （上記の構成）
  public/
  .env.example
  ARCHITECTURE.md
  README.md
  package.json
  tsconfig.json
  vite.config.ts（またはnext.config.js等）
```

---

## Design Contract

instructions/design-contract.md に従う。design/token-ssot.json を色・フォント・スペーシングの正本とし、design/component-map.json でコンポーネント名と実装の対応を管理する。
