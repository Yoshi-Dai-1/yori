# セキュリティ実装ガイド（Security Implementation）

## このファイルの目的と他ファイルとの役割分担

```
security-requirements.md  → 何が必要か（プロジェクト性質から対応レベルを判定）
security-auditor.md        → 実装前に何を決めるか（選択肢の提示・対話）
rules/security.md          → 常駐ルール・禁止事項・自律トリガー
このファイル               → どう実装するか（構築の指針・情報源・例外対応）
production-readiness.md    → 実装後に何を確認するか（リリース前チェック）
```

このファイルは以下のタイミングでAIが自律的に参照する。人間が指示する必要はない。

```
参照タイミングと参照元：
  セキュリティ関連機能の実装依頼を受けたとき → rules/security.md の自律トリガー経由
  ARCHITECTURE.md Step3 完了後              → ARCHITECTURE.md.template に組み込み済み
  @security-auditor 設計モード完了後         → security-auditor.md の実装手順
```

---

## 用語の定義（このファイル内で使用する）

```
「使用言語」
  → ARCHITECTURE.md の「言語」欄に記録されている言語名

「使用フレームワーク」
  → ARCHITECTURE.md の「フレームワーク・主要ライブラリ」欄に記録されているフレームワーク名

検索クエリへの使い方：
  ARCHITECTURE.md に「TypeScript / Next.js」と記録されている場合
  → 検索クエリは「TypeScript Next.js authentication best practices 2026」のように
    使用言語と使用フレームワークの両方を含める
```

---

## AIが実装前に必ずWebで検索する（自律実行）

セキュリティの実装方法は年々更新される。AIの学習データには鮮度の限界があるため、
実装を開始する前に以下を必ず検索してから実装する。人間からの指示を待たない。

実装する機能に応じた検索クエリ（[現在年] には実際の年を入れる）：

```
認証・パスワード・JWT を実装するとき：
  1. OWASP Authentication Cheat Sheet [現在年]
  2. OWASP Session Management Cheat Sheet [現在年]
  3. [使用言語] [使用フレームワーク] authentication best practices [現在年]

入力バリデーション・SQLインジェクション対策を実装するとき：
  1. OWASP Input Validation Cheat Sheet [現在年]
  2. OWASP SQL Injection Prevention Cheat Sheet [現在年]
  3. [使用言語] [使用フレームワーク] input validation [現在年]

XSS対策を実装するとき：
  1. OWASP XSS Prevention Cheat Sheet [現在年]
  2. [使用フレームワーク] XSS protection [現在年]

CSRF対策を実装するとき：
  1. OWASP CSRF Prevention Cheat Sheet [現在年]
  2. [使用フレームワーク] CSRF protection [現在年]

APIキー・シークレット管理を実装するとき：
  1. OWASP Secrets Management Cheat Sheet [現在年]
  2. [使用言語] [使用フレームワーク] environment variables secrets management [現在年]

決済機能を実装するとき（使用する決済サービスは project-definition.md で確認する）：
  1. [project-definition.md に記載の決済サービス名] webhook security [現在年]
  2. [project-definition.md に記載の決済サービス名] idempotency [現在年]
  3. [project-definition.md に記載の決済サービス名] official security documentation [現在年]

ファイルアップロードを実装するとき：
  1. OWASP File Upload Cheat Sheet [現在年]
  2. [使用言語] [使用フレームワーク] file upload security [現在年]

OAuth・ソーシャルログインを実装するとき：
  1. OWASP OAuth Cheat Sheet [現在年]
  2. [使用言語] [使用フレームワーク] OAuth implementation [現在年]
  3. [使用する OAuthプロバイダー名（Google・GitHub 等）] OAuth security best practices [現在年]

監査ログを実装するとき：
  1. OWASP Logging Cheat Sheet [現在年]
  2. [使用言語] [使用フレームワーク] structured logging [現在年]

暗号化・データ保護を実装するとき：
  1. OWASP Cryptographic Storage Cheat Sheet [現在年]
  2. [使用言語] encryption at rest [現在年]

セキュリティヘッダーを設定するとき：
  1. OWASP HTTP Security Response Headers Cheat Sheet [現在年]
  2. [使用フレームワーク] security headers [現在年]
```

