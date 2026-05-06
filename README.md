# dev-standards

AIとともに開発するためのハーネスエンジニアリングのナレッジベース。
あらゆるプロジェクト種別に横断的に適用できる設計思想・テンプレート・原則を集積する。

---

## このリポジトリの位置づけ

```
dev-standards（このリポジトリ）
  = ハーネスの設計図・テンプレート集

各プロジェクトの .claude/
  = 実際に機能するハーネス本体

dev-standardsをプロジェクトに「配置」しても機能しない。
setup-harness.sh でテンプレートをコピーして、
プロジェクト固有の情報を記入することで初めて機能する。
```

---

## 構成

```
dev-standards/
  setup-harness.sh              ★ 新プロジェクト開始時に使うセットアップスクリプト

  principles/                   汎用原則（読む・参照する）
    harness-engineering.md      ハーネスの全体像・5つの原則・タスク規模別構成
    project-definition.md       プロジェクト開始時：目的・要件・制約・セキュリティ要件の定義
    directory-structure.md      ディレクトリ設計の根本思想
    naming-conventions.md       命名規則
    file-size-and-cohesion.md   行数指針・凝集度
    ssot-and-constants.md       SSOT管理
    non-functional-requirements.md  非機能要件の定義（8カテゴリ）
    tdd-with-ai.md              AI協働TDDの手順
    code-review.md              レビューの観点
    code-quality.md          ★ コード品質の6軸・劣化モデル・設計原則
    risk-based-approach.md   ★ リスクベース判断・脅威マップ・優先度フレーム
    security-implementation.md ★ 認証・セキュリティ実装のAIへの問い方
    resilience.md            ★ 壊れても死なない設計・バックアップ・多層防御
    commercial-operations.md ★ 商用固有：SLA/SLO・ブランチ戦略・インシデント管理・監査ログ
    subagents.md                サブエージェントの設計と活用
    production-readiness.md     本番リリース前チェックリスト（9カテゴリ）
    production-deployment.md    本番移行ガイド（12因子・DDD・監視）

  architectures/                プロジェクト種別ごとの構成パターン
    _how-to-choose.md           ★ 種別の選び方（フローチャート）← まずここを読む
    web-frontend-large.md / web-frontend-small.md
    backend-api.md / monorepo.md
    data-pipeline.md / document-project.md

  decisions/                    判断の記録（ADR・技術選定）
    skill-candidates.md         スキル化候補（AIが自動追記）

  snippets/                     テンプレート集（コピーして使う）
    ARCHITECTURE.md.template    ★ セキュリティ・品質・依存関係リスクセクション追加
    tech-decision.md.template
    .gitignore.template
    .env.example.template
    tsconfig.base.json

    agents/                     AGENTS.mdテンプレート（単一・60〜100行）
      AGENTS.md                 全プロジェクト共通（フェーズ問わず使う）
      subagents/                サブエージェント定義ファイル
        planner.md              仕様策定（1〜4文→詳細仕様書）
        evaluator.md            品質評価（Build後のQA・スプリント契約との照合）
        code-reviewer.md
        security-auditor.md
        test-generator.md
        codebase-investigator.md
        resilience-checker.md   ★ レジリエンス診断（月次GC時に使用）
        code-quality-auditor.md ★ コード品質診断（月次GC時に使用）

    .claude/                    ハーネス雛形（setup-harness.shがコピーする）
      rules/
        _template.md            ルールファイルの書き方テンプレート
      skills/                   プロジェクトスコープのスキル（.claude/skills/に配置・gitで共有）
        release-prep/SKILL.md   ★ 本番リリース準備（「本番に出したい」で自動参照）
        live-operation/SKILL.md ★ 本番稼働中の変更・月次診断
        handoff/SKILL.md        ★ 引き継ぎ・長期停止・再開時の状態保存
      hooks/
        README.md                                                  Hooksの説明・命名規則・ツール対応状況
        on-stop.generate-handoff.sh.example                        Stopイベント：handoff生成
        on-pre-tool-use.check-secrets.sh.example                   PreToolUseイベント：機密情報チェック
        on-post-tool-use.lint-and-typecheck.sh.example             PostToolUseイベント：lint・型チェック
        on-post-tool-use.record-skill-usage.sh.example             PostToolUseイベント：スキル使用履歴記録
        on-post-tool-use.architecture-skill-check.sh.example       PostToolUseイベント：外部スキル診断
      usage/
        skill-usage.md          スキル使用履歴（Hooksが自動追記）
        rule-hits.md            ルール参照履歴
      project-context.md.template
      coding-conventions.md.template

# setup-harness.sh 実行時に ~/.claude/skills/ にインストールされるスキル（グローバルスコープ）
# ※ ~/.claude/skills/ はすべてのプロジェクトで有効。gitには含まれない。
# ※ Node.js が未インストールの場合は setup 後に手動実行：
#     npx skills add vercel-labs/skills --skill find-skills
#     npx skills add anthropics/skills --skill skill-creator
  find-skills  （vercel-labs/skills）  外部スキルの検索・インストール
  skill-creator（anthropics/skills）  スキルの新規作成・改善・eval・description最適化

# .claude/usage/ のgitignoreはsetup-harness.sh実行時にユーザーが選択する
# 個人開発→gitignore推奨、チーム開発→git管理推奨（詳細はsetup時の案内を参照）
```

