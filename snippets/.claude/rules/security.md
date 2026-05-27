---
paths:
  - "**/*.ts"
  - "**/*.tsx"
  - "**/*.js"
  - "**/*.py"
  - "**/*.go"
  - "**/*.rs"
  - "**/*.java"
  - "**/*.kt"
  - "**/*.c"
  - "**/*.cpp"
  - "**/*.cs"
  - "**/*.rb"
  - "docs/project-definition.md"
  - "AGENTS.md"
  - "package.json"
  - "requirements.txt"
  - "requirements-dev.txt"
  - "pyproject.toml"
  - "go.mod"
  - "Cargo.toml"
  - "pom.xml"
  - "build.gradle"
  - "build.gradle.kts"
  - "Gemfile"
  - "composer.json"
  - "pubspec.yaml"
  - "**/*.csproj"
  - "packages.config"
---

# セキュリティ常駐ルール（Security Rules）

このファイルはコードファイル・project-definition.md の編集のたびに自動リロードされる。
AGENTS.md のコンテキスト消失後も、このルールが常にセキュリティ判断を補完する。

詳細な判断基準・チェックリスト・言語別ガイドは以下を参照（必要時に読む）：
- `.claude/standards/principles/security-requirements.md`（対応レベル・法令判断・言語別詳細）
- `.claude/agents/security-auditor.md`（設計モード・監査モードの詳細手順）

---

## 自律トリガー（人間の指示を待たずに実行する）

### project-definition.md が作成・更新されたとき

1. `.claude/standards/principles/security-requirements.md` を読む
2. project-definition.md の内容からセキュリティ対応レベル（Lv.1〜4）を判定する
3. AGENTS.md の `## Security Boundaries` にプロジェクト固有の制約を追記する
4. 依存ライブラリの自動監視（Dependabot（GitHub）または Renovate（汎用））が未設定なら設定ファイルの作成を提案する
   「未設定」の判定基準: `.github/dependabot.yml` と `renovate.json` のいずれも存在せず、
   `.github/workflows/` 内に `npm audit` / `pip-audit` / `cargo audit` / `govulncheck` のいずれかを実行するステップがない場合、未設定とする
5. 判断結果のサマリーを人間に報告する

### 最初のコードファイルが作成されるとき（実装フェーズのセーフガード）

ARCHITECTURE.md Step3（設計フェーズ）でセキュリティ要件が確定しているはず。
それが完了していないまま実装に入ることを防ぐ最後の砦。

```
チェック1：ARCHITECTURE.md の「## セキュリティ要件」セクションが記入済みか
  → 未記入：実装を止め、ARCHITECTURE.md Step3 の手順で記入するよう案内する

チェック2：AGENTS.md の Security Boundaries にプロジェクト固有の制約が記入済みか
  → コメントのみ：security-requirements.md の判断ステップを実行して追記する

チェック3：認証・認可が必要なプロジェクトで未設計の場合
  → @security-auditor（設計モード）を呼び出す
    「認証は後付けが最も困難なコンポーネントです。最初に設計します。」と伝える
```

3項目すべて完了 → 通常の実装フローへ。未完了 → 完了後に実装を再開する。

### スプリント完了後（セキュリティ監査トリガー）

スプリントで実装した内容に以下のいずれかが含まれる場合、
`@evaluator` のQA評価完了後に `@security-auditor`（監査モード）を
自律的に呼び出す。人間の指示を待たない。

```
対象となる実装（以下のいずれかが含まれるスプリント）：
  - 認証・ログイン・ユーザー管理に関わるコードを追加・変更した
  - 決済・課金・クレジットカード処理に関わるコードを追加・変更した
  - 個人情報・医療・金融データを扱うコードを追加・変更した
  - 外部APIキー・シークレットを追加・変更した
  - DBスキーマ・クエリを追加・変更した
  - 認可・権限管理のロジックを追加・変更した
  - ファイルアップロード・ダウンロード機能を追加・変更した
  - 本番環境のインフラ・デプロイ設定を変更した

上記のいずれにも該当しないスプリント：
  → @security-auditor の呼び出しをスキップする（コンテキストを節約する）
```

Lv.3以上のプロジェクトで、脅威モデリングが未実施の場合:
→ `decisions/` ディレクトリ内に `*-threat-modeling.md` にマッチするファイルが存在しない、
  かつ ARCHITECTURE.md の「セキュリティ要件」セクションに「脅威モデリング実施」の記載がない場合、未実施と判定する
→ `@security-auditor` 呼び出しの前に
  `.claude/standards/principles/threat-modeling.md` を読んで実施する

### PR が作成されたとき（`gh pr create` または `git push` が実行されたとき）

Bash ツールで `gh pr create` または `git push`（main/mainline 以外のブランチへの push）が実行されたとき：
1. PR 対象ブランチの diff に以下の判定キーワードが含まれるかチェックする：
   login, auth, signin, password, token, session, jwt, oauth,
   payment, billing, charge, stripe, card, checkout,
   api_key, secret, bearer, authorization, webhook,
   request.body, req.params, form, input, query,
   query, execute, sql, find, insert, update, delete