検索結果は以下のフォーマットで人間に必ず通知する（通知せずに実装しない）：

```
📋 参照情報源
  - [情報源名（組織名）]：[URL]（取得日：[YYYY-MM-DD]）
  - [情報源名（組織名）]：[URL]（取得日：[YYYY-MM-DD]）

⚠️ 上記の情報に誤りや古い内容があればご指摘ください。
   指摘があった場合は decisions/ に記録し、以降の実装に反映します。
```

裏付けが取れなかった場合：

```
📋 参照情報源
  - AIの学習データに基づく実装です（Web検索で公式情報が確認できませんでした）
  - 確認を推奨する情報源：OWASP（owasp.org）および
    [使用言語] [使用フレームワーク] の公式ドキュメント

⚠️ 情報の鮮度に限界がある可能性があります。実装前にご確認ください。
```

---

## 信頼できる情報源（観点別・組み合わせて参照する）

URLは変更される可能性があるため、組織名・ドメインで判断する。

```
実装方法の共通原則：
  OWASP Cheat Sheet Series（owasp.org/www-project-cheat-sheets）
  → 認証・JWT・バリデーション・XSS・CSRF・SQLインジェクション対策等
    トピック別の実装指針。最も実践的で信頼性が高い。随時更新される。

使用言語・フレームワーク固有の実装方法：
  各言語・フレームワークの公式ドキュメントのセキュリティセクション
  → URLは変更される可能性があるため
    「[使用フレームワーク名] official security documentation」で検索する
  → 参考ドメイン：Django（docs.djangoproject.com）/ Spring（spring.io）/
    Next.js（nextjs.org）/ Go（go.dev）/ Rust（doc.rust-lang.org）

使用ライブラリの正しい使い方：
  各ライブラリの公式GitHubリポジトリのREADMEとセキュリティアドバイザリ
  → JWTライブラリ・bcryptライブラリ・OAuthライブラリは公式の使用例に従う

脆弱性の詳細：
  CWE（cwe.mitre.org）→ 脆弱性の分類・根本原因の理解
  CVE/NVD（nvd.nist.gov）→ 使用ライブラリの既知の脆弱性確認

本番運用・信頼性設計：
  Google SRE Book（sre.google）→ Site Reliability Engineering
  → SLI/SLO・エラーバジェット・インシデント管理など運用品質設計の実践知
  → 無料で全文公開されている

API設計の原則：
  Google Cloud API Design Guide（cloud.google.com）
  → REST APIの命名・エラーハンドリング・バージョニングの設計根拠として参照する
  → 「Google Cloud API Design Guide [現在年]」で検索して最新版を確認する

日本のWebサービス・行政・医療向け：
  IPA（情報処理推進機構）（ipa.go.jp）→ 日本語の実装ガイドライン・セキュリティ指針
  → 「IPA [実装する機能] ガイドライン [現在年]」で検索して確認する
  → 特に医療・行政・金融の国内案件では最初に参照する
```

---

## 共通実装原則（言語・フレームワークを問わず変わらない）

具体的なコードは「使用言語 + 使用フレームワーク + 上記の検索クエリ」で
取得した公式情報に従う。

### 認証・認可

```
原則1：パスワードは必ずハッシュ化して保存する（平文保存は絶対禁止）
  → bcrypt（コストパラメータ12以上）または Argon2id を使用する
  → 使用するハッシュ化ライブラリは使用言語の公式推奨を検索して確認する

原則2：トークンには必ず有効期限を設定する
  → アクセストークン：15〜60分
  → リフレッシュトークン：7〜30日（DBに保存し無効化できる設計にする）
  → JWTのアルゴリズムは明示指定（HS256またはRS256を明記する）

原則3：認証失敗のエラーメッセージは情報を漏らさない
  → 「メールアドレスまたはパスワードが違います」に統一する
  → メールアドレスとパスワードのどちらが誤りかを教えない

原則4：ブルートフォース対策を実装する
  → 5回連続失敗で15分ロック（security-requirements.md の対応レベルに応じて調整）
  → レートリミットはミドルウェアで一元管理する

原則5：セッション・トークンの保存場所
  → Webブラウザクライアント：HttpOnly属性付きCookieに保存する
  → iOSアプリ：Keychainに保存する
  → Androidアプリ：EncryptedSharedPreferencesに保存する
```

