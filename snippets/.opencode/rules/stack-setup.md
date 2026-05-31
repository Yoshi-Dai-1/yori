---
paths:
  - ARCHITECTURE.md
---

# 技術スタック設定ファイルの自動展開ルール

このルールは `ARCHITECTURE.md` を参照または更新する際に自動で適用される。
`paths` に `ARCHITECTURE.md` を指定しているため、OpenCode が ARCHITECTURE.md を
読み書きするたびに自動で読み込まれる。

> **スコープについて**：このルールは ARCHITECTURE.md の編集時にのみ発火する。
> 全ファイル編集時への適用（`"**"`）は意図的に除外している。
> アーキテクチャ設定の生成は重い処理であり、毎回発火させると
> コンテキストを無駄に消費するためである。

## 検出と展開の手順

`ARCHITECTURE.md` の「技術スタック」セクションを読んだとき、
以下の手順を **自動で**（ユーザーへの確認なしに）実行する：

### Step 0: Plugin 依存関係のインストール

`.opencode/node_modules` が存在しない場合、以下を実行する：

1. `bun` がインストールされているか確認する（`which bun`）
2. `bun` が存在すれば `cd .opencode && bun install` を実行する
3. `bun` が存在しなければ `npm` の有無を確認し、`cd .opencode && npm install` をフォールバックとして実行する
4. 両方とも存在しない場合：**.opencode/node_modules** がないまま後続に進む（Plugin は動作しないが、設定ファイルの展開は続行する）

**インストール失敗時の対応：**
- インストールコマンドの終了コードが 0 以外の場合、`ls .opencode/node_modules/` でディレクトリの存在を確認する
- 失敗した場合、人間に以下を報告する：
  > ⚠️ Plugin 依存関係のインストールに失敗しました。
  > エラー: [終了コードとエラーメッセージ]
  > 手動で `cd .opencode && npm install` を実行してください。

### Step 1: 言語の検出

「言語」行の値を確認する。プレースホルダー（`[TypeScript / Python / etc.]`）のままであれば
このルールを適用しない。実際の言語名が記入されていれば Step 2 へ進む。

### Step 2: 必要な設定ファイルの確認と展開

このステップは以下の3種類の展開を含む。それぞれ実行条件が異なる。

```
種類1：言語別の自動展開
  条件：言語が確定している（プレースホルダー`[TypeScript / Python / etc.]`の形式でなく、
    「TypeScript」「JavaScript」「Python」「Go」「Ruby」「Rust」「Java」「Kotlin」「C」「C++」「C#」のいずれかが記載されている）
    + 対象ファイルがまだ存在しない
  挙動：確認なしで自動作成する
   対象：tsconfig.json / pyproject.toml / .prettierrc（各言語ブロックの定義に従う）

種類2：プロジェクト名・設定が必要なため案内のみ
  条件：該当言語が確定している
  挙動：自動作成せず、実行すべきコマンドを人間に案内する
   対象：go.mod（go mod init が必要）/ Gemfile（各言語ブロックの定義に従う）

種類3：アーキテクチャ種別別の確認付き展開
  条件：ARCHITECTURE.md の「採用アーキテクチャ」が確定している + 対象ツールが記載されている
  挙動：ファイルの役割と影響を説明した上で、人間の承認後のみ作成する
   対象：electron-builder.yml / tauri.conf.json / backend.tf / cdk.json（アーキテクチャ種別ブロックの定義に従う）
```

**実行前に `プロジェクトルート/.opencode/project-context.md` の「設定ファイルの自動展開レベル」を確認する。ファイルが存在しない場合は「未設定」として扱う。**

