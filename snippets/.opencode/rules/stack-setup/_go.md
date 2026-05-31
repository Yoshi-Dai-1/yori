#### Go が含まれる場合

`go.mod` はプロジェクト名が必要なため自動作成しない。

**インストール：** gofmt / go vet は Go 標準ツールのため追加インストール不要。

ユーザーに以下を案内する：
> Go プロジェクトの場合は `go mod init [モジュール名]` を実行してください。
> gofmt と go vet は Go 標準ツールのため追加インストール不要です。
> lint・フォーマットの自動チェックには `.opencode/plugins/lint-and-typecheck.ts` が有効です（`.opencode/plugins/README.md` 参照）。
