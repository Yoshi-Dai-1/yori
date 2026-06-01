# 脅威モデリング実施ガイド（Threat Modeling）

## このファイルの目的と参照タイミング

AIが以下のタイミングで自律的に参照する。人間が指示する必要はない。

```
参照タイミング：
  security-requirements.md の対応レベルが Lv.3以上と判定されたとき
  ARCHITECTURE.md Step3 でセキュリティ要件を記録するとき
  security-requirements.md のLv.3チェックリストに「脅威モデリング」が含まれるとき
```

脅威モデリングは年々手法・ツールが更新される。
実施前に以下を必ずWebで検索してから進める（人間の指示を待たない）：

```
1. STRIDE threat modeling [現在年]
2. OWASP threat modeling [現在年]
3. [使用言語] [使用フレームワーク（ARCHITECTURE.mdに記録）] security threats [現在年]
```

検索結果は情報源通知テンプレートで人間に通知する。
裏付けが取れなかった場合は「AIの学習データに基づく実施」と明示する。

## 信頼できる情報源（観点別・組み合わせて参照する）

URLは変更される可能性があるため組織名・ドメインで判断する。

```
手法・フレームワーク：
  OWASP（owasp.org）→ Threat Modeling Cheat Sheet
  Microsoft（learn.microsoft.com）→ Threat Modeling（STRIDEモデル原点）

ツール：
  OWASP Threat Dragon（owasp.org）→ 無料のオープンソースツール
  Microsoft Threat Modeling Tool（microsoft.com）→ 無料
```

---

## STRIDEモデル（言語・規模・データ種別を問わず汎用的に使用できる）

```
S = Spoofing（なりすまし）
  例：正規ユーザーのふりをした不正ログイン・偽装APIリクエスト

T = Tampering（改ざん）
  例：通信中のデータ改ざん・DBの不正書き換え・ログの改ざん

R = Repudiation（否認）
  例：「その操作はしていない」と主張できる状態・監査ログの欠如

I = Information Disclosure（情報漏洩）
  例：個人情報の漏洩・APIキーの露出・エラーメッセージからの内部情報漏洩

D = Denial of Service（サービス妨害）
  例：大量リクエストによるサーバーダウン・リソース枯渇攻撃

E = Elevation of Privilege（権限昇格）
  例：一般ユーザーが管理者権限を取得・認可チェックの迂回
```

---

## 実施手順（AIが自律実行）

### Step 1：プロジェクト情報の読み取り

ARCHITECTURE.md と docs/project-definition.md を読んで以下を特定する：

```
信頼境界の特定：
  インターネット（外部ユーザー）
  アプリケーションサーバー
  データベースサーバー
  外部APIサービス
  管理者・内部システム

データフローの特定：
  ユーザー → フロントエンド → APIサーバー → DB
  のように、データがどこからどこへ流れるかを整理する

外部エンティティの特定：
  一般ユーザー・管理者・外部APIプロバイダー・CI/CDシステム
  （docs/project-definition.md に記載の対象ユーザーと連携サービスを参照して特定する）
```

### Step 2：STRIDE各項目で脅威を列挙する

各データフローと信頼境界に対して、S/T/R/I/D/Eの6項目を確認する。

```
確認の手順：
  1. 各データフロー（例：ユーザー認証）に対してS〜E全項目を確認する
  2. 該当する脅威を具体的に記述する
  3. 既に対策済みの脅威は「対策済み」と記録する
  4. 未対策の脅威は次のStep 3へ進む
```

### Step 3：リスク評価

発見した脅威を `.opencode/standards/principles/risk-based-approach.md` の
4象限（影響度×発生確率）で分類する。

```
深刻度分類は risk-based-approach.md の「深刻度ラベルの体系と使い分け」に従う。
CRITICAL/HIGH/MEDIUM/LOW と4象限（A/B/C/D）の紐付けは同ファイルを参照。

影響度の判定基準:
  高 = サービス停止またはデータ漏洩に直結
  中 = 一部機能の停止・データ不整合
  低 = UX低下・軽微な不具合
発生確率の判定基準:
  高 = 外部からインターネット経由で攻撃可能
  中 = 認証済みユーザーまたは内部者による操作が必要
  低 = 物理アクセスまたは特殊な環境が必要
```

### Step 4：対策の割り当て

```
CRITICAL/HIGH の脅威：
  → 対策を現スプリントまたは次スプリントに組み込む
  → ARCHITECTURE.md の「セキュリティ要件」セクションに追記する

MEDIUM/LOW の脅威：
  → decisions/ に記録し、計画的に対処する

すべての脅威と対策を decisions/[連番]-threat-modeling.md に記録する
```

### Step 5：例外対応

```
脅威は特定できたが対策方法が分からない場合：
  1. 「[脅威の種類] mitigation [現在年]」をWebで検索する
  2. OWASP Cheat Sheet Series で該当する対策を検索する
  3. 検索結果を情報源通知テンプレートで人間に通知する
  4. 対策が見つからない場合は「未解決の脅威」として記録し、
     専門家への相談を提案する

プロジェクトの規模・予算上、すべての脅威に対処できない場合：
  → risk-based-approach.md の優先順位に従い、
    CRITICAL/HIGH から対処する
  → LOW は「受容可能なリスク」として decisions/ に記録する
```

---

## 実施タイミングの目安（対応レベル別）

```
Lv.3（商用・中規模以上）：
  → 初回：ARCHITECTURE.md Step3 完了後に実施する
  → 以降：大きな機能追加のスプリント開始前に再実施する

Lv.4（規制対象）：
  → 初回：ARCHITECTURE.md Step3 完了後に実施する
  → 以降：すべてのスプリント開始前に再実施する
  → 外部監査：年次でセキュリティ専門家によるレビューを計画する
```