### 入力バリデーション・インジェクション対策

```
原則1：バリデーションはバックエンドで必ず実施する
  → フロントエンドのバリデーションは補助のみとする
  → 使用言語・フレームワークのバリデーションライブラリを使用する
    （公式推奨を検索して確認する）

原則2：DBクエリはパラメータバインディングのみ使用する
  → ORMのパラメータバインディング機能を使用する
  → ORMを使用する場合もRawクエリへの文字列埋め込みは使用しない

原則3：ユーザー入力をHTMLに出力するときは必ずエスケープする
  → フレームワークのテンプレートエンジンの自動エスケープ機能を使用する
  → HTMLを直接生成するコードにはユーザー入力を渡さない

原則4：バリデーションエラーのレスポンス
  → ユーザーが理解できるメッセージを返す
  → 内部のスタックトレース・DBエラーメッセージを含めない
```

### 機密情報の管理

```
原則1：機密情報はコードに書かない
  → APIキー・パスワード・トークンは環境変数で管理する
  → 設定の読み込みは1箇所に集約する
    TypeScriptの場合：config/env.ts
    Pythonの場合：config/settings.py または pydantic Settings
    Goの場合：config/config.go
    上記以外の言語の場合：[使用言語] environment configuration best practices を検索する
  → .env.exampleにキー名のみ記録する（値は書かない）

原則2：機密情報はログに出力しない
  → パスワード・APIキー・個人情報・クレジットカード番号はマスク処理する
  → デバッグログも含む

原則3：APIキーのスコープを最小化する
  → そのAPIで必要な権限のみ付与する
  → ローテーション手順をdocs/operations.mdに記録する
```

### エラーハンドリング

```
原則1：ユーザーへのエラーレスポンスに内部情報を含めない
  → スタックトレース・内部パス・DB情報・フレームワーク名を除外する
  → 本番環境では「予期しないエラーが発生しました」に統一する

原則2：内部エラーはログに記録する
  → ERRORレベルでスタックトレースを含めて記録する
  → リクエストIDを付与して追跡可能にする
  → ログには機密情報を含めない（原則2参照）

原則3：開発環境と本番環境でエラー表示を切り替える
  → 環境変数で制御する
    Node.jsの場合：NODE_ENV（値は development か production を設定する）
    Pythonの場合：ENVIRONMENT 変数または DEBUG 変数
    上記以外の言語の場合：[使用言語] environment-based error handling を検索する
```

### 通信・セキュリティヘッダー・CSRF

```
原則1：本番環境ではHTTPSのみ使用する
  → HTTPへのアクセスはHTTPSにリダイレクトする
  → TLS 1.2以上を使用する（インフラ設定で確認する）

原則2：CSRF対策
  → SameSite Cookie属性を設定する
    サードパーティへの送信が不要な場合：Strict を設定する
    サードパーティへの送信が必要な場合：Lax を設定する
    どちらか判断できない場合：security-auditor.md の設計モードで確認する
  → 状態を変更するリクエスト（POST/PUT/PATCH/DELETE）にCSRFトークンを実装する
  → CSRF対策の具体的な実装方法は「[使用フレームワーク] CSRF protection [現在年]」で検索する

原則3：セキュリティヘッダーを設定する
  → 設定すべきヘッダーと値は「OWASP HTTP Security Response Headers Cheat Sheet [現在年]」で確認する
  → 具体的な設定方法は「[使用フレームワーク] security headers [現在年]」で検索する
```

### GraphQLセキュリティ

GraphQLを使用するプロジェクトでのみ適用する（REST APIのみのプロジェクトはスキップ）。

