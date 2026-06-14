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
