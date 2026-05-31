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
