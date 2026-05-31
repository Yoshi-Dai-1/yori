# セキュリティ要件の自律判断ガイド（Security Requirements）

## このファイルの目的

AIがプロジェクト定義を読んで「何のセキュリティ対応が必要か」を
人間に聞かずに自律判断するための判断基準。

- `security-implementation.md` が「どう実装するか（How）」
- このファイルは「何が必要かをどう判断するか（What & Why）」

---

## AIが自律的に実行すること

このファイルを参照したAIは、以下を人間の指示なしに実行する。

### タイミング1：project-definition.md が作成・更新されたとき

`docs/project-definition.md` を読んで、下記の「判断ステップ」を実行する。
判断結果を以下の順番で自律的に反映する：

1. `AGENTS.md` の `## Security Boundaries` セクションを更新する
   （セクションが存在しない場合は `## Boundaries` の直後に追記する）
2. `ARCHITECTURE.md` のセキュリティセクションに法的要件を追記する
   （ARCHITECTURE.md が未記入の場合はスキップし、記入後に再実行する）
3. 依存ライブラリの自動監視が未設定の場合、設定ファイルの作成を提案する
4. 判断結果のサマリーを人間に報告する

### タイミング2：認証・決済・個人情報・外部APIの実装依頼を受けたとき

`@security-auditor` を自律的に呼び出す（設計モード）。
人間が「@security-auditorを呼んで」と言う必要はない。

### タイミング3：スプリント開始前（Sprint Contract レビュー時）

そのスプリントに認証・決済・個人情報・外部APIが含まれる場合、
`@security-auditor`（設計モード）を Evaluator のレビュー前に自律的に呼び出す。

### タイミング4：DB設計・デプロイ設定・認証機能の実装依頼を受けたとき

`.opencode/rules/security.md` の「ゼロデイ・多層防御」セクションに基づき、
最小権限・コンポーネント分離・WAF・監査ログ・インシデント対応計画の設計を
実装前に人間に提示する。人間の指示を待たずに自律的に実行する。

---

## 判断ステップ

### Step 1：プロジェクト性質の読み取り

`docs/project-definition.md` から以下を読み取る：

| 確認項目 | 読み取り先 |
|---------|-----------|
| 個人情報を扱うか | 守るべき資産・ユーザーデータ |
| 決済機能があるか | 機能要件の Must |
| 医療・健康データか | プロジェクト目的・機密データ種別 |
| EU・米国ユーザーか | 対象ユーザーの地域 |
| 政府・官公庁向けか | 対象ユーザー |
| チーム規模と商用か | チーム規模・プロジェクト種別 |
| 外部APIを使うか | 技術制約・連携サービス |

### Step 2：対応レベルの決定

```
プロジェクト規模 × データ感度 → 対応レベル

             │ 機密なし │ 個人情報 │ 決済・医療
─────────────┼─────────┼─────────┼──────────
個人（1人）   │  Lv.1   │  Lv.2   │   Lv.3
小規模（2-5人）│  Lv.2   │  Lv.3   │   Lv.4
中規模以上（6人以上）│  Lv.3   │  Lv.4   │  Lv.4+

プロジェクト規模の定義: 個人=開発者1人、小規模=2〜5人、中規模以上=6人以上
（commercial-operations.mdのチーム規模定義と統一）
データ感度の定義: 機密なし=公開情報のみ、個人情報=氏名・メール・住所等、決済・医療=クレジットカード・医療記録・要配慮個人情報
チーム規模が境界の場合（例: 2人と3人の間）は、データ感度が高い方のレベルを採用する
```

**Lv.1（最小）**：HTTPS・パスワードハッシュ化・.env管理・入力バリデーション
- 準拠基準：OWASP Top 10（全プロジェクト共通の最低ライン）
- 実装ガイド（構築の指針・情報源・例外対応）：`.opencode/standards/principles/security-implementation.md`

**Lv.2（標準）**：↑ + RBAC・JWT適切運用・依存関係スキャンのCI組み込み
- 準拠基準：OWASP Top 10 + OWASP ASVS Level 1〜2

**Lv.3（商用）**：↑ + 専門ファイルに従い脅威モデリング・DevSecOps・ペネトレーションテストを実施する
- 準拠基準：OWASP ASVS Level 2〜3
- 詳細：`.opencode/standards/principles/threat-modeling.md`（脅威モデリング）
         `.opencode/standards/principles/security-implementation.md`（DevSecOps）