```
「自動展開」と記載されている    → 種類1は確認なしで実行する（デフォルト）
「確認付き展開」と記載されている → 種類1も含めすべての設定ファイル作成前に
                                   内容・役割・影響を説明し、承認を得てから作成する
「展開なし」と記載されている    → 種類1・2をすべてスキップする。
                                   必要なファイルと作成方法を提案のみ行う
「未設定」または記載がない      → 「設定ファイルの自動展開レベル」を人間に確認し、
                                   以下の3択から選択してもらう：
                                   1. 自動展開（デフォルト・初心者〜標準）
                                   2. 確認付き展開（上級者向け）
                                   3. 展開なし（上級者・独自構成あり）
                                   選択後、project-context.md の「未設定」を選択した値に書き換えてから実行する
```

**ファイルが既に存在する場合はいかなる場合も上書きしない。**
存在する場合は「既に存在するためスキップした」と報告する。

### ツールインストールの自動化ルール

`.opencode/project-context.md` の「設定ファイルの自動展開レベル」に従い、
各言語ブロックに記載されたツールインストールを自動実行・または確認後に実行する：

```
「自動展開」     → 確認なしでインストールコマンドを実行する
「確認付き展開」 → インストールコマンドを提示し、承認後に実行する
「展開なし」     → インストールコマンドの提示のみ行う
```

**すべてのインストールにおいて以下の手順を守る：**

1. **事前確認**：インストール前に `which <tool>` で既存インストールの有無を確認する
   - 既にインストール済みの場合 → スキップし、スキップした事実を記録する
2. **OS判定**：`uname -s` の出力値に従い、以下の対応表でコマンドを選択する
   - `Darwin` → macOS 用コマンド（brew）
   - `Linux` → Linux 用コマンド（apt / dnf / snap）
   - 上記以外 → 以下の優先順位で実行する：
     1. `which choco` が成功 → Windows 用コマンド（choco）
     2. `which scoop` が成功 → Windows 用コマンド（scoop）
     3. `which winget` が成功 → Windows 用コマンド（winget）
     4. `which wsl` が成功 → Linux 用コマンド（WSL 経由）
     5. すべて失敗 → 「手動インストールが必要」と人間に報告する
3. **実行後の確認**：以下の2つを両方実行する
   a. `which <tool>` でバイナリの存在確認
   b. `<tool> --version` で実行可能確認
4. **失敗時の報告**：終了コードが 0 以外の場合、人間に以下を報告する：
   ```
   ⚠️ [ツール名] のインストールに失敗しました。
   エラー: [終了コードとエラーメッセージ]
   以下を試してください：
   - [代替のインストール方法1]
   - [代替のインストール方法2]
   インストールをスキップして続行します。
   ```
5. インストールをスキップした場合も、スキップした理由を人間に報告する

---

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

---

#### Python が含まれる場合

```
requirements.txt      → 下記テンプレートで作成
requirements-dev.txt  → 下記テンプレートで作成
.python-version       → 下記テンプレートで作成
pyproject.toml        → 下記テンプレートで作成（Ruff・mypy の設定を含む）
```

**インストールを実行する（全OS対応）：**
```bash
pip install ruff mypy
```
（mypy は `requirements-dev.txt` に含まれているが、グローバルにもインストール推奨）
`pip` 未インストールの場合は以下の優先順位でインストールする：
1. `python -m ensurepip --upgrade` を試す
2. 失敗した場合は OS 標準のパッケージマネージャー（apt / dnf / brew / choco）で `python3-pip` または `python-pip` をインストールする

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
> lint・フォーマットの自動チェックには `.opencode/plugins/lint-and-typecheck.ts` が有効です（`.opencode/plugins/README.md` 参照）。
> `pyproject.toml` に追加設定が必要な場合は「pyproject.toml を編集して」と伝えてください。

---

#### Go が含まれる場合

`go.mod` はプロジェクト名が必要なため自動作成しない。

**インストール：** gofmt / go vet は Go 標準ツールのため追加インストール不要。

ユーザーに以下を案内する：
> Go プロジェクトの場合は `go mod init [モジュール名]` を実行してください。
> gofmt と go vet は Go 標準ツールのため追加インストール不要です。
> lint・フォーマットの自動チェックには `.opencode/plugins/lint-and-typecheck.ts` が有効です（`.opencode/plugins/README.md` 参照）。