---

## 新プロジェクト開始時の手順

### Step 0：dev-standards を PC に取得する（初回のみ）

```bash
# GitHubからdev-standardsをダウンロードする（1回だけ実行）
# ⚠️ プロジェクトを置く予定のフォルダと同じ場所にクローンすること
# 例：プロジェクトを ~/Documents/ に作るなら dev-standards も ~/Documents/ にクローンする
cd ~/Documents   # プロジェクトを置く場所と同じ親ディレクトリ
git clone https://github.com/[あなたのユーザー名]/dev-standards.git
```

これで `~/Documents/dev-standards/` フォルダが作られる。以降は不要。

### Step 1：新プロジェクトのフォルダを作る

```bash
# dev-standards の隣にプロジェクトフォルダを作成する（必須）
cd ~/Documents
mkdir my-new-project
cd my-new-project
```

**必須配置（dev-standardsとプロジェクトは必ず同じ親ディレクトリに置く）：**
```
Documents/
  dev-standards/       ← 複数プロジェクトで共有する（ここには触らない）
  my-project-a/        ← 新しいプロジェクト
  my-project-b/
```

⚠️ **dev-standardsとプロジェクトが別の場所にある場合**（例：dev-standardsは `~/Documents/`、プロジェクトは `~/repos/`）、`../dev-standards` というデフォルトパスが機能しない。その場合は以下のように絶対パスで指定する：

```bash
DEV_STANDARDS_PATH=/Users/yourname/Documents/dev-standards \
  bash /Users/yourname/Documents/dev-standards/setup-harness.sh
```

### Step 2：セットアップスクリプトを実行する

```bash
# my-new-project/ の中で実行する
# DEV_STANDARDS_PATH = dev-standardsがどこにあるか
DEV_STANDARDS_PATH=../dev-standards bash ../dev-standards/setup-harness.sh
```

実行するとハーネスのファイル構造が展開される（骨格のみ）。

### Step 3：AIと対話しながら4つのファイルを作成する

**スクリプト実行直後は骨格だけが存在する状態。以下の順番でAIと対話しながら記入する。**

#### 3-1：`docs/project-definition.md` を記入する

```
セットアップスクリプトが雛形を自動作成している。
dev-standards/principles/project-definition.md にある対話プロンプトをAIに渡す。
AIが質問を1つずつ投げかけるので答えていく。
AIが docs/project-definition.md に記入してくれる。
```

#### 3-2：`ARCHITECTURE.md` を記入する

```
ARCHITECTURE.md の冒頭にある対話プロンプトをAIに渡す。
docs/project-definition.md を参照しながらAIが一緒に埋めてくれる。
```

#### 3-3：`AGENTS.md` を記入する

```
AGENTS.md の Project Overview のコメント内にある対話プロンプトをAIに渡す。
ARCHITECTURE.md の内容をもとにAIが一緒に埋めてくれる。
```

