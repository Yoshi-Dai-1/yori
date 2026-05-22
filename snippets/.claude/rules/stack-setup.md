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

このステップは以下の3種類の展開を含む。それぞれ実行条件が異なる。

```
種類1：言語別の自動展開
  条件：言語が確定している + 対象ファイルがまだ存在しない
  挙動：確認なしで自動作成する
  対象：tsconfig.json / pyproject.toml / .eslintrc 等

種類2：プロジェクト名・設定が必要なため案内のみ
  条件：該当言語が確定している
  挙動：自動作成せず、実行すべきコマンドを人間に案内する
  対象：go.mod（go mod init が必要）/ Gemfile 等

種類3：アーキテクチャ種別別の確認付き展開
  条件：ARCHITECTURE.md の「採用アーキテクチャ」が確定している + 対象ツールが記載されている
  挙動：ファイルの役割と影響を説明した上で、人間の承認後のみ作成する
  対象：electron-builder.yml / tauri.conf.json / backend.tf / cdk.json 等
```

**実行前に `.claude/project-context.md` の「設定ファイルの自動展開レベル」を確認する。**

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

**アーキテクチャ種別別の追加ファイル展開（以下はアーキテクチャ種別が確定している場合のみ実行する）**

ARCHITECTURE.md の「採用アーキテクチャ」が未記入、またはプレースホルダーのままの場合は以下をすべてスキップする。
確認が必要な場合は、人間に「ARCHITECTURE.md の採用アーキテクチャを記入してください」と伝えてからスキップする。

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
> このファイルはクラウドリソースの状態管理ファイルの保存先を定義します（S3 / GCS 等）。
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
- **設定ファイルの展開は `.claude/project-context.md` の「設定ファイルの自動展開レベル」に従う**
  - 「自動展開」：言語が確定した時点で確認なしに展開する
  - 「確認付き展開」：言語が確定した時点で展開候補を提示し、承認を得てから展開する
  - 「展開なし」：展開候補を提示のみ行い、作成はしない
  - 記載なし（初回）：展開レベルを人間に確認してから実行する
- 展開したファイルは必ず一覧を報告する
- 不明点がある場合（バージョン等）は適切なデフォルト値を使い、後で変更できると案内する

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
  3. フレームワーク固有の設計パターン・制約（ルーティング規約・ファイル命名強制等）を ARCHITECTURE.md の「アーキテクチャ固有設計」セクションに追記する

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
     - OSSライブラリ：ライセンス種別（MIT / Apache 2.0 / GPL 等）と商用利用の可否
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
  1. `non-functional-requirements.md` の「アクセシビリティ」セクションを参照する
  2. ARCHITECTURE.md の「非機能要件」セクションにアクセシビリティの記載がない場合のみ実行する
     （既に記載がある場合はスキップする）
  3. 以下を人間に報告する
     ```
     📋 Webフロントエンドが含まれるプロジェクトのため、アクセシビリティ要件の定義を推奨します
       根拠：non-functional-requirements.md「アクセシビリティ」セクション
       最低限定義すべきこと：
         - WCAGの適合レベル目標（Level A / AA / AAA）
         - 法的義務の有無（公共機関・障害者向けサービス等の場合は専門家確認が必要）
       最新のWCAG要件を確認する：`WCAG 2.2 requirements [現在年]`
       アクセシビリティ要件を ARCHITECTURE.md に追加しますか？
       （「はい」の場合は適合レベル目標を教えてください。後で決める場合は「スキップ」と答えてください）
     ```
  4. 適合レベルが指定された場合のみ ARCHITECTURE.md の「非機能要件」セクションに追記する
     「スキップ」が返答された場合は `decisions/` に「アクセシビリティ要件を保留した理由」を記録することを提案する

### このステップが終わるまで Step 4 に進まない

実行対象となったすべてのブロック（A〜F）の完了・記録が完了してから Step 4 に進む。

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
