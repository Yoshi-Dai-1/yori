# アーキテクチャ：モノリポ

**向いている場面**：フロントエンド・バックエンド・共通ライブラリを1リポジトリで管理したい場合
**採用パターン**：pnpm workspaces + Turborepo

「モノリポ」はコード管理の方法であり、「フルスタック」は技術範囲の話。別の概念。
モノリポにすることでフロントとバックで型定義を共有でき、型の不整合バグを防げる。

---

## ディレクトリ構成

```
project-root/                  リポジトリルート
  apps/                        デプロイ単位のアプリケーション
    web/                       フロントエンド
      src/                     → web-frontend-large.md または web-frontend-small.md に従う
      package.json
      tsconfig.json
      vite.config.ts
    api/                       バックエンドAPI
      src/                     → backend-api.md に従う
      package.json
      tsconfig.json

  packages/                    アプリ間で共有するパッケージ
    shared-types/              フロント・バック共通の型定義
      src/
        stock.types.ts         APIレスポンスの型（SSOTとして機能）
        user.types.ts
      package.json             name: "@myproject/shared-types"
      tsconfig.json
    ui/                        共通UIコンポーネントライブラリ（必要な場合）
      src/
        Button.tsx
        Modal.tsx
      package.json             name: "@myproject/ui"
    utils/                     共通ユーティリティ関数
      src/
        formatNumber.ts
        formatDate.ts
      package.json             name: "@myproject/utils"

  tools/                       ビルド・開発ツールの設定
    tsconfig/
      base.json                共通tsconfig（各パッケージが extends する）
    eslint/
      base.js                  共通ESLint設定

  docs/                        ドキュメント
  scripts/                     モノリポ全体を操作するスクリプト

  package.json                 ワークスペース設定・共通devDependencies
  pnpm-workspace.yaml          pnpmのワークスペース定義
  turbo.json                   Turborepoのタスク定義
  .env.example                 全体で使う環境変数
  ARCHITECTURE.md
  README.md
```

---

## pnpm-workspace.yaml

```yaml
packages:
  - 'apps/*'
  - 'packages/*'
```

---

## turbo.json（タスクのキャッシュ・並列実行）

```json
{
  "$schema": "https://turbo.build/schema.json",
  "tasks": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**"]
    },
    "dev": {
      "persistent": true,
      "cache": false
    },
    "test": {
      "dependsOn": ["^build"]
    },
    "lint": {}
  }
}
```

---

## packages/ の package.json 例

```json
// packages/shared-types/package.json
{
  "name": "@myproject/shared-types",
  "version": "0.0.1",
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "exports": {
    ".": "./src/index.ts"
  }
}
```

---

## apps/ からの参照方法

```json
// apps/web/package.json
{
  "dependencies": {
    "@myproject/shared-types": "workspace:*",
    "@myproject/ui": "workspace:*"
  }
}
```

```typescript
// apps/web/src/features/stock/stock.types.ts
import type { StockSummary } from '@myproject/shared-types';
// バックエンドと同じ型定義をそのまま使える
```

---

## モノリポ採用の判断基準

| 採用すべき場面 | 採用しない場面 |
|--------------|--------------|
| フロント・バックで型を共有したい | 独立したサービスで型の共有が不要 |
| 共通UIコンポーネントを複数アプリで使いたい | プロジェクトが単一のアプリだけ |
| フロント・バックのデプロイを同期したい | チームがリポジトリを分けたい |

---

## よくある落とし穴

- `apps/web` が `apps/api` を直接importする → 禁止（`packages/` 経由にする）
- `packages/` が `apps/` をimportする → 禁止（依存の逆転）
- 共通ライブラリを増やしすぎて `packages/` が肥大化する → ドメイン固有のものはapps内に留める
