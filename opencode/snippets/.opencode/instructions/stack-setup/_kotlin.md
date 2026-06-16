#### Kotlin が含まれる場合

プロジェクト固有の情報（groupId・artifactId・version）が必要なため自動作成しない。

**バージョン管理：** JVM ランタイムバージョンはビルド設定ファイル（`build.gradle.kts` / `pom.xml`）の `java.toolchain` / `maven-compiler-plugin` で固定する。
`gradle init` または `mvn archetype:generate` 実行後に、ARCHITECTURE.md に記録された JVM バージョンに合わせてビルド設定を編集する。

**インストールを実行する（OS別、上から順に試す）：**
```bash
# macOS
brew install ktlint

# Linux（snap が使えない場合は手動ダウンロード）
sudo snap install ktlint
curl -sSLO https://github.com/pinterest/ktlint/releases/latest/download/ktlint && chmod +x ktlint && sudo mv ktlint /usr/local/bin/

# Windows
scoop install ktlint
choco install ktlint
```

ユーザーに以下を案内する：
> Mavenプロジェクト: `mvn archetype:generate` で対話的に作成してください。
> Gradleプロジェクト: `gradle init` で作成してください。
> lint・フォーマット: ktlint を推奨します（`ktlint -F` で自動修正）。
> lint・フォーマットの自動チェックには `.opencode/plugins/lint-and-typecheck.ts` が有効です（`.opencode/plugins/README.md` 参照）。
