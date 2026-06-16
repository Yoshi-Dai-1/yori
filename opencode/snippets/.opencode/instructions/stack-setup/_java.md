#### Java が含まれる場合

> **Plugin 層の注意**：Java は `lint-and-typecheck.ts` での per-edit チェックをスキップしています。
> 理由は高速CLIツール不在のため。プロジェクト固有のビルドツール経由（checkstyle/pmd/spotbugs）で品質チェックしてください。

プロジェクト固有の情報（groupId・artifactId・version）が必要なため自動作成しない。

**バージョン管理：** JVM ランタイムバージョンはビルド設定ファイル（`build.gradle.kts` / `pom.xml`）の `java.toolchain` / `maven-compiler-plugin` で固定する。
`gradle init` または `mvn archetype:generate` 実行後に、ARCHITECTURE.md に記録された JVM バージョンに合わせてビルド設定を編集する。

**インストール（全OS対応、ビルドツール経由）：**
```bash
# Maven プラグイン追加（pom.xml に記述）
mvn checkstyle:check  # 実行時にプラグイン自動ダウンロード

# Gradle プラグイン追加（build.gradle.kts に記述）
gradle check  # 実行時にプラグイン自動ダウンロード
```
- Maven: `pom.xml` に `maven-checkstyle-plugin` / `maven-pmd-plugin` を追加
- Gradle: `build.gradle.kts` に `checkstyle` / `pmd` / `spotbugs` プラグインを追加
- Maven/Gradle は各OSで動作（Java ランタイムが必要）

ユーザーに以下を案内する：
> Mavenプロジェクト: `mvn archetype:generate` で対話的に作成してください。
> Gradleプロジェクト: `gradle init` で作成してください。
> lint・フォーマット: Checkstyle / PMD / SpotBugs（Java）を推奨します。
> これらはビルドツール経由で実行するため、`.opencode/plugins/` ではなくプロジェクト側の設定で管理します。