---

#### Ruby が含まれる場合

`Gemfile` はプロジェクト固有のため自動作成しない。

**インストールを実行する（全OS対応）：**
```bash
gem install rubocop
```
`gem` は Ruby に同梱。未インストールの場合は `https://www.ruby-lang.org/` からインストールする。

ユーザーに以下を案内する：
> Ruby プロジェクトの場合は `bundle init` を実行してください。
> RuboCop は lint・フォーマット両方を担当します。`gem install rubocop` でインストールしてください。
> lint・フォーマットの自動チェックには `.opencode/plugins/lint-and-typecheck.ts` が有効です（`.opencode/plugins/README.md` 参照）。

---

#### Swift が含まれる場合

`Package.swift` はプロジェクト固有のため自動作成しない。

**インストールを実行する（OS別）：**
```bash
# macOS
brew install swift-format swiftlint

# Linux (Debian/Ubuntu)
apt-get install swiftlint
# swift-format: Swift ツールチェーンに同梱。未同梱の場合は brew またはソースビルド

# Windows（上から順に試す）
wsl apt-get install swiftlint   # WSL 環境
choco install swiftlint         # WSL がない場合
```
Swift の公式ツールチェーンは `https://www.swift.org/install/` から各OS向けにインストール可能。

ユーザーに以下を案内する：
> Swift プロジェクトの場合は `swift package init` を実行してください。
> フォーマット: `swift-format --in-place`、lint: `swiftlint` を推奨します。
> lint・フォーマットの自動チェックには `.opencode/plugins/lint-and-typecheck.ts` が有効です（`.opencode/plugins/README.md` 参照）。

---

#### Rust が含まれる場合

`Cargo.toml` はプロジェクト固有のため自動作成しない。

**インストールを実行する（全OS対応）：**
```bash
rustup component add rustfmt clippy
```
`rustup` 未インストールの場合は `https://rustup.rs` からインストールする。

ユーザーに以下を案内する：
> Rust プロジェクトの場合は `cargo init` を実行してください。
> rustfmt と Clippy は `rustup component add rustfmt clippy` でインストールしてください。
> lint・フォーマットの自動チェックには `.opencode/plugins/lint-and-typecheck.ts` が有効です（`.opencode/plugins/README.md` 参照）。

---

#### Kotlin が含まれる場合

プロジェクト固有の情報（groupId・artifactId・version）が必要なため自動作成しない。

**インストールを実行する（OS別、上から順に試す）：**
```bash
# macOS
brew install ktlint

# Linux（snap が使えない場合は手動ダウンロード）
sudo snap install ktlint
curl -sSLO https://github.com/pinterest/ktlint/releases/latest/download/ktlint && chmod +x ktlint && sudo mv ktlint /usr/local/bin/

# Windows
scoop install ktlint
choco install ktlint
```

ユーザーに以下を案内する：
> Mavenプロジェクト: `mvn archetype:generate` で対話的に作成してください。
> Gradleプロジェクト: `gradle init` で作成してください。
> lint・フォーマット: ktlint を推奨します（`ktlint -F` で自動修正）。
> lint・フォーマットの自動チェックには `.opencode/plugins/lint-and-typecheck.ts` が有効です（`.opencode/plugins/README.md` 参照）。

---

#### Java が含まれる場合

> **Plugin 層の注意**：Java は `lint-and-typecheck.ts` での per-edit チェックをスキップしています。
> 理由は高速CLIツール不在のため。プロジェクト固有のビルドツール経由（checkstyle/pmd/spotbugs）で品質チェックしてください。

プロジェクト固有の情報（groupId・artifactId・version）が必要なため自動作成しない。