2. 判定キーワードが含まれる場合：
   → `@security-auditor`（監査モード）を呼び出し、diff 範囲のセキュリティレビューを依頼する
3. 除外条件:
   → docs/ または .md ファイルのみの変更、または判定キーワードが一切含まれない場合はスキップする

### 新機能の実装時（Won'tセクション違反チェック）

新機能の実装（新規ファイル作成または新関数の追加）が要求されたとき、かつ `docs/project-definition.md` が存在する場合：
1. `docs/project-definition.md` の Won't セクション（「今回はやらないこと」）を読む
2. 実装予定機能が Won't に抵触しないかチェックする
3. 抵触する場合：実装前に「この機能は Won't（今回はやらない）に記載されています。実装を続けますか？」と警告し、人間の承認を求める
4. 除外条件: `docs/project-definition.md` が存在しない、または Won't セクションが空（「なし」のみ記載）の場合

### package.json のバージョンが変更されたとき（CHANGELOG未更新検知）

`package.json` が編集され、かつ `version` フィールドの値が前回の値から変更されたとき：
1. `CHANGELOG.md` の存在を確認する
2. 存在しない場合 → 作成を提案する
3. 存在する場合 → `## [Unreleased]` セクションに変更内容を追記するよう提案する
4. 除外条件:
   → `package.json` の変更が `version` フィールド以外のみ（依存関係の更新等）
   → ARCHITECTURE.md で「CHANGELOG: 管理しない」が明示されている場合

### コードファイルを編集するとき

| 編集内容 | 判定キーワード |
|---------|--------------|
| 認証・ログイン | login, auth, signin, password, token, session, jwt, oauth |
| 決済・課金 | payment, billing, charge, stripe, card, checkout |
| 個人情報 | user, email, address, phone, profile, personal |
| 外部API連携 | api_key, secret, bearer, authorization, webhook |
| 外部入力処理 | request.body, req.params, form, input, query |
| DB操作 | query, execute, sql, find, insert, update, delete |

実装完了後は `@security-auditor`（監査モード）を呼び出す。

---

## 常駐禁止事項（セッション中いつでも適用）

AGENTS.md の記憶が薄れても以下は常に有効：

- 機密情報（APIキー・パスワード・トークン）をコードにハードコードしない
- 機密情報をログに出力しない（デバッグログも含む）
- 変数名・ログ出力・コメントから機密情報の存在・構造を推測させない（`naming-conventions.md` の「セキュア命名ルール」を参照）
- 外部入力をバックエンドでバリデーションせずに使用しない
- SQLクエリを文字列連結で組み立てない（パラメータバインディングを使う）
- エラーレスポンスにスタックトレース・内部パス・DB情報を含めない
- 環境変数を追加したとき `.env.example` へのキー名追記を忘れない
- 環境変数名は `UPPER_SNAKE_CASE` で、機密情報には `_KEY` / `_SECRET` / `_TOKEN` / `_CREDENTIAL` のいずれかを suffix に付ける（`naming-conventions.md` の「環境変数名の規約」を参照）
- `.env.example` が変更されたとき:
  → 追加されたキーが `.env`（存在する場合）に反映されているかチェックする
  → 追加キーに `_KEY`, `_SECRET`, `_TOKEN`, `_CREDENTIAL` suffix が含まれる場合、CI/CD シークレットへの登録が必要であると警告する
  → 除外条件: `.env.example` の変更が空白・コメントのみの場合、またはキーの削除のみ（追加なし）の場合

---

## リスク深刻度と対処タイミング

リスク深刻度ラベルの定義と4象限との紐付けは
`.claude/standards/principles/risk-based-approach.md` の
「深刻度ラベルの体系と使い分け」を参照。

複数の問題が同時に発生したとき。これは「どれを先に対処するか」の着手順であり、
すべて最終的には対処が必要。

```
CRITICAL（即時対処・実装を止める）：
  認証・認可の欠如 / 機密情報の平文保存・ハードコード /
  HTTPSなし / 既知のCRITICAL脆弱性ある依存ライブラリ

HIGH（このスプリント内に対処）：
  入力バリデーションなし / JWTの誤実装 / エラーレスポンスへの内部情報混入

MEDIUM（次のスプリントで対処）：
  依存ライブラリのHIGH脆弱性 / ログ設計の不備 / CORS設定の過剰な許可

LOW（記録して計画的に対処）：
  セキュリティヘッダーの未設定 / レートリミットなし（小規模）/
  依存ライブラリのMEDIUM脆弱性
```

---

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
    → @security-auditor を監査モードで呼び出し、検知された CVE 一覧と深刻度を提示する
    → CRITICAL の場合は即座に人間に報告する
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

Webで検索した情報を提案・報告に使用した場合、必ず通知する：

```
📋 参照情報源
  - [情報源名]：[URL]（取得日：[YYYY-MM-DD]）

⚠️ 誤りや古い内容があればご指摘ください。
   指摘は decisions/ に記録し、以降の提案に反映します。
```

Web検索で裏付けが取れなかった場合：
```
📋 参照情報源
  - AIの学習データに基づく提案（Web検索で裏付けが取れませんでした）
  - 確認を推奨：[公式サイト名と組織名]

⚠️ 情報の鮮度に限界がある可能性があります。
```
