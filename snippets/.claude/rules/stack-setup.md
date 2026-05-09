---
paths:
  - ARCHITECTURE.md
---

# 技術スタック設定ファイルの自動展開ルール

このルールは `ARCHITECTURE.md` を参照または更新する際に自動で適用される。
`paths` に `ARCHITECTURE.md` を指定しているため、Claude Code が ARCHITECTURE.md を
読み書きするたびに自動で読み込まれる。

> **スコープについて**：このルールは ARCHITECTURE.md の編集時にのみ発火する。
> 全ファイル編集時への適用（`"**"`）は意図的に除外している。
> アーキテクチャ設定の生成は重い処理であり、毎回発火させると
> コンテキストを無駄に消費するためである。

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
> lint・フォーマットを自動化するには `.claude/hooks/on-post-tool-use.lint-and-typecheck.sh.example`
> の `.example` を外して有効化することを推奨します（`.claude/hooks/README.md` 参照）。

---

#### JavaScript（TypeScript なし）が含まれる場合

```
.prettierrc  → TypeScript と同じテンプレートで作成
```

展開後、ユーザーに以下を案内する：
> JavaScript プロジェクト用の Prettier 設定を作成しました。
> lint・フォーマットを自動化するには `.claude/hooks/on-post-tool-use.lint-and-typecheck.sh.example`
> の `.example` を外して有効化することを推奨します（`.claude/hooks/README.md` 参照）。

---

#### Python が含まれる場合

```
requirements.txt      → 下記テンプレートで作成
requirements-dev.txt  → 下記テンプレートで作成
.python-version       → 下記テンプレートで作成
pyproject.toml        → 下記テンプレートで作成（Ruff・Black の設定を含む）
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
ruff
mypy
```

**`.python-version` テンプレート：**
```
3.12
```
（バージョンは ARCHITECTURE.md に記載がある場合はそちらを優先する）

**`pyproject.toml` テンプレート（Ruff 設定）：**
```toml
[tool.ruff]
line-length = 100
target-version = "py312"

[tool.ruff.lint]
select = ["E", "F", "I", "N", "W", "UP"]
ignore = []

[tool.ruff.format]
quote-style = "double"
indent-style = "space"

[tool.mypy]
strict = true
```

展開後、ユーザーに以下を案内する：
> Python プロジェクト用の設定ファイルを作成しました。
> lint・フォーマットを自動化するには `.claude/hooks/on-post-tool-use.lint-and-typecheck.sh.example`
> の `.example` を外して有効化することを推奨します（`.claude/hooks/README.md` 参照）。
> `pyproject.toml` に追加設定が必要な場合は「pyproject.toml を編集して」と伝えてください。

---

#### Go が含まれる場合

`go.mod` はプロジェクト名が必要なため自動作成しない。
ユーザーに以下を案内する：
> Go プロジェクトの場合は `go mod init [モジュール名]` を実行してください。
> gofmt と go vet は Go 標準ツールのため追加インストール不要です。
> lint・フォーマットを自動化するには `.claude/hooks/on-post-tool-use.lint-and-typecheck.sh.example`
> の `.example` を外して有効化することを推奨します（`.claude/hooks/README.md` 参照）。

---

#### Ruby が含まれる場合

`Gemfile` はプロジェクト固有のため自動作成しない。
ユーザーに以下を案内する：
> Ruby プロジェクトの場合は `bundle init` を実行してください。
> RuboCop は lint・フォーマット両方を担当します。`gem install rubocop` でインストールしてください。
> lint・フォーマットを自動化するには `.claude/hooks/on-post-tool-use.lint-and-typecheck.sh.example`
> の `.example` を外して有効化することを推奨します（`.claude/hooks/README.md` 参照）。

---

#### Rust が含まれる場合

`Cargo.toml` はプロジェクト固有のため自動作成しない。
ユーザーに以下を案内する：
> Rust プロジェクトの場合は `cargo init` を実行してください。
> rustfmt と Clippy は `rustup component add rustfmt clippy` でインストールしてください。
> lint・フォーマットを自動化するには `.claude/hooks/on-post-tool-use.lint-and-typecheck.sh.example`
> の `.example` を外して有効化することを推奨します（`.claude/hooks/README.md` 参照）。

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

**Node.js / TypeScript / JavaScript の場合：**
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

**Rust の場合：**
```
target/
*.pdb
```

## 重要なルール

- **一度作成したファイルは上書きしない**
- **ユーザーが「〇〇の設定ファイルを作って」と言わなくても、言語が確定した時点で自動展開する**
- 展開したファイルは必ず一覧を報告する
- 不明点がある場合（バージョン等）は適切なデフォルト値を使い、後で変更できると案内する

---

## Step 4：アーキテクチャ違反検出設定のフォールバック確認

このステップは ARCHITECTURE.md の対話プロンプトを通さずに直接編集された場合の補完として動作する。
以下の**すべての条件**を満たす場合のみ実行する。1つでも満たさない場合はスキップする：

**条件1**：「層のルール」セクションに実際の層名が記入されている
（`[層A]` のようなプレースホルダーが残っていない）

**条件2**：言語がプレースホルダーでない（`[TypeScript / Python / etc.]` でない）

**条件3**：アーキテクチャ違反検出設定がまだ存在しない
- JS/TS の場合：`eslint.config.mjs` / `.eslintrc.json` / `eslint.config.js` のいずれかに
  `no-restricted-imports` または `boundaries/element-types` ルールが含まれていない
- Python の場合：`pyproject.toml` に `TID` ルールが含まれていない
- Go / Rust / Ruby の場合：ARCHITECTURE.md の「コード品質」に月次診断の記述がない

3つの条件すべてを満たす場合、以下を案内する：

```
アーキテクチャ違反の検出設定がまだ生成されていません。
「層のルール」に記入された層定義を使ってリンター設定を自動生成できます。
生成しますか？（推奨）

生成する場合は「アーキテクチャ設定を生成して」と伝えてください。
生成すると、コードを書くたびに依存方向の違反が即座に検出されます。
```

「生成して」と返答された場合は、ARCHITECTURE.md の Step 5-B2 のワークフローを実行する。
