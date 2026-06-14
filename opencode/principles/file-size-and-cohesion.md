# ファイルサイズと凝集度

---

## ファイルサイズの指針

| 種別 | 目安 | 超えたときのアクション |
|------|------|----------------------|
| 通常のソースファイル | 200〜300行 | 責務を分割する |
| テストファイル | 上限なし | 分割不要（対象の2〜3倍になることがある） |
| 自動生成ファイル | 上限なし | 手動管理しない |
| スクリプト（単発処理） | 100行以内が理想 | 共通処理を関数に切り出す |

300行は「品質の閾値」ではなく「責務の過多を検知するセンサー」。
超えたとき、まず「このファイルは何をしているか」を1文で言えるか確認する。
言えなければ分割のサイン。

---

## 分割の判断と方法

### 分割のサイン

- 1ファイルに2つ以上の「〜する」が含まれる
- コメントで区切りを作りたくなっている
- 300行を超えている
- テストを書こうとしたとき、何をテストするか迷う

### 分割のパターン

```
# 元のファイルが肥大化した場合
stockScreener.ts (400行) → 以下に分割

  stockScreener.ts           メインロジック・エントリポイント
  stockScreener.types.ts     型定義
  stockScreener.utils.ts     補助関数（純粋関数）
  stockScreener.constants.ts 定数
```

---

## 凝集度：コロケーションの原則

「一緒に変わるものは一緒に置く」

### 機能単位でのコロケーション（推奨）

```
features/stock-card/
  StockCard.tsx          コンポーネント本体
  useStockCard.ts        ロジック（カスタムhook）
  stockCard.types.ts     この機能専用の型
  stockCard.module.css   スタイル
  StockCard.test.tsx     テスト
  index.ts               外部公開API（ここだけexport）
```

削除するとき：このディレクトリを丸ごと削除すれば取り残しがない。

### コロケーションの例外

以下は意図的に集約する：

```
src/types/          アプリ全体で共有する型（APIレスポンス型など）
src/constants/      アプリ全体で共有する定数
src/shared/         複数featureで使う共通コンポーネント・関数
```

ただし `src/shared/` が肥大化し始めたら、それはfeature固有のものが混入しているサイン。

---

## 循環依存の防止

### 循環依存とは

```
# AがBに依存し、BがAに依存する状態
features/auth/index.ts   → import from '../user'
features/user/index.ts   → import from '../auth'   ← 循環
```

### 検出方法

ESLintの `import/no-cycle` ルールで自動検出できる。

```json
// .eslintrc
{
  "rules": {
    "import/no-cycle": "error"
  }
}
```

### 解決パターン

循環が起きたとき、共通部分を `shared/` に切り出す。

```
# 修正前（循環）
features/auth/  ←→  features/user/

# 修正後（共通部分を切り出し）
features/auth/   →  shared/session/
features/user/   →  shared/session/
```

---

## バレルエクスポート（index.ts）の正しい使い方

### 目的

featureの「外部公開API」を明示する。内部実装を隠蔽する。

```typescript
// features/stock-card/index.ts
export { StockCard } from './StockCard';
export type { StockCardProps } from './stockCard.types';
// useStockCard は内部実装なのでexportしない
```

### アンチパターン：全体をまとめるバレル

```typescript
// src/features/index.ts（禁止）
export * from './auth';
export * from './stock';
export * from './screening';
```

これをやるとバンドルサイズが肥大化し、ツリーシェイキングが効かなくなる。
バレルエクスポートは「featureの外部API」として使うもので、アプリ全体をまとめる目的には使わない。

---

## 内部専用ディレクトリの示し方

`_` prefix でAI・人間ともに「外部から触るな」と伝える。

```
features/auth/
  _internal/          このfeature内からのみ参照可能
    tokenParser.ts
    sessionStore.ts
  AuthForm.tsx        外部から使うコンポーネント
  index.ts            公開API
```