**インストール（全OS対応、ビルドツール経由）：**
```bash
# Maven プラグイン追加（pom.xml に記述）
mvn checkstyle:check  # 実行時にプラグイン自動ダウンロード

# Gradle プラグイン追加（build.gradle.kts に記述）
gradle check  # 実行時にプラグイン自動ダウンロード
```
- Maven: `pom.xml` に `maven-checkstyle-plugin` / `maven-pmd-plugin` を追加
- Gradle: `build.gradle.kts` に `checkstyle` / `pmd` / `spotbugs` プラグインを追加
- Maven/Gradle は各OSで動作（Java ランタイムが必要）

ユーザーに以下を案内する：
> Mavenプロジェクト: `mvn archetype:generate` で対話的に作成してください。
> Gradleプロジェクト: `gradle init` で作成してください。
> lint・フォーマット: Checkstyle / PMD / SpotBugs（Java）を推奨します。
> これらはビルドツール経由で実行するため、`.opencode/plugins/` ではなくプロジェクト側の設定で管理します。

---

#### C/C++ が含まれる場合

ビルドシステム・コンパイラ設定がプロジェクト固有のため自動作成しない。

**インストールを実行する（OS別）：**
```bash
# macOS
brew install clang-format

# Linux (Debian/Ubuntu)
sudo apt install clang-format

# Linux (RHEL/Fedora)
sudo dnf install clang-format

# Windows（上から順に試す）
choco install llvm
scoop install llvm
winget install LLVM.LLVM
```
> **注：** clang-tidy は lint-and-typecheck.ts では実行しません（遅すぎるため）。
> CI パイプラインでのみ実行することを推奨します。

ユーザーに以下を案内する：
> ビルド設定ファイル（CMakeLists.txt / Makefile）をプロジェクトに合わせて作成してください。
> フォーマット: clang-format、lint: clang-tidy を推奨します。
> `clang-format --style=LLVM -i [ファイル]` でフォーマットできます。

---

#### C# が含まれる場合

プロジェクト固有の情報が必要なため自動作成しない。

**インストール（全OS対応）：** .NET SDK に `dotnet format` が標準で含まれているため、追加インストール不要。
.NET SDK 未インストールの場合は `https://dotnet.microsoft.com/download` から各OS向けにインストールする。

ユーザーに以下を案内する：
> `dotnet new [テンプレート名]` でプロジェクトを作成してください。
> （例: `dotnet new webapi` / `dotnet new console` / `dotnet new classlib`）
> lint・フォーマット: `dotnet format` を推奨します。

---

#### PHP が含まれる場合

> **Plugin 層の注意**：PHP は `lint-and-typecheck.ts` での per-edit チェックをスキップしています。
> 理由は高速CLIツール不在のため。プロジェクト固有の Composer 経由（PHPStan / Psalm）で品質チェックしてください。

プロジェクト固有の情報（ベンダー名・パッケージ名・description）が必要なため自動作成しない。

**インストールを実行する（全OS対応）：**
```bash
# プロジェクトローカル（優先）
composer require --dev phpstan/phpstan
composer require --dev vimeo/psalm

# プロジェクトローカルが失敗した場合にグローバルを試す
composer global require phpstan/phpstan
```
`composer` 未インストールの場合は `https://getcomposer.org/download/` から各OS向けにインストールする。

ユーザーに以下を案内する：
> PHP プロジェクトの場合は `composer init` で初期化してください。
> lint・フォーマット: PHPStan / Psalm を推奨します（静的解析）。
> これらは Composer 経由で実行するため、`.opencode/plugins/` ではなくプロジェクト側の設定で管理します。

---

#### 環境変数（.env）の展開

**実行前に `プロジェクトルート/.opencode/project-context.md` の「設定ファイルの自動展開レベル」を確認する。**