#### 3-4：`.claude/project-context.md` を記入する

```
AGENTS.md の記入が完了したら、同じ内容をもとに
.claude/project-context.md の [] を埋めるようAIに依頼する。
このファイルはセッション開始時にAIへ渡す文脈情報として機能する。
```

この4ステップが完了して初めてハーネスとして機能し始める。

### Step 4：（任意）Hooksを有効にする

ファイル名は `on-[イベント名].[目的].sh.example` の形式になっている。
使いたいHookの `.example` を外して、プロジェクトに合わせて修正する。

```bash
# 例：セッション終了時のhandoff自動生成を有効にする場合
cp .claude/hooks/on-stop.generate-handoff.sh.example \
   .claude/hooks/on-stop.generate-handoff.sh
chmod +x .claude/hooks/on-stop.generate-handoff.sh
# ← 必要に応じてファイル内の設定を書き換える
```

### Step 4.5：（任意）playwright-cli を設定する（@evaluator を使う場合）

`@evaluator` サブエージェントはブラウザ操作に playwright-cli を使う。

```bash
# CLIとブラウザバイナリ：マシンに1回だけインストール（全プロジェクト共有）
npm install -g @playwright/cli@latest
playwright-cli install-browser

# スキル：プロジェクトルートで1回実行（このプロジェクト内の .playwright-cli/ に配置）
playwright-cli install --skills
```

| 対象 | 場所 | タイミング |
|------|------|-----------|
| CLIコマンド本体 | グローバル（全プロジェクト共有） | マシンに1回のみ |
| ブラウザバイナリ | グローバル（~/.cache/ms-playwright/） | マシンに1回のみ |
| スキル（SKILL.md等） | プロジェクト内（.playwright-cli/） | プロジェクトごとに1回 |

`.playwright-cli/` はセッション固有のデータも含むため `.gitignore` への追加を推奨する。

### Step 5：AIとの最初のセッションで dev-standards のパスを伝える

```
以下のファイルを参照しながら作業してください：
- AGENTS.md（このプロジェクトの作業指示）
- ARCHITECTURE.md（設計の詳細）
- dev-standardsの原則ファイル（パス：../dev-standards/principles/）
```

---

### ハーネスの健全性を確認する（いつでも実行可能）

セットアップ後や、しばらく開発が止まっていた後など、ハーネスが正しく機能しているか確認したいときに使う。以下の指示をAIにそのまま渡す：

```
以下のファイルを確認して、ハーネスの健全性を報告してください：

1. AGENTS.md・ARCHITECTURE.md・.claude/coding-conventions.md に
   [DEV_STANDARDS_PATH] などのプレースホルダーが残っていないか

2. .claude/project-context.md の「現在のタスク」が最新の状態か
   （「取り組んでいる機能」が完了済みのままになっていないか）

3. .claude/handoff-artifact.md が存在するか
   存在しない場合：Hooksが未設定なので「handoff-artifact.mdを更新して」と
   セッション終了前に毎回依頼する運用が必要

4. decisions/ に記録されている判断のうち、
   前提（使用技術・外部API・チーム構成）が変わっているものがないか

問題があれば修正方法を提案してください。
問題がなければ「ハーネス正常」と報告してください。
```

---

## 開発フローとファイルの対応