```
原則1：本番環境ではIntrospectionを無効化する
  Introspectionを有効にするとスキーマ全体が外部に露出する
  開発環境：有効（デバッグ・ドキュメント生成のため）
  本番環境：無効（スキーマ情報を攻撃者に渡さない）
  → 具体的な無効化方法は「[使用フレームワーク] disable introspection production [現在年]」で検索する

原則2：クエリの深さ・複雑度に上限を設定する
  ネストが深いクエリや複雑なクエリはDoS攻撃に悪用される可能性がある
  クエリ深さ制限・フィールド数制限・複雑度制限を実装する
  → 具体的な実装方法は「[使用フレームワーク] query depth limit [現在年]」で検索する

原則3：認可はリゾルバーレベルで実装する
  GraphQLはHTTPエンドポイントが1つのため、認可をエンドポイントレベルで行えない
  各リゾルバー・フィールドレベルで認可チェックを実装する
  → security-requirements.md の対応レベルに従い実装する

原則4：エラーメッセージにスタックトレース・内部情報を含めない
  GraphQLのエラーレスポンスはデフォルトで詳細な情報を返す場合がある
  本番環境では「An error occurred」のような汎用メッセージのみを返す
```

最新のGraphQLセキュリティベストプラクティスは以下で確認する：
`OWASP GraphQL Cheat Sheet [現在年]`

---

## AIの実装手順（自律実行・人間の指示を待たない）

```
Step 1：ARCHITECTURE.md を読み、使用言語と使用フレームワークを確認する
  → 確認できない場合は人間に質問する（推測で進めない）

Step 2：security-auditor.md の設計モードで実装前の決定事項を確認する
  → 認証方式・ライブラリ・設定値が決まっているか確認する
  → 決まっていない場合は決定してから Step 3 へ進む

Step 3：実装する機能に対応する検索クエリでWebを検索する
  → 「AIが実装前に必ずWebで検索する」セクションの
    該当機能の検索クエリをすべて実行する
  → 参照情報源を📋フォーマットで人間に通知する

Step 4：検索で得た最新の実装パターンに従ってコードを生成する
  → 「共通実装原則」に違反していないか確認する
  → 例外が発生した場合は「例外対応フロー」に従う

Step 5：実装完了後に @security-auditor（監査モード）を呼び出す
  → production-readiness.md のセキュリティチェックリストと照合する

Step 6：判断した内容を decisions/ に記録することを提案する
  → 認証方式・ライブラリ選定・設定値の根拠と参照情報源を残す
```

---

## 例外対応フロー

### 例外1：公式情報源で実装方法が見つからない場合

```
1. 「[機能名] の実装方法について公式情報源で確認できませんでした」と人間に通知する
2. AIの学習データに基づく実装案を提示する
3. 「確認を推奨する情報源：OWASP（owasp.org）および
   [使用フレームワーク名] の公式ドキュメント」を付記する
4. 人間の確認を得てから実装する
5. 確認した情報をdecisions/に記録することを提案する
```

### 例外2：公式情報源の内容がプロジェクトの制約と合わない場合

```
例：使用するフレームワークが推奨ライブラリに非対応・レガシー環境での制約
1. 制約の内容と、推奨実装が使えない理由を人間に説明する
2. 制約内で最も安全な代替案を提示する
3. 「推奨実装からの乖離と理由」をdecisions/に記録することを提案する
4. 将来の対応計画（技術的負債として記録）を提案する
```

### 例外3：実装中にセキュリティリスクを発見した場合

```
1. 実装を止める
2. 発見したリスクをリスク深刻度（CRITICAL/HIGH/MEDIUM/LOW）で分類して報告する
   → 分類基準は rules/security.md の「リスク深刻度と対処タイミング」を参照
3. CRITICAL/HIGH の場合：修正するまで実装を再開しない
4. MEDIUM/LOW の場合：人間と相談の上、対処タイミングを決める
5. 発見内容をdecisions/に記録することを提案する
```

### 例外4：「これは安全か分からない」と判断できない場合

```
1. 実装を止める
2. 「この実装にセキュリティ上のリスクがあるかどうか判断できません」と人間に通知する
3. @security-auditor（監査モード）を呼び出して確認する
4. 確認結果を得てから実装を再開する
```

---

## 実装後の確認フロー

