#### TypeScript が含まれる場合

```
tsconfig.base.json   → 下記インラインテンプレートで作成
.prettierrc          → 下記テンプレートで作成
```

**インストールを実行する（全OS対応）：**
```bash
npm install --save-dev typescript prettier
```
`npm` は Node.js に同梱。未インストールの場合は `https://nodejs.org` からインストールする。
`tsconfig.json` の strict 系オプション・eslint 設定はアーキテクチャ種別（web-frontend / backend-api / monorepo）に応じて、ARCHITECTURE.md の「アーキテクチャ固有設計」セクションの指示に従って調整する。

**tsconfig.base.json テンプレート：**
```json
{
  "$schema": "https://json.schemastore.org/tsconfig",
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true
  }
}
```

**`.prettierrc` テンプレート：**
```json
{
  "semi": false,
  "singleQuote": true,
  "trailingComma": "all",
  "printWidth": 100,
  "tabWidth": 2
}
```

展開後、ユーザーに以下を案内する：
> TypeScript プロジェクト用の設定ファイルを作成しました。
> `tsconfig.json`（プロジェクト固有）は別途 ARCHITECTURE.md の指示に従って作成します。
> lint・フォーマットの自動チェックには `.opencode/plugins/lint-and-typecheck.ts` が有効です（`.opencode/plugins/README.md` 参照）。

---

#### JavaScript（TypeScript なし）が含まれる場合

```
.prettierrc  → TypeScript と同じテンプレートで作成
```

**インストールを実行する（全OS対応）：**
```bash
npm install --save-dev prettier
```
`npm` は Node.js に同梱。未インストールの場合は `https://nodejs.org` からインストールする。

展開後、ユーザーに以下を案内する：
> JavaScript プロジェクト用の Prettier 設定を作成しました。
> lint・フォーマットの自動チェックには `.opencode/plugins/lint-and-typecheck.ts` が有効です（`.opencode/plugins/README.md` 参照）。