```
「自動展開」と記載されている場合：
  → .env が存在しない場合、.env.example を .env にコピーする
  → .env が存在しても中身が空（またはコメントのみ）の場合、
    プロジェクトの性質に応じて初期値を記入する（例：NODE_ENV=development、PORT=3000）
  → 機密情報（JWT_SECRET・API_KEY・DATABASE_URL・STRIPE_SECRET_KEY）は空欄のままにする
  → .env が既に実値で記入されている場合は「既に設定済みのためスキップした」と報告する

「確認付き展開」と記載されている場合：
  → .env が存在しない、または空の場合、作成候補と記入予定値を提示し、承認後に作成・記入する
  → 提示内容例：
    「以下の環境変数を持つ .env ファイルを作成します。機密情報は空欄です。
     NODE_ENV=development, PORT=3000, DATABASE_URL=（空欄）, JWT_SECRET=（空欄）
     作成しますか？[Y/n]」
  → .env が既に実値で記入されている場合はスキップする

「展開なし」と記載されている場合：
  → .env.example の存在と「cp .env.example .env」コマンドを案内するのみ
  → 作成・記入はしない
```

---

**アーキテクチャ種別別の追加ファイル展開（以下はアーキテクチャ種別が確定している場合のみ実行する）**

ARCHITECTURE.md の「採用アーキテクチャ」が未記入、またはプレースホルダーのままの場合 → 以下をすべてスキップし、人間に「ARCHITECTURE.md の採用アーキテクチャを記入してください」と伝える。
ARCHITECTURE.md が編集され「採用アーキテクチャ」が記入された場合 → このセクションを再実行する。

---

#### デスクトップアプリ（Electron）が含まれる場合

`ARCHITECTURE.md` のアーキテクチャ種別が `desktop-app` かつ使用ツールに `Electron` が記載されている場合のみ実行する。

ユーザーに以下を確認してから作成する：
> Electron プロジェクト用のパッケージング設定ファイル `electron-builder.yml` を作成しますか？
> このファイルはアプリのインストーラー・実行ファイルの生成設定です。
> ターゲットOS（Windows / macOS / Linux）と署名証明書の有無により内容が変わります。
> 作成する場合はターゲットOSを教えてください。

承認された場合のみ、指定されたターゲットOSに合わせた `electron-builder.yml` を作成する。

#### デスクトップアプリ（Tauri）が含まれる場合

`ARCHITECTURE.md` のアーキテクチャ種別が `desktop-app` かつ使用ツールに `Tauri` が記載されている場合のみ実行する。

ユーザーに以下を確認してから作成する：
> Tauri プロジェクト用の設定ファイル `tauri.conf.json` を作成しますか？
> このファイルはアプリのウィンドウ設定・権限設定・ビルド設定を管理します。
> 作成する場合はアプリ名とターゲットOSを教えてください。

承認された場合のみ作成する。

#### IaC（Terraform / OpenTofu）が含まれる場合

`ARCHITECTURE.md` のアーキテクチャ種別が `iac` かつ使用ツールに `Terraform` または `OpenTofu` が記載されている場合のみ実行する。

ユーザーに以下を確認してから作成する：
> Terraform プロジェクト用のディレクトリ構成（`environments/dev/` `environments/prod/` `modules/`）と
> リモートバックエンド設定ファイルを作成しますか？
> このファイルはクラウドリソースの状態管理ファイルの保存先を定義します（S3 / GCS / Azure Blob）。
> 誤ったバックエンド設定はクラウドリソースの重複・削除につながるため、確認が必要です。
> 作成する場合はクラウドプロバイダー（AWS / GCP / Azure）を教えてください。

承認された場合のみ、指定されたプロバイダーに合わせた `backend.tf` と基本ディレクトリ構成を作成する。

#### IaC（AWS CDK）が含まれる場合

`ARCHITECTURE.md` のアーキテクチャ種別が `iac` かつ使用ツールに `AWS CDK` が記載されている場合のみ実行する。

ユーザーに以下を確認してから作成する：
> AWS CDK プロジェクト用の設定ファイル `cdk.json` と基本ディレクトリ構成を作成しますか？
> このファイルは CDK アプリのエントリポイントとコンテキスト設定を管理します。
> 作成する場合は使用言語（TypeScript / Python）を教えてください。

