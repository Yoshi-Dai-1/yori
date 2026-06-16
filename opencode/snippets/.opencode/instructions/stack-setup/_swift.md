#### Swift が含まれる場合

`Package.swift` はプロジェクト固有のため自動作成しない。

**バージョン管理：** `.swift-version` でランタイムバージョンを固定する。
ARCHITECTURE.md に記録された Swift バージョンを `.swift-version` に書き込む。
未記録の場合は Swift ツールチェーンのデフォルトバージョンを使う。

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
