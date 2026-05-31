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
