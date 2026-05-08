# 技術スタック設定ファイルの自動展開ルール

このルールは `ARCHITECTURE.md` を参照または更新する際に自動で適用される。

## 検出と展開の手順

`ARCHITECTURE.md` の「技術スタック」セクションを読んだとき、
以下の手順を **自動で**（ユーザーへの確認なしに）実行する：

### Step 1: 言語の検出

「言語」行の値を確認する。プレースホルダー（`[TypeScript / Python / etc.]`）のままであれば
このルールを適用しない。実際の言語名が記入されていれば Step 2 へ進む。

### Step 2: 必要な設定ファイルの確認と展開

検出した言語に応じて、以下のファイルが存在しない場合は作成する。
**ファイルが既に存在する場合は絶対に上書きしない。**

---

#### TypeScript が含まれる場合

```
tsconfig.base.json   → .claude/standards/ の雛形を参考に作成
.prettierrc          → 下記テンプレートで作成
```

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

---

#### Python が含まれる場合

```
requirements.txt      → 下記テンプレートで作成
requirements-dev.txt  → 下記テンプレートで作成
.python-version       → 下記テンプレートで作成
```

**`requirements.txt` テンプレート：**
```
# 本番環境の依存パッケージ
# pip install -r requirements.txt でインストール
```

**`requirements-dev.txt` テンプレート：**
```
# 開発環境のみの依存パッケージ
# pip install -r requirements-dev.txt でインストール
-r requirements.txt
pytest
pytest-cov
black
ruff
mypy
```

**`.python-version` テンプレート：**
```
3.12
```
（バージョンは ARCHITECTURE.md に記載がある場合はそちらを優先する）

展開後、ユーザーに以下を案内する：
> Python プロジェクト用の設定ファイルを作成しました。
> `pyproject.toml` が必要な場合は「pyproject.toml を作って」と伝えてください。

---

#### JavaScript（TypeScript なし）が含まれる場合

```
.prettierrc  → TypeScript と同じテンプレートで作成
```

---

#### Go が含まれる場合

`go.mod` はプロジェクト名が必要なため自動作成しない。
ユーザーに以下を案内する：
> Go プロジェクトの場合は `go mod init [モジュール名]` を実行してください。

---

#### Ruby が含まれる場合

`Gemfile` はプロジェクト固有のため自動作成しない。
ユーザーに以下を案内する：
> Ruby プロジェクトの場合は `bundle init` を実行してください。

---

#### Rust が含まれる場合

`Cargo.toml` はプロジェクト固有のため自動作成しない。
ユーザーに以下を案内する：
> Rust プロジェクトの場合は `cargo init` を実行してください。

---

### Step 3: .gitignore の補完

言語に応じて `.gitignore` に不足している除外パターンを追記する（重複チェックあり）：

**Python の場合：**
```
__pycache__/
*.py[cod]
*.egg-info/
.venv/
venv/
dist/
*.egg
.pytest_cache/
.mypy_cache/
.ruff_cache/
```

**Node.js / TypeScript の場合：**
```
node_modules/
dist/
build/
.next/
out/
*.tsbuildinfo
```

**Go の場合：**
```
*.exe
*.test
*.out
vendor/
```

**Ruby の場合：**
```
.bundle/
vendor/bundle/
*.gem
```

## 重要なルール

- **一度作成したファイルは上書きしない**
- **ユーザーが「〇〇の設定ファイルを作って」と言わなくても、言語が確定した時点で自動展開する**
- 展開したファイルは必ず一覧を報告する
- 不明点がある場合（バージョン等）は適切なデフォルト値を使い、後で変更できると案内する