承認された場合のみ作成する。

---

### Step 3: .gitignore の補完

**このステップは「設定ファイルの自動展開レベル」に関わらず常に実行する。**
理由：`.gitignore` への不備は機密情報のコミット漏洩に直結するため、
展開レベルが「展開なし」であっても安全を優先して補完する。
ただし重複チェックを行い、既存の除外パターンは上書きしない。

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

**IaC（Terraform / OpenTofu）が含まれる場合：**
```
.terraform/
*.tfstate
*.tfstate.backup
*.tfstate.lock.info
*.tfvars
!*.tfvars.example
override.tf
override.tf.json
*_override.tf
*_override.tf.json
crash.log
crash.*.log
```
IaC固有の `.gitignore` 補完は、`iac.md` がアーキテクチャ種別として選択されている場合のみ実行する。
`*.tfstate` のコミットは機密情報漏洩に直結するため、確認なく補完する。

**Ansible が含まれる場合：**
```
*.retry
inventory/
.vault_pass
```

**Helm が含まれる場合：**
```
charts/
*.tgz
```

## 重要なルール

- **一度作成したファイルは上書きしない**
- **設定ファイルの展開は `.opencode/project-context.md` の「設定ファイルの自動展開レベル」に従う**
  - 「自動展開」：言語が確定した時点で確認なしに展開する
  - 「確認付き展開」：言語が確定した時点で展開候補を提示し、承認を得てから展開する
  - 「展開なし」：展開候補を提示のみ行い、作成はしない
  - 記載なし（初回）：展開レベルを人間に確認してから実行する
- 展開したファイルは必ず一覧を報告する
- 不明点がある場合は以下のデフォルト値を使い、後で変更できると案内する:
    TypeScript → ES2022、Python → 3.12、Go → モジュール名のみの初期化、Node.js → LTS最新版、Ruby → 3.3

---

## Step 3.5：命名規則・必須ファイル・フレームワーク深掘り・コンプライアンスの確定

このステップは以下の**いずれか**のタイミングで実行する。人間からの指示を待たない。

- Step 2（設定ファイル展開）と Step 3（.gitignore 補完）の完了直後（初回）
- ARCHITECTURE.md の「技術スタック」「採用アーキテクチャ」「法的・コンプライアンス」セクションが更新されたとき（中盤更新）

### 実行条件

以下を**すべて**確認し、該当するブロックのみ実行する。

**ブロックA：命名規則の確定・転記**
- 実行条件：言語がプレースホルダーでない、かつ ARCHITECTURE.md の「命名規則」セクションに変更がある（初回はプレースホルダーが残っている、中盤更新は内容が変わった）
- 実行内容：
  1. `naming-conventions.md` の「命名規則の確定手順」セクションに従い、フレームワーク固有の追加命名規則をWeb検索で確認する
  2. 検索結果を📋フォーマットで人間に通知する
  3. ARCHITECTURE.md の「命名規則」セクションを確定値で更新する（SSOT）
  4. AGENTS.md の `## Code Style` セクションを ARCHITECTURE.md の確定値から転記する（「ARCHITECTURE.md より転記」とコメントを付ける）
     ただし「展開なし」モードの場合は転記内容を提示するのみとし、ファイルへの書き込みは行わない

**ブロックB：必須ファイルの確認・記録**
- 実行条件：言語またはフレームワークが新たに確定・変更された
- 実行内容：
  1. `directory-structure.md` の「AIが自律実行する必須ファイルの確認」セクションに従い、必須ファイルをWeb検索で確認する
  2. クラウド・アーキテクチャ・業種が ARCHITECTURE.md に記入済みであれば追加検索する
  3. 検索結果を📋フォーマットで人間に通知する
  4. 確認した必須ファイルを ARCHITECTURE.md の「技術スタック」セクション末尾に記録する（SSOT）

