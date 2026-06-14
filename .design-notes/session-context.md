# Session Context

## 今回の変更（2026-06-14）

dev-standards → yori への移行（命名変更 + ディレクトリ構造整理 + npm/curl両対応）

### Changed files

| ファイル | 内容 |
|---------|------|
| `AGENTS.md` | yori リポジトリ開発用に全面書き換え |
| `opencode/setup-harness.sh` | 変数名 `DEV_STANDARDS_PATH` → `YORI_SRC`、curl 自動 clone ロジック追加、後方互換維持 |
| `opencode/README.md` | yori 用に全面書き換え（curl/npm/git clone 3方式併記） |
| `package.json` | **新規**: `@yoshi-dai/yori` |
| `cli.js` | **新規**: npm エントリポイント |
| `setup-harness.ps1` | **新規**: Windows PowerShell ラッパー（WSL2経由） |
| `.github/workflows/publish.yml` | **新規**: main push → npm auto-publish |
| `opencode/principles/harness-engineering.md` | dev-standards → yori 表記置換（2箇所） |
| `opencode/principles/design-contract.md` | dev-standards → yori 表記置換（4箇所） |
| `opencode/decisions/003-three-layer-knowledge-management.md` | dev-standards → yori 表記置換（3箇所） |
| `opencode/snippets/.opencode/plugins/commit-review.ts` | コメント内 dev-standards → yori |

### Directory restructure

```
変更前: dev-standards/
  principles/, architectures/, decisions/, snippets/, setup-harness.sh, README.md
  AGENTS.md, .design-notes/

変更後: yori/
  AGENTS.md, package.json, cli.js, setup-harness.ps1, .github/
  opencode/              ← 配布物をすべて集約
    setup-harness.sh, README.md
    principles/, architectures/, decisions/, snippets/
```

### Key design decisions

1. **opencode/ ディレクトリ**: 全配布物を `opencode/` に集約。`principles/` 等の中身は OpenCode 固有の参照（`.opencode/`, `plugins`, `AGENTS.md`）を含むため、ルートに置くのは誤解を招く。
2. **curl 自動 clone**: `YORI_PATH` 未設定かつスクリプトがローカルファイルでない場合、`git clone --depth 1` で一時ディレクトリにクローンして使用。
3. **後方互換**: `DEV_STANDARDS_PATH` 環境変数をフォールバックとして維持。
4. **npm ≠ GitHub**: npm は `@yoshi-dai/yori`、GitHub は `Yoshi-Dai-1/yori`。不一致だが動作に問題なし。
5. **両方式併記**: curl 方式と npm 方式を README に併記。

### 未実施
- `NPM_TOKEN` の GitHub Secrets 設定（GitHub Actions で自動公開する場合に必要）
- `npm publish --access public` の初回実行

## 残タスク

- npm 初回公開（`npm publish --access public`）→ NPM_TOKEN を GitHub Secrets に設定後、main に push するか手動実行
- 既存の dev-standards ユーザーへの移行案内（必要なら）
- `.design-notes/session-context.md` の dev-standards 参照は履歴として維持
