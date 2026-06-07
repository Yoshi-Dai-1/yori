# 技術スタック設定ファイルの展開ルール

`ARCHITECTURE.md` 編集時に Plugin が注入する。

## 検出と展開の手順

### Step 0: Plugin 依存関係のインストール

`.opencode/node_modules` が存在しない場合、以下を実行する：

1. `which bun` → 存在すれば `cd .opencode && bun install`
2. bun 不在なら `which npm` → `cd .opencode && npm install`
3. 両方不在ならスキップ（Plugin は動作しないが展開は続行）

**失敗時：** `ls .opencode/node_modules/` で確認 → 失敗なら人間に手動インストールを依頼

### Step 1: 言語の検出

「言語」行がプレースホルダーのままならこのルールを適用しない。
実際の言語名が記入されていれば Step 2 へ進む。

### Step 2: 必要な設定ファイルの確認と展開

3種類の展開があり、実行条件が異なる：

```
種類1：言語別の自動展開
  条件：言語が確定 + 対象ファイルが未存在
  挙動：確認なしで自動作成（tsconfig.json / pyproject.toml / .prettierrc 等）

種類2：プロジェクト名・設定が必要なため案内のみ
  条件：該当言語が確定
  挙動：実行すべきコマンドを案内（go mod init / bundle init / cargo init 等）

種類3：アーキテクチャ種別別の確認付き展開
  条件：採用アーキテクチャ確定 + 対象ツール記載
  挙動：承認後に作成（electron-builder.yml / tauri.conf.json / backend.tf / cdk.json）
```

**展開レベルチェック：** `.opencode/project-context.md` の「設定ファイルの自動展開レベル」を確認する。
未設定の場合は人間に確認する（自動展開 / 確認付き展開 / 展開なし の3択）。

**既存ファイルは上書きしない。**

### ツールインストールの自動化ルール（共通プロトコル）
→ `.opencode/instructions/stack-setup/_install-protocol.md` を読んで実行する

### 言語別 設定ファイル展開
以下のファイルを読み、検出された言語に該当するブロックのみ実行する：

| 言語 | 参照先 |
|------|--------|
| TypeScript / JavaScript | `.opencode/instructions/stack-setup/_typescript.md` |
| Python | `.opencode/instructions/stack-setup/_python.md` |
| Go | `.opencode/instructions/stack-setup/_go.md` |
| Ruby | `.opencode/instructions/stack-setup/_ruby.md` |
| Swift | `.opencode/instructions/stack-setup/_swift.md` |
| Rust | `.opencode/instructions/stack-setup/_rust.md` |
| Kotlin | `.opencode/instructions/stack-setup/_kotlin.md` |
| Java | `.opencode/instructions/stack-setup/_java.md` |
| C / C++ / C# | `.opencode/instructions/stack-setup/_c-family.md` |
| PHP | `.opencode/instructions/stack-setup/_php.md` |

### .env 展開 + .gitignore 補完
→ `.opencode/instructions/stack-setup/_env-gitignore.md` を読んで実行する（.gitignore は展開レベルに関わらず常に実行）

### アーキテクチャ種別別ファイル展開
→ `.opencode/instructions/stack-setup/_arch-deploy.md` を読んで実行する

### Step 3.5: 命名規則・フレームワーク深掘り・コンプライアンス
→ `.opencode/instructions/stack-setup/_step-35.md` を読んで実行する（Step 2 と Step 3 の完了直後または ARCHITECTURE.md 更新時）

### Step 3.6: アーキテクチャ固有ルールの適用
→ `.opencode/instructions/stack-setup/_step-36-arch.md` を読んで実行する

### Step 4: アーキテクチャ違反検出設定
→ `.opencode/instructions/stack-setup/_step-36-arch.md` を読んで実行する

## 重要なルール

- **一度作成したファイルは上書きしない**
- **設定ファイルの展開は `.opencode/project-context.md` の「設定ファイルの自動展開レベル」に従う**
  - 「自動展開」：確認なし
  - 「確認付き展開」：承認後
  - 「展開なし」：提案のみ
  - 記載なし（初回）：人間に確認
- 展開したファイルは必ず一覧を報告する
- 不明点がある場合はデフォルト値を使い、後で変更できると案内する:
    TypeScript → ES2022、Python → 3.12、Go → モジュール名のみ、Node.js → LTS最新版、Ruby → 3.3