**ブロックC：フレームワーク固有設計の深掘り**
- 実行条件：ARCHITECTURE.md の「フレームワーク」行に具体的なフレームワーク名が記入されている
- 実行内容：
  1. 以下の検索クエリを実行する
     - `[フレームワーク名] official project structure best practices [現在年]`
     - `[フレームワーク名] official coding conventions [現在年]`
     - バージョンが記載されている場合：`[フレームワーク名] [バージョン] migration guide [現在年]`（破壊的変更の確認）
  2. 検索結果を📋フォーマットで人間に通知する
   3. フレームワーク固有の設計パターン・制約（ルーティング規約・ファイル命名強制・コンポーネント構成規約）を ARCHITECTURE.md の「アーキテクチャ固有設計」セクションに追記する

**ブロックD：コンプライアンス要件の自律深掘り**
- 実行条件：ARCHITECTURE.md の「法的・コンプライアンス」セクション、および `docs/project-definition.md` の「業界固有の規制」行の**両方を確認**し、どちらかに「なし」以外の値が記入されている
- 実行内容（人間の指示を待たない）：
  1. `security-requirements.md` の「Step 3：適用される法令・標準の特定」を読み、記入された業種・規制に対応する法令・標準を特定する
  2. 特定した法令・標準ごとに以下の検索クエリを実行する
     - 日本の法令の場合：`[法令名] [現在年] 改正`
     - 国際標準・英語圏の標準の場合：`[法令・標準名] [現在年] latest`
     - コンプライアンス実装の確認：`[法令・標準名] compliance checklist [現在年]`
  3. 検索結果を📋フォーマットで人間に通知する
  4. 特定したコンプライアンス要件を ARCHITECTURE.md の「非機能要件 → 法的・コンプライアンス」セクションに追記する
  5. AGENTS.md の `## Security Boundaries` の「このプロジェクト固有の制約」に対応事項を追記する

**ブロックE：ライセンス確認とプライバシーポリシー要否の判定**
- 実行条件：以下のいずれかを満たす場合に実行する
  - ARCHITECTURE.md の「技術スタック → 外部APIライセンス」が「未確認」のまま
  - `docs/project-definition.md` の「個人情報」行に「あり」または具体的なデータ種別が記入されている
- 実行内容（人間の指示を待たない）：

  **ライセンス確認（外部APIライセンスが「未確認」の場合）：**
  1. ARCHITECTURE.md に記載されている外部APIおよびOSSライブラリを一覧化する
  2. 各ライブラリ・APIについて以下を確認する
     - OSSライブラリ：ライセンス種別（MIT / Apache 2.0 / GPL / BSD / LGPL）と商用利用の可否
     - GPLライセンスのライブラリを使用する場合：コード公開義務（コピーレフト）が生じることを人間に報告する
     - 外部API：利用規約の商用利用条項
     - 確認クエリ：`[ライブラリ名] license [現在年]` / `[API名] terms of service commercial use [現在年]`
  3. 確認結果を📋フォーマットで人間に通知する
  4. ARCHITECTURE.md の「外部APIライセンス」を「確認済み」に更新し、懸念事項があれば記録する

  **プライバシーポリシー要否の判定（個人情報を扱う場合）：**
  1. `security-requirements.md` の Step 3 に従い適用法令を特定する
  2. 適用法令に基づきプライバシーポリシーの作成義務があるか判定する
     - 個人情報保護法（日本）：個人情報を取り扱う事業者は作成・公表が義務
     - GDPR：EUユーザーを対象とする場合は作成が必須
  3. 作成義務があると判定した場合、以下を人間に報告する
     ```
     📋 プライバシーポリシーの作成が必要です
       根拠法令：[特定した法令名]
       必要な記載事項の最新要件を確認する：
         `[法令名] プライバシーポリシー 記載事項 [現在年]`
       作成を開始しますか？（作成する場合は「はい」と答えてください）
     ```
  4. 「はい」が返答された場合のみ、プライバシーポリシーのドラフトを作成する
     - 作成場所：`docs/privacy-policy.md`
     - 必ず「法的判断は専門家（弁護士）に確認する」旨を文書冒頭に記載する