**Lv.4（規制対象）**：↑ + 業界固有規制の準拠（PCI DSS / GDPR / ISMAP等）
- 準拠基準：業界標準 + NIST SP 800-53（政府向け）

**言語別の追加基準**（Lv.に関係なく、使用言語に応じて追加）：
- C / C++ → CERT C/C++ Coding Standards（バッファオーバーフロー・メモリ安全性）
- モバイル → OWASP Mobile Top 10（ローカル暗号化・証明書ピンニング）
- Web全般 → 使用フレームワーク（ARCHITECTURE.mdに記録）の公式セキュリティガイドを検索する
  （検索クエリ：[使用フレームワーク名] official security documentation [現在年]）
- 詳細な言語別チェックリストは `.opencode/rules/security.md` を参照

### Step 3：適用される法令・標準の特定

```
個人情報あり → 個人情報保護法（日本）
  + EU展開  → GDPR（違反時：全世界売上4%または2000万ユーロの罰則）
  + 米国展開 → CCPA（カリフォルニア州）

決済あり → PCI DSS v4.0
  → カード番号を自サーバーに保持しない設計が現実的（Stripe等のトークン化を使う）

医療・健康データ → 要配慮個人情報（個人情報保護法）
  + 医療機関向け → 厚労省「医療情報システムの安全管理に関するガイドライン」
  + 米国展開    → HIPAA

政府・官公庁向け → ISMAP / NIST SP 800-53（調達要件として求められる場合がある）

金融・投資 → 金融庁ガイドライン / FISC安全対策基準

EC・電子商取引 → 特定商取引法（日本）/ 消費者契約法（日本）
  + 定期購入あり → 特定商取引法の定期購入規制（2022年改正・解約手続きの明示義務）
  + EU展開      → EU消費者権利指令
  → 最新の法令改正をWeb検索で確認する：`特定商取引法 [現在年] 改正`

教育・子ども向けサービス → 個人情報保護法（未成年の情報は保護者の同意が必要）
  + 13歳未満対象（米国展開）→ COPPA（Children's Online Privacy Protection Act）
    → COPPA準拠：保護者の確認可能な同意なしに13歳未満の個人情報を収集しない
  + 学校・教育機関向け（米国展開）→ FERPA（Family Educational Rights and Privacy Act）
  → 最新の法令をWeb検索で確認する：`COPPA compliance requirements [現在年]`

ゲーム → 資金決済法（日本）：有償ガチャ・仮想通貨の取り扱いに注意
  + ランダム型アイテム提供 → 確率表示義務（日本オンラインゲーム協会ガイドライン）
  + 未成年課金制限 → 各プラットフォーム（Apple / Google）の課金ガイドラインに従う
  → 最新のガイドラインをWeb検索で確認する：`日本オンラインゲーム協会 ガイドライン [現在年]`
```

不正アクセス禁止法（日本）→ ペネトレーションテスト・脆弱性診断を実施するすべてのプロジェクトに適用
  - 対象システムの管理者の書面による許可なしに実施することは違法
  - 外部委託でセキュリティ診断を依頼する場合も同様
  - 本番環境以外（ステージング・テスト環境）での実施であっても許可が必要

サイバーセキュリティ基本法（日本）→ 政府・官公庁・重要インフラ向けシステムに適用
  - ISMAP登録クラウドサービスの使用が調達要件として求められる場合がある
  - 重要インフラ：金融・電力・通信・医療・交通・水道・化学・クレジット・石油の14分野
  → 最新の重要インフラ分野一覧を確認する：`重要インフラ サイバーセキュリティ [現在年]`

著作権・ライセンス → OSSライブラリを使用するすべてのプロジェクトに適用
  - GPL系ライセンス（GPL v2 / GPL v3 / AGPL）：コード公開義務（コピーレフト）が生じる
  - MIT / Apache 2.0 / BSD：商用利用可・コード公開義務なし
  - LGPL：動的リンクは公開義務なし・静的リンクは義務あり（リンク方法を確認する）
  - Creative Commons：コンテンツライセンス。CC BY-SAはコピーレフトに相当する
  → ライセンス確認は `stack-setup.md` の Step 3.5 ブロックE（ライセンス確認とプライバシーポリシー要否の判定）が自律実行する

電気通信事業法（日本）→ アプリがユーザーの通信情報（IPアドレス・行動ログ）を外部送信する場合
  - 2023年改正：外部送信規律（Cookieや行動データの送信先・目的の通知・公表が必要）
  → 最新要件を確認する：`電気通信事業法 外部送信規律 [現在年]`

