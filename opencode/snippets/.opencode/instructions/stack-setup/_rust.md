#### Rust が含まれる場合

`Cargo.toml` はプロジェクト固有のため自動作成しない。

**バージョン管理：** `rust-toolchain.toml` でランタイムバージョンを固定する。
ARCHITECTURE.md に記録された Rust バージョンから以下のテンプレートで作成する：
```toml
[toolchain]
channel = "stable"
```
（バージョンは ARCHITECTURE.md に記録されたバージョンを優先する。未記録の場合は `stable` を使う）

**インストールを実行する（全OS対応）：**
```bash
rustup component add rustfmt clippy
```
`rustup` 未インストールの場合は `https://rustup.rs` からインストールする。

ユーザーに以下を案内する：
> Rust プロジェクトの場合は `cargo init` を実行してください。
> rustfmt と Clippy は `rustup component add rustfmt clippy` でインストールしてください。
> lint・フォーマットの自動チェックには `.opencode/plugins/lint-and-typecheck.ts` が有効です（`.opencode/plugins/README.md` 参照）。