```
Step 1：依存ライブラリのスキャン
  → rules/security.md の言語別コマンド対応表に従いauditを実行する

Step 2：@security-auditor（監査モード）を呼び出す
  → 実装したファイルを対象に監査を依頼する

Step 3：人間が最終確認する（AIに任せない箇所）
  → .env ファイルがコミットされていないか（git status で確認）
  → ハードコードされた機密情報がないか（git diff で確認）
  → pre-commitフックが機能しているか（意図的にテストする）
```

---

## 「知らないこと」への対処原則

```
実装中に判断に迷ったとき：

1. 実装を止める（不確かなまま進めない）

2. 以下の検索を実行する：
   「[実装しようとしている機能] security best practices [現在年]」
   「[実装しようとしている機能] OWASP [現在年]」

3. 検索で解決しない場合は人間に通知する：
   「[機能名] の実装にセキュリティ上の懸念があります。
    [具体的な懸念内容] について確認が必要です。」

4. @security-auditor（監査モード）を呼び出して確認する

5. 判断した内容をdecisions/に記録することを提案する
```

---

## DevSecOpsパイプラインのセキュリティ設定（自律実行）

### AIが自律的に実行するタイミング

ARCHITECTURE.md に CIツールが記録されており、かつ
security-requirements.md の対応レベルが Lv.3以上の場合、
ARCHITECTURE.md Step3 完了後に以下を自律的に実行する。
人間の指示を待たない。

CIツールの確認方法：ARCHITECTURE.md の「CI/CD」欄を読む。
記録されていない場合は人間に質問する：
「セキュリティスキャンをCIに組み込みます。
 使用するCIツールを教えてください
 （GitHub Actions / GitLab CI / CircleCI / Jenkins / その他）」

### 実装前の必須Web検索

SASTツール・DASTツール・シークレットスキャンは年々更新される。
AIの学習データには鮮度の限界があるため、実装前に必ず検索してから設定する。

```
SAST（静的解析）の設定：
  1. Semgrep [使用CIツール名] configuration [現在年]
     （Semgrep：semgrep.dev → 多言語対応・無料枠あり）
  2. [使用CIツール名] SAST security scanning [現在年]
  3. OWASP DevSecOps Guideline SAST [現在年]

DAST（動的解析）の設定：
  1. OWASP ZAP [使用CIツール名] integration [現在年]
     （OWASP ZAP：zaproxy.org → 無料・最も普及したDAST）
  2. [使用CIツール名] DAST automation [現在年]
  3. OWASP DevSecOps Guideline DAST [現在年]

シークレットスキャンの設定：
  1. [使用CIツール名] secret scanning [現在年]
  2. truffleHog [使用CIツール名] [現在年]
     （truffleHog：github.com/trufflesecurity/trufflehog → 無料・OSSで信頼性が高い）
```

検索結果は📋フォーマットで人間に必ず通知する。

### 信頼できる情報源（観点別）

URLは変更される可能性があるため組織名・ドメインで判断する。

```
DevSecOpsの総合ガイド：
  OWASP DevSecOps Guideline（owasp.org）
  → CIへのセキュリティ組み込み手順。CI種別の設定例を含む。随時更新される。

SASTツール：
  Semgrep（semgrep.dev）→ 多言語対応・GitHub Actions等に組み込み可能
  SonarQube（sonarqube.org）→ 多言語対応・OSS版あり

DASTツール：
  OWASP ZAP（zaproxy.org）→ 最も普及したDAST。無料。

シークレットスキャン：
  truffleHog（github.com/trufflesecurity/trufflehog）→ OSS・無料
  GitGuardian（gitguardian.com）→ 商用・無料枠あり
```

### 例外対応

```
設定手順がCIツールの公式ドキュメントで見つからない場合：
  1. 「[CIツール名] security scanning setup [現在年]」を検索する
  2. OWASP DevSecOps Guideline で該当するCIツールの例を探す
  3. 見つからない場合は「AIの学習データに基づく設定」と明示し、
     人間の確認を得てから設定する
  4. 設定した内容をdecisions/に記録することを提案する

Lv.2以下のプロジェクトでCIがない場合：
  → DevSecOpsのCI設定をスキップする
  → 代替として依存ライブラリスキャン（rules/security.mdの対応表）を
    依存ファイル編集のたびに手動実行する設計を維持する
```