上記に該当する業種・条件が複数ある場合、すべての法令・標準を適用する。
一覧にない業種の場合、以下の検索クエリで最新の法的要件を確認する：
`[業種名] コンプライアンス 法的要件 [現在年]` / `[業種名] regulatory compliance requirements [現在年]`

### Step 4：判断結果の反映

#### AGENTS.md への Security Boundaries 追記フォーマット

```markdown
## Security Boundaries

<!-- security-requirements.md の判断結果。プロジェクト性質に応じて自動更新される -->
<!-- 対応レベル：[Lv.1 / Lv.2 / Lv.3 / Lv.4]（[判断した理由の概要]） -->

### 全プロジェクト共通（変更禁止）
- 認証・認可を実装したとき → 実装前に `@security-auditor`（設計モード）を呼び出す
- 外部入力を受け取るエンドポイントを実装したとき → バックエンドバリデーションを確認する
- 環境変数を追加したとき → `.env.example` に反映し secrets スキャンを実行する
- package.json / requirements.txt / requirements-dev.txt / pyproject.toml / go.mod / Cargo.toml / pom.xml / build.gradle / build.gradle.kts / Gemfile / composer.json / pubspec.yaml / *.csproj / packages.config を編集したとき → rules/security.md の言語別コマンド対応表に従いauditを実行する。対応表にない言語の場合は人間に確認を促す
- 実装完了後 → `@security-auditor`（監査モード）を呼び出す

### このプロジェクト固有の制約
<!-- 以下は project-definition.md の内容から自動生成。手動変更可 -->
[個人情報あり]   - 収集・保存・削除のすべてにプライバシーポリシーの根拠が必要
[決済あり]       - カード番号をサーバーに保持しない（Stripe等のトークン化を使う）
[EU展開あり]     - ユーザー同意なしにCookieを設定しない・削除要求に72時間以内に対応
[医療データあり] - アクセスログを改ざん不可な形式で保存する
[GDPR適用]       - データ処理の法的根拠を実装前に明確にする
[PCI DSS]        - 年次のセキュリティレビュー計画を docs/operations.md に記録する
<!-- 該当しない行は削除する -->
```

---

## ゼロデイ・依存ライブラリ監視の自動設定

`docs/project-definition.md` が作成されたとき、AIは以下を自律的に確認・実行する：

### 確認：自動監視が設定されているか

```bash
# 以下のいずれかが存在するか確認する
ls .github/dependabot.yml 2>/dev/null || echo "未設定"
ls renovate.json 2>/dev/null || echo "未設定"
grep -r "npm audit\|pip-audit\|cargo audit" .github/ 2>/dev/null || echo "CI未設定"
```

### 未設定の場合：設定ファイルの作成を提案し、承認を得て作成する

**GitHub プロジェクトの場合（.github/dependabot.yml）**

```yaml
# .github/dependabot.yml
# 依存ライブラリの脆弱性を自動検知・PRを作成する
# package-ecosystem は使用言語に合わせて変更すること
version: 2
updates:
  - package-ecosystem: "npm"        # npm / pip / cargo / go / maven / composer
    directory: "/"
    schedule:
      interval: "weekly"            # daily / weekly / monthly
    open-pull-requests-limit: 5
    labels:
      - "security"
      - "dependencies"
```

**CI パイプラインへの組み込み（言語別）**

Node.js:
```yaml
# .github/workflows/security.yml に追加
- name: Audit dependencies
  run: npm audit --audit-level=high
```

Python:
```yaml
- name: Audit dependencies
  run: pip install pip-audit && pip-audit
```

### 自動監視の設定完了後にやること（AIが提案する）

```
月次で手動実行する（Dependabot未設定のプロジェクト、または月次診断時の補完として）：
  Node.js: npm audit
  Python:  pip-audit
  Rust:    cargo audit
  Go:      govulncheck ./...

CIで検知されたHIGH以上の脆弱性は即時対応する（D領域ではなくA領域として扱う）。
詳細は .opencode/standards/principles/risk-based-approach.md の「リスクの4象限」を参照。
```

---

## AIへの参照方法

このファイルは以下のタイミングでAIが自律的に参照する。
人間が「このファイルを読んで」と言う必要はない。

| 参照タイミング | 参照元 |
|--------------|-------|
| project-definition.md 作成後 | ARCHITECTURE.md の Step 3 に組み込まれている |
| 実装依頼を受けたとき | security-auditor.md の設計モード |
| スプリント開始前 | AGENTS.md の Subagents セクション |
| 月次診断時 | live-operation/SKILL.md の Monthly Checklist |

