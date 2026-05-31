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
