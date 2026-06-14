## Web検索の実行タイミングと情報源

### 設計初期段階（必ず検索する）

ARCHITECTURE.md Step3 または project-definition.md 作成後の
セキュリティ要件定義時に、以下を必ずWebで検索してから提案する：

```
OWASP Top 10 [現在年]        → 現在有効なバージョンを確認
使用言語・使用フレームワーク（ARCHITECTURE.mdに記録）の security guide [現在年] → 言語・フレームワーク固有の最新ガイドを確認
適用される法令の最新状況      → GDPR改正・個人情報保護法改正・その他 project-definition.md で特定した法令の改正状況
```

### 実装中（以下の操作を行ったとき、またはその結果をAIが受け取ったとき）

```
npm audit / pip-audit / cargo audit / govulncheck を実行した結果を受け取ったとき
  → 出力に含まれるライブラリ名で [ライブラリ名] CVE [現在年] を検索する

スキャン結果に HIGH 以上の脆弱性が含まれていたとき
  → CVE-[番号] で詳細・修正バージョン・対処法を検索してから報告する

以下のいずれかのファイルを編集したとき（ライブラリの追加・更新・削除）：
  package.json / requirements.txt / requirements-dev.txt / pyproject.toml /
  go.mod / Cargo.toml / pom.xml / build.gradle / build.gradle.kts /
  Gemfile / composer.json / pubspec.yaml / *.csproj / packages.config
  → 編集されたライブラリ名で [ライブラリ名] security advisory [現在年] を検索する
  → 以下の対応表に従いコマンドを実行して結果を報告する：
     package.json を編集した場合                                              → npm audit --audit-level=high
     requirements.txt / requirements-dev.txt / pyproject.toml を編集した場合 → pip-audit
     go.mod を編集した場合                                                    → govulncheck ./...
     Cargo.toml を編集した場合                                                → cargo audit
     pom.xml を編集した場合                                                  → mvn dependency:check
     build.gradle / build.gradle.kts を編集した場合                          → gradle dependencyCheckAnalyze
     Gemfile を編集した場合                                                   → bundle audit
     composer.json を編集した場合                                             → composer audit
     pubspec.yaml を編集した場合                                              → dart pub audit
     *.csproj / packages.config を編集した場合                                → dotnet list package --vulnerable

   上記以外の依存ファイルを編集した場合：
    コマンドを自律的に推測・検索しない。
    以下を人間に通知する：
    「[ファイル名] のセキュリティスキャンコマンドは確認できませんでした。
     使用している言語の公式パッケージマネージャーのドキュメントで
     セキュリティスキャンコマンドを確認してください。
     確認できたコマンドを decisions/ に記録すると次回から自動実行できます。」

  audit コマンドの出力に "high" または "critical"（大文字小文字不問）の脆弱性が含まれていたとき：
    → CRITICAL の場合は即座に人間に報告する
    → @security-auditor を呼び出す。呼び出し形式は `.opencode/agents/_shared/security-auditor-invocation.md` を参照
    → 除外条件: 既にこのセッション内で同一 CVE について @security-auditor を呼び出した場合はスキップする
```

### 情報源（観点別・組み合わせて参照する）

URLは変更される可能性があるため組織名・ドメインで判断する。

```
何が危険か    → OWASP（owasp.org）Top 10・ASVS・Cheat Sheet
どんな弱点か  → CWE（cwe.mitre.org）
既知の脆弱性  → CVE/NVD（cve.mitre.org / nvd.nist.gov）
管理・統制    → NIST（nist.gov）SP 800-53・CSF / ISMAP
実装方法      → 各言語・フレームワーク（ARCHITECTURE.mdに記録）の公式ドキュメント
ライブラリ    → GitHub 公式リポジトリ セキュリティアドバイザリ
```

参考にとどめる（必ず公式で裏付けを取る）：
個人ブログ・Qiita・Zenn・Stack Overflow・公開3年以上前の記事

### 情報源の通知フォーマット（必須）
→ `.opencode/instructions/_shared/_info-source-format.md` を読む