---

## 対応レベル別チェックリスト

### Lv.1（個人・小規模・機密なし）

```
[ ] HTTPS必須（HTTP禁止）
[ ] パスワードはbcrypt（ラウンド12以上）またはArgon2でハッシュ化
[ ] APIキー・シークレットは.envで管理（コードに書かない）
[ ] すべての外部入力をバックエンドでバリデーション
[ ] エラーレスポンスにスタックトレースを含めない
[ ] npm audit / pip-audit でHIGH以上の脆弱性がないことを確認
```

### Lv.2（中規模チーム・個人情報あり）

```
Lv.1の全項目に加えて：
[ ] JWT：アクセストークン15〜60分・リフレッシュトークンをDBで管理
[ ] RBAC（ロールベースアクセス制御）の実装
[ ] 依存関係スキャンをCIに組み込み（Dependabot または CI組み込み）
[ ] ログに個人情報・機密情報を出力しない設計
[ ] 認証失敗のレートリミット（5回失敗で15分ロック）
[ ] 監査ログ：ログイン・権限変更・個人情報アクセスを記録
```

### Lv.3（商用・中規模以上）

```
Lv.2の全項目に加えて：
[ ] 脅威モデリング実施（STRIDEモデル）→ `.opencode/standards/principles/threat-modeling.md` の手順に従い実施・decisions/に記録
[ ] DevSecOps：SAST/DAST/シークレットスキャンをCIパイプラインに組み込み → `.opencode/standards/principles/security-implementation.md` の「DevSecOpsパイプライン」セクションの手順に従い実施
[ ] ペネトレーションテスト → 以下を実施する：
    実施前に以下を検索して最新の手法・ツールを確認する：
    「OWASP penetration testing [現在年]」
    「AI penetration testing tools [現在年]」
    「automated penetration testing [現在年]」
    検索結果は📋フォーマットで人間に通知する。
    信頼できる情報源：
      OWASP Testing Guide（owasp.org）→ ペネトレーションテストの包括的な公式ガイド
      PTES（pentest-standard.org）→ ペネトレーションテスト実施標準
    AIツールは「既知の脆弱性パターンの自動検出」に有効。
    商用・Lv.4プロジェクトでは AIツールに加えて専門家による実施を推奨する。
    実施計画を docs/operations.md に記録する。
[ ] DB：最小権限・ネットワーク分離（VPC/プライベートサブネット）
[ ] WAF・レートリミットの設置
```

### Lv.4（規制対象：PCI DSS / GDPR / ISMAP）

```
Lv.3の全項目に加えて（該当する規制のみ）：
[ ] PCI DSS：カード番号を自サーバーに保持しない（Stripe等のトークン化）
[ ] GDPR：同意取得・削除要求72時間対応・データ処理の法的根拠を明確化
[ ] ISMAP：組織のセキュリティ管理基準の整備・第三者審査の計画
[ ] 年次セキュリティレビュー計画を docs/operations.md に記録
[ ] 監査ログを改ざん不可な形式で保存
```

---

## 言語・スタック別の追加ガイド

### JavaScript / TypeScript（Web・API）

OWASP Top 10 の Web向け対策を基準とする。

```
最優先で対応：
- XSS：ユーザー入力を innerHTML / dangerouslySetInnerHTML に渡さない
- CSP（Content Security Policy）ヘッダーを設定する
- CSRF：SameSite Cookie + CSRFトークンを実装する
- 依存関係：npm audit は依存ファイル編集時に自動実行・Dependabot（GitHub）または Renovate（汎用）で継続監視する

フレームワーク別：
- Next.js：next.config.js の headers() でセキュリティヘッダーを設定
- Express：helmet() ミドルウェアを必ず適用
- React：dangerouslySetInnerHTML の使用を原則禁止
```

### Python

```
最優先で対応：
- SQLインジェクション：SQLAlchemy のパラメータバインディングのみ使用
- pickle/yaml.load の安全でないデシリアライズを禁止（yaml.safe_load を使う）
- 依存関係：pip-audit は依存ファイル編集時に自動実行・Dependabot（GitHub）または Renovate（汎用）で継続監視する

フレームワーク別：
- Django：CSRF_COOKIE_SECURE・SESSION_COOKIE_SECURE を本番で有効化
- FastAPI：pydantic によるリクエストバリデーションを全エンドポイントに適用
```