**ブロックF：アクセシビリティ要件の自律提案**
- 実行条件：ARCHITECTURE.md の「採用アーキテクチャ」が以下のいずれかである
  - `web-frontend-large` または `web-frontend-small`
  - `monorepo`（フロントエンドを含む場合）
  - `microservices`（UIサービスを含む場合）
- 実行内容（人間の指示を待たない）：
  1. `.opencode/standards/principles/non-functional-requirements.md` の「アクセシビリティ」セクションを参照する
  2. ARCHITECTURE.md の「非機能要件」セクションにアクセシビリティの記載がない場合のみ実行する
     （既に記載がある場合はスキップする）
  3. 以下を人間に報告する
     ```
     📋 Webフロントエンドが含まれるプロジェクトのため、アクセシビリティ要件の定義を推奨します
       根拠：`.opencode/standards/principles/non-functional-requirements.md`「アクセシビリティ」セクション
       最低限定義すべきこと：
         - WCAGの適合レベル目標（Level A / AA / AAA）
         - 法的義務の有無（公共機関向けサービス・障害者向けサービスの場合は専門家確認が必要）
       最新のWCAG要件を確認する：`WCAG 2.2 requirements [現在年]`
       アクセシビリティ要件を ARCHITECTURE.md に追加しますか？
       （「はい」の場合は適合レベル目標を教えてください。後で決める場合は「スキップ」と答えてください）
     ```
  4. 適合レベルが指定された場合のみ ARCHITECTURE.md の「非機能要件」セクションに追記する
     「スキップ」が返答された場合は `decisions/` に「アクセシビリティ要件を保留した理由」を記録することを提案する

### このステップが終わるまで Step 4 に進まない

実行対象となったすべてのブロック（A〜F）の完了・記録が完了してから Step 4 に進む。

---

## Step 3.6：アーキテクチャ固有ルールの適用

ARCHITECTURE.md の「採用アーキテクチャ」セクションがプレースホルダーから具体的な値に更新されたとき、
以下の**すべての条件**を満たす場合のみ実行する。1つでも満たさない場合はスキップする：

**条件1**：「採用アーキテクチャ」に具体的なアーキテクチャ名が記載されている
  （`[backend-api / web-frontend-small / microservices / etc.]` のプレースホルダー形式でない）
**条件2**：前回のセッションから「採用アーキテクチャ」の値が変更された、または初回設定である
**条件3**：対応する `architectures/[アーキテクチャ名].md` ファイルが存在する

実行内容：
1. `architectures/[アーキテクチャ名].md` を読む
2. そのアーキテクチャ固有の「必須チェック項目」を特定する
3. 必須チェック項目を AGENTS.md の `## Boundaries` セクションまたは `## Security Boundaries` セクションに追記する
4. 該当アーキテクチャ固有のセキュリティ・レジリエンス制約がある場合、対応するルールファイルも参照する
5. 適用したルールを人間に報告する

除外条件：
- 「採用アーキテクチャ」がまだプレースホルダーのまま
- 前回の値から変更がない（既に適用済み）
- `monorepo` のように複数パターンを併用する設定で、各パターンが個別に処理済み

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

3つの条件すべてを満たす場合、以下をユーザーに確認する：

```
アーキテクチャ違反の検出設定がまだ生成されていません。
「層のルール」に記入された層定義を使ってリンター設定を自動生成します。
生成すると、コードを書くたびに依存方向の違反が即座に検出されます。

生成しますか？（推奨）[Y/n]
```

「Y」「y」「はい」のいずれかが返答された場合、および返答なしで Enter が押された場合は、
ARCHITECTURE.md の Step 5-B2 のワークフローをそのまま実行する（追加の指示を待たない）。
「N」「n」「いいえ」のいずれかが返答された場合はスキップして通常の作業を続行する。