```
プロジェクト定義              → principles/project-definition.md
                               ★ セキュリティ要件・リスク評価セクションを必ず記入
                               ★ 商用の場合は principles/commercial-operations.md を参照
技術選定                      → snippets/tech-decision.md.template → decisions/
アーキテクチャ決定            → architectures/_how-to-choose.md で種別を選ぶ
                               → 該当の architectures/*.md を通読する
                               → ARCHITECTURE.md を記入する
                               ★ セキュリティ・コード品質・依存関係リスクセクションも記入
ハーネスセットアップ          → setup-harness.sh を実行
フルアプリ構築（スプリント）   → 1〜4文の仕様を `@planner` に渡す
                                  → spec.md（Sprint Contract 含む）+ features.json を生成
                               → 各スプリント開始前：`@evaluator` に Sprint Contract レビューを依頼
                                  → 承認されたら実装。差し戻されたら spec.md を修正して再依頼
                               → 実装完了後：`@evaluator` に QA評価を依頼
                                  → PASS で features.json の passes が更新される
                                  → FAIL で修正しスプリントをやり直す
                               → subagents.md を参照

実装（TDD）                   → principles/tdd-with-ai.md
                               → 認証・機密データを扱う実装は
                                 principles/security-implementation.md を参照
                               .claude/rules/（同じ指摘を2回したら追加）
                               .claude/skills/（3回以上繰り返したら追加）
コードレビュー                → @code-reviewer / principles/code-review.md
                               ★ @security-auditor（認証・機密データ実装後は必須）
本番リリース準備              → .claude/skills/release-prep/ が自動参照される
                               （「本番に出したい」「リリースしたい」と伝えるだけ）
                               principles/production-deployment.md
                               principles/production-readiness.md（9カテゴリ確認）
本番稼働中の変更              → .claude/skills/live-operation/ が自動参照される
月次GC                        → 「月次診断して」と依頼するだけ
                               .claude/skills/live-operation/ のMonthly Checklistが実行される
                               → @resilience-checker（★レジリエンス診断）
                               → @code-quality-auditor（★コード品質診断）
                               → .claude/usage/ を参照してGCを実施
```

---

## ハーネスの育て方

```
Day 1  ：setup-harness.sh → AIと対話しながら以下の4ファイルを記入する
           docs/project-definition.md（目的・要件・セキュリティ要件）
           ARCHITECTURE.md（技術スタック・層のルール・非機能要件）
           AGENTS.md（プロジェクト名・コマンド・現在のタスク）
           .claude/project-context.md（AGENTS.mdと同内容で簡潔に）

各セッション：【開始時】人間が .claude/handoff-artifact.md をAIに渡して文脈を復元する。
           docs/features.json が存在する場合、未完了フィーチャーを確認する。
           Smoke Test：Dev コマンドが定義されている場合サーバーを起動して基本動作を確認する（サーバーなしプロジェクトはテストコマンドで代替）。
           AIが Current Task と .claude/project-context.md の「現在のタスク」を更新する。
           【終了時】Stop イベントのHookが .claude/handoff-artifact.md のテンプレートを自動生成する。
           docs/build-log.md には Hook が日付行を追記し、handoff スキル使用時は最終行が実際の内容に更新される。
           Hookを設定していない場合はAIに「handoff-artifact.mdを更新して」と依頼する。

技術選定の都度：ライブラリ選定・認証方式・外部サービス契約などの判断が発生したとき、
           AIがReport Formatの「要記録判断」で通知する。
           人間が承認したら decisions/ にAIが記録する。

rules/の育て方：同じ指摘をAIから2回受けたとき → 「これをrulesに追加して」と依頼する。
           AIがルールファイルを作成して .claude/rules/ に保存する。

skills/の育て方：同じ作業が3回以上発生したとき → AIが候補を報告する。
           人間が承認したら `/skill-creator` を起動してスキルを作成する。
           （skill-creator は setup-harness.sh 実行時に ~/.claude/skills/ にインストール済み）

本番リリース準備：「本番に出したい」とAIに伝えるだけ。
           .claude/skills/release-prep/ が自動参照され、
           必要な手順をAIが順番に案内してくれる。
           デプロイ・ロールバック・障害対応の手順が決まったら
           AIと対話しながら docs/operations.md に記入する。

Month 1：「月次診断して」とAIに依頼する。
         .claude/skills/live-operation/ のMonthly Checklistが実行される。
         @resilience-checker と @code-quality-auditor が呼び出され、診断結果を報告する。
以降   ：月次で診断・定期的に削除。問題にぶつかるたびにrules/skills/を追加。
```

詳細は `principles/harness-engineering.md` を参照。

---

## 更新ルール

- `principles/` の原則を変更する場合は理由を `decisions/` に記録する
- `architectures/` はプロジェクト経験に基づいて随時更新する
- `decisions/` は削除しない
- `snippets/` の設定ファイルは動作確認したものだけを入れる
- `decisions/skill-candidates.md` はスキル化候補を記録する（記録のタイミングは同ファイル参照）