### Java / Kotlin（Spring Boot 等）

```
最優先で対応：
- OWASP Java Guide に準拠
- Spring Security の設定漏れを確認（全エンドポイントに認証を要求）
- XXE（XML外部エンティティ）攻撃対策：XMLパーサーの外部エンティティを無効化
- 依存関係：Maven/Gradle の dependencyCheck プラグインをCIに組み込み
```

### C / C++（低レイヤー・組み込み）

CERT C/C++ Coding Standards を基準とする。

```
最優先で対応（CERT準拠）：
- バッファオーバーフロー：配列アクセスに境界チェックを必ず実装
- 整数オーバーフロー：演算前に範囲チェックを実施
- 未初期化変数の使用禁止
- malloc後のNULLチェック必須・freeした後のポインタをNULLにする

静的解析ツールを必ず導入：
- AddressSanitizer（-fsanitize=address）
- Valgrind（メモリリーク検出）
- clang-analyzer または Coverity
```

### モバイル（iOS / Android）

OWASP Mobile Top 10 を基準とする。

```
最優先で対応：
- ローカルデータ暗号化：
  iOS → Keychain を使う
  Android → EncryptedSharedPreferences を使う
- 証明書ピンニング：本番APIとの通信に適用
- デバッグログを本番ビルドで無効化（BuildConfig.DEBUG で制御）
- allowBackup="false"：機密データを含むアプリに適用
```

### Go

```
最優先で対応：
- sql.DB のクエリはプリペアドステートメントのみ使用
- 依存関係：govulncheck は依存ファイル編集時に自動実行・Dependabot（GitHub）または Renovate（汎用）で継続監視する
- エラーハンドリング：すべてのエラーを適切に処理（_ での無視を原則禁止）
```

### Rust

```
最優先で対応：
- unsafe ブロックの使用を最小化し、使用箇所をすべてコメントで説明
- 依存関係：cargo audit は依存ファイル編集時に自動実行・Dependabot（GitHub）または Renovate（汎用）で継続監視する
```

### 未対応言語の自律補完

上記にない言語の場合：
1. `OWASP [言語名] cheat sheet` / `[言語名] security best practices [現在年]` をWebで検索する
2. 導出した要件を参照情報源とともに人間に提示する
3. 同じ言語で2回以上指摘が発生した場合 → decisions/ へのルール化を提案する

---

## ゼロデイ・多層防御（Defense in Depth）

目標：「発生を防ぐ」ではなく「被害を最小化・素早く回復する」。

### 設計段階で組み込む

**最小権限の原則**（Lv.1以上）：
```
- DBユーザーはアプリに必要な操作だけ（DROP・CREATE禁止）
- APIキーはそのエンドポイントに必要なスコープのみ
```

**コンポーネント分離**（Lv.2以上）：
```
- DBをインターネットから直接アクセス不可にする（VPC / プライベートサブネット）
- フロントエンドとバックエンドを分離し、DBには必ずバックエンド経由でアクセス
```

**WAF・レートリミット**（Lv.3以上 または 個人情報・決済あり）：
```
- WAF（Cloudflare WAF / AWS WAF / Google Cloud Armor）を本番に設置
- レートリミットをAPIエンドポイントに設定
```

### 検知・回復の準備（Lv.2以上）

**監査ログ**：
```
記録する操作：ログイン成功・失敗 / 権限変更 / 個人情報アクセス / 設定変更
ログに含めてはいけないもの：パスワード・APIキー・クレカ番号（マスク処理）
```

**インシデント対応計画**（Lv.3以上）：
```
docs/operations.md に記録する：
- 脆弱性発見時の連絡フロー
- 緊急パッチの適用手順
- 個人情報漏洩時の監督機関への報告（72時間以内）
```

**定期バックアップ**（Lv.2以上）：
```
- DBの自動バックアップ（日次・世代管理）
- 本番環境とは別のリージョン・ストレージに保存
```

### AIが自律的に確認するタイミング（人間の指示は不要）

| 依頼の内容 | 自律的に提示する観点 |
|-----------|-------------------|
| DB設計・接続設定 | 最小権限・ネットワーク分離 |
| 認証・ログイン | 監査ログ・レートリミット |
| 本番デプロイ・インフラ | WAF・バックアップ・インシデント対応計画 |
| APIエンドポイント追加 | レートリミット・認証の確認 |
| ファイルアップロード | ファイル種別制限・保存先のアクセス制御 |
