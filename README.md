# dev-standards

AIとともに開発するためのハーネスエンジニアリングのナレッジベース。
あらゆるプロジェクト種別に横断的に適用できる設計思想・テンプレート・原則を集積する。

---

## このリポジトリの位置づけ

```
dev-standards（このリポジトリ）
  = ハーネスの設計図・テンプレート集

各プロジェクトの .opencode/
  = 実際に機能するハーネス本体

dev-standardsをプロジェクトに「配置」しても機能しない。
setup-harness.sh でテンプレートをコピーして、
プロジェクト固有の情報を記入することで初めて機能する。
```

---

## 構成

```
dev-standards/
  AGENTS.md                    ★ このリポジトリの開発用（setup-harness.shでコピーされない）
  .design-notes/               ★ 設計メモ（同様にコピーされない・他プロジェクトに混入しない）
    session-context.md           セッション間の設計文脈復元用（各セッション終了時に上書き）
    session-context-protocol.md  Session Context 更新プロトコル（追記防止設計・検証計画）
    plugin-events.md             Plugin イベント設計判断の記録（session.deleted代替案）
  setup-harness.sh              ★ 新プロジェクト開始時に使うセットアップスクリプト

  principles/                   汎用原則（読む・参照する）
    harness-engineering.md      ハーネスの全体像・5つの原則・タスク規模別構成
    project-definition-guide.md   プロジェクト定義ガイド：目的・要件・制約を記入するための対話プロンプト
    directory-structure.md      ディレクトリ設計の根本思想・必須ファイルの自律調達ルール
    design-contract.md           デザイン契約の3本柱（Token SSOT・Component Map・語彙正規化）
    naming-conventions.md       命名規則（基本・言語別・REST API・GraphQL・WebSocket・DB・セキュア命名・Conventional Commits・自律確定フロー）
    file-size-and-cohesion.md   行数指針・凝集度
    ssot-and-constants.md       SSOT管理
    non-functional-requirements.md  非機能要件の定義（11カテゴリ：i18n・テスト戦略・アクセシビリティ追加）
    tdd-with-ai.md              AI協働TDDの手順（Step 8：コミット実行を含む）
    code-review.md              レビューの観点
    code-quality.md          ★ コード品質の6軸・劣化モデル・設計原則
    risk-based-approach.md   ★ リスクベース判断・脅威マップ・優先度フレーム
    security-implementation.md ★ 認証・セキュリティ実装のAIへの問い方
    security-requirements.md  ★ セキュリティ対応レベルの自律判断（Lv.1〜4）・業種別法令・著作権・電気通信事業法・不正アクセス禁止法
    threat-modeling.md         ★ 脅威モデリング実施ガイド（STRIDEモデル）
    resilience.md            ★ 壊れても死なない設計・バックアップ・多層防御
    network-resilience.md   ★ 通信安定性設計（タイムアウト・リトライ・冪等性・WebSocket・GraphQL・自律実行）
    commercial-operations.md ★ 商用固有：SLA/SLO・ブランチ戦略（個人〜大規模全規模対応）・インシデント管理・監査ログ
    subagents.md                サブエージェントの設計と活用
    production-readiness.md     本番リリース前チェックリスト（9セクション：ユーザーテスト・負荷テスト・APIドキュメント・OSS公開チェックリスト追加）
    production-deployment.md    本番移行ガイド（12因子・DDD・監視）

  architectures/                プロジェクト種別ごとの構成パターン
    _how-to-choose.md           ★ 種別の選び方（フローチャート）← まずここを読む
    web-frontend-large.md       大規模Webフロントエンド（FSD・モノレポ構成）
    web-frontend-small.md       小規模Webフロントエンド（シンプル構成）
    backend-api.md              バックエンドAPI（REST / GraphQL）
    monorepo.md                 モノレポ構成
    mobile.md                ★ iOS / Android / クロスプラットフォームアプリ
    microservices.md         ★ マイクロサービスアーキテクチャ
    serverless.md            ★ サーバーレス（Lambda / Workers / Edge Functions）
    data-pipeline.md            データ処理・分析・バッチ
    document-project.md         ドキュメント・仕様書プロジェクト
    desktop-app.md              デスクトップアプリ（Electron / Tauri / PyQt6 / .NET MAUI / WPF）
    cli-tool.md                 CLIツール・配布スクリプト（npm / pip / Homebrew / winget 等）
    iac.md                      IaC（Terraform / OpenTofu / AWS CDK / Pulumi / Ansible / Helm）

  decisions/                    判断の記録（ADR・技術選定）
    001-no-numbering-in-src.md    ADR: プロダクションコードのディレクトリにナンバリングを使わない
    002-kebab-case-for-dirs.md    ADR: ディレクトリ名に kebab-case を使う
    003-three-layer-knowledge-management.md  ADR: 知識・雛形の管理を三層構造にする
    skill-candidates.md          スキル化候補（AIが自動追記）

  snippets/                       テンプレート集（コピーして使う）
    ARCHITECTURE.md.template    ★ セキュリティ・品質・依存関係リスク・スケーラビリティ・開発プロセスセクション追加
    DESIGN.md.template          UIデザイン入口テンプレート（索引。値は token-ssot.json が正本）
    design/
      token-ssot.json.template  デザイントークンSSOTテンプレート（W3C形式）
      component-map.json.template  コンポーネントマッピングテンプレート
      INTAKE.md.template       デザイン記入手順テンプレート（初回セットアップ時・再収集時に使用）
    tech-decision.md.template   技術選定記録テンプレート
    .gitignore.template         git除外設定テンプレート
    .env.example                環境変数テンプレート（setup-harness.shが自動コピー）
    .editorconfig               エディタ間コードスタイル統一設定

    docs/                       ドキュメント雛形
      quality-scorecard.md.template  ★ 月次診断スコアカード雛形
      working/                  作業ディレクトリテンプレート（setup-harness.sh がコピー）
        plan.md.template        タスクの詳細計画テンプレート
        notes.md.template       実装メモテンプレート
        review-checklist.md.template  完了前チェックテンプレート

    agents/                     AGENTS.mdテンプレート（単一・60〜100行）
      AGENTS.md                 全プロジェクト共通（フェーズ問わず使う・コミット実行設定を含む）
      subagents/                サブエージェント定義ファイル
      _shared/                  サブエージェント間で共有されるSSoT（呼び出し形式テンプレート等）
      planner.md              仕様策定（1〜4文→詳細仕様書）
      evaluator.md            品質評価（Build後のQA・スプリント契約との照合）
      code-reviewer.md
      security-designer.md
      security-auditor.md
      test-generator.md
      codebase-investigator.md
      resilience-checker.md   ★ レジリエンス診断（月次GC時に使用）
      code-quality-auditor.md ★ コード品質診断（月次GC時に使用）

    .opencode/                    ハーネス雛形（setup-harness.shがコピーする）
      instructions/                 マークダウンルール（Plugin rule-injector がイベント駆動で注入。opencode.json の instructions は ["AGENTS.md"] のみ）
        _shared/                   共有SSoT（ルール・エージェント間で横断的に利用可能）
          _info-source-format.md ★ 情報源通知フォーマット
        security.md               ★ セキュリティルール
          security/                 トリガー別手順（_trigger-project-definition / _trigger-first-code / 他6）
        network-resilience.md     ★ 通信設計ルール
          network-resilience/       トリガー別手順（_trigger-arch / _trigger-implementation-phase / _ws-graphql）
        stack-setup.md              技術スタック設定ファイルの自動展開ルール
          stack-setup/              言語別設定（_typescript / _python / _go / 他12）
        design-contract.md          デザイン契約ルール（Plugin rule-injector が DESIGN.md・design JSON 編集時に注入）
        code-quality.md           ★ コード品質ルール
        code-review.md              コードレビュールール（@code-reviewer 呼出前に自動適用）
        directory-structure.md      ディレクトリ構成ルール
        naming-conventions.md       命名規則ルール
      skills/                   プロジェクトスコープのスキル（.opencode/skills/に配置・gitで共有）
        release-prep/SKILL.md   ★ 本番リリース準備（SemVer・CHANGELOG自動生成を含む）
        live-operation/SKILL.md ★ 本番稼働中の変更・月次診断・スケーリング診断
        handoff/SKILL.md        ★ 引き継ぎ・長期停止・再開・初回リリース後フィードバック設定・EOL
      plugins/
        README.md                                                  Pluginsの説明・一覧・セットアップ手順
        secrets-guard.ts                                          tool.execute.before：機密ファイル・パターン保護（P1-1：SSoT 化）
        tasks-guard.ts                                         tool.execute.before：tasks.json passes 保護
        evaluator-tools.ts                                        tool（カスタムツール）：evaluator-passed / evaluator-failed ツール定義
        lint-and-typecheck.ts                                     tool.execute.after：lint・format・typecheck（P1-2：性能改善）
        doc-links.ts                                              tool.execute.after：ドキュメントリンク整合性（P1-3：AI 通知パターン）
        arch-diag.ts                                              tool.execute.after：アーキテクチャ変更検知（P1-3：AI 通知パターン）
        skill-tracker.ts                                          tool.execute.after（Skill）：使用履歴記録
        handoff.ts                                                session.deleted：引き継ぎファイル生成
        harness-health.ts                                         tool.execute.after/session.idle：Context Anxiety 検知（P0-3 per-session sliding window + TTL）
        task-archive.ts                                           session.idle：作業ディレクトリの自動アーカイブ提案
        working-dir-guide.ts                                      tool.execute.before：docs/working/ ファイル操作時のルール注入
        rule-injector.ts                                           tool.execute.before：ファイル種別・内容に応じてルールファイル参照を注入（AGENTS.md 肥大化防止）
        destructive-op-guard.ts                                   tool.execute.before：破壊的Git操作（reset --hard / rebase / push --force / rm -rf 等）のブロック
        commit-review.ts                                           tool.execute.before：git commit 検出 → @code-reviewer + @security-auditor 並列実行 → 問題ありならブロック
        compaction-context.ts                                     experimental.session.compacting：コンパクション時に作業ディレクトリの状態を維持
      config/                       SSoT ファイル群
        secret-patterns.json                                     機密パターン定義（P1-1：secrets-guard と pre-commit の単一情報源）
        skills.lock.yaml                                         外部スキルのコミットハッシュ固定（P1-4：再現性保証）
      usage/                       スキル・ルールの使用履歴（git管理はsetup時の選択による）
        skill-usage.md              スキル使用履歴
        rule-hits.md                ルール参照履歴
      project-context.md.template
      coding-conventions.md.template
      package.json                                              Plugin 依存関係（@opencode-ai/plugin 型定義）
      standards/                  dev-standards 参照ドキュメント（setup-harness.sh が自動コピー）
        principles/               開発原則集（security-implementation / tdd-with-ai 等）
        architectures/            アーキテクチャパターン集
        tech-decision.md.template 技術選定記録テンプレート

# setup-harness.sh 実行時に .opencode/skills/ にダウンロードされるスキル（プロジェクトスコープ）
# ※ すべてのスキルはプロジェクトフォルダ内に配置される。gitに含まれる。
  find-skills  （vercel-labs/skills）  外部スキルの検索・インストール
  skill-creator（anthropics/skills）  スキルの新規作成・改善・eval・description最適化

# .opencode/usage/ のgitignoreはsetup-harness.sh実行時にユーザーが選択する
# 個人開発→gitignore推奨、チーム開発→git管理推奨（詳細はsetup時の案内を参照）
```

---

## 新プロジェクト開始時の手順

### Step 0：開発環境とdev-standards を準備する（初回のみ）

#### 動作環境について

`setup-harness.sh` は **bash（シェルスクリプト）** で動作します。
OS ごとの準備が異なります：

| OS | 準備が必要なもの | 確認方法 |
|----|-----------------|---------|
| **Mac** | 追加不要（bash・git は標準搭載） | ターミナルを開けばすぐ使える |
| **Linux** | 追加不要（bash・git は標準搭載） | ターミナルを開けばすぐ使える |
| **Windows** | **WSL2**（推奨）または **Git Bash** が必要 | 下記参照 |

**Windows の場合（WSL2 の準備）：**
```
1. スタートメニューを右クリック →「Windows PowerShell（管理者）」を開く
2. 以下を実行する：wsl --install
3. PC を再起動する
4. 「Ubuntu」アプリを起動してユーザー名・パスワードを設定する
5. 以降の操作はすべてこの Ubuntu ターミナル内で行う
```

> Git Bash（Git for Windows）でも動作しますが、WSL2 の方が安定しています。

#### dev-standards を PC に取得する

```bash
# GitHubからdev-standardsをダウンロードする（1回だけ実行）
# プロジェクトと同じ親ディレクトリにクローンすると便利（デフォルトパスが使える）
# 例：プロジェクトを ~/Documents/ に作るなら dev-standards も ~/Documents/ にクローンする
# 別の場所でも可：セットアップ時に DEV_STANDARDS_PATH で絶対パスを指定すれば問題ない
cd ~/Documents   # プロジェクトを置く場所と同じ親ディレクトリ（推奨）
git clone https://github.com/[あなたのユーザー名]/dev-standards.git
```

これで `~/Documents/dev-standards/` フォルダが作られる。以降は不要。

### Step 1：新プロジェクトのフォルダを作る

```bash
# dev-standards と同じ親ディレクトリにプロジェクトフォルダを作成する（推奨）
cd ~/Documents
mkdir my-new-project
cd my-new-project
```

**推奨配置（デフォルトパスが使えるため、同じ親ディレクトリが便利）：**
```
Documents/
  dev-standards/       ← 複数プロジェクトで共有する（ここには触らない）
  my-project-a/        ← 新しいプロジェクト
  my-project-b/
```

**dev-standardsとプロジェクトが別の場所にある場合**（例：dev-standardsは `~/Documents/`、プロジェクトは `~/repos/`）、`../dev-standards` というデフォルトパスが機能しないため絶対パスで指定する：

> **セットアップ後は dev-standards への依存はゼロになります。**
> セットアップ（`setup-harness.sh` の実行）時だけ dev-standards にアクセスできれば、
> その後はどこに置いてあっても問題ありません。
> 参照ファイルはすべて `.opencode/standards/` にコピーされています。

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

**再セットアップについて**：セットアップ済みのプロジェクトに再度スクリプトを実行しても安全です。
`AGENTS.md`・`ARCHITECTURE.md`・`DESIGN.md`・`.opencode/coding-conventions.md`・
`.opencode/agents/`・`.opencode/plugins/`・`.opencode/usage/` など、プロジェクト固有ファイルは
上書きされません（上書き保護）。
`.opencode/standards/`・`.opencode/skills/`・`.git/hooks/pre-commit` は
常に最新の dev-standards に更新されます。

以下のファイルも自動生成されます（上書き保護あり）：
- `.env.example`：環境変数のテンプレート（値は空・必ずコミットする）
- `.env`：空ファイルで作成（AIが自動展開レベルに従い初期値を記入）
- `.editorconfig`：エディタ間のコードスタイル統一設定
- TypeScript設定：`stack-setup.md` のインラインテンプレートから展開（TS プロジェクトで使用）

`.gitignore` について：スクリプトが自動で以下を設定します：
- `.gitignore` が存在しない場合は `.gitignore.template` を元に自動作成します
- `.opencode/handoff-artifact.md`（セッション固有）→ 自動で gitignore 追加
- `.opencode/standards/`（dev-standards のコピー）→ 自動で gitignore 追加
  （内部の相互参照パスもコピー時に自動修正されます）
- `.opencode/usage/`（スキル使用ログ）→ 個人開発 or チーム開発に応じて対話式で選択
- チームで `.opencode/standards/` を共有したい場合のみ `.gitignore` から手動で外してください

### Step 3：AIと対話しながら4つのファイルを作成する

**スクリプト実行直後は骨格だけが存在する状態。以下の順番でAIと対話しながら記入する。**

#### 3-1：`docs/project-definition.md` を記入する

```
セットアップスクリプトが雛形を自動作成している。
`snippets/agents/AGENTS.md` の Project Overview コメント内にある対話プロンプト、および
`.opencode/standards/principles/project-definition-guide.md` にあるテンプレートをAIに渡す。
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

#### 3-4：`.opencode/project-context.md` を記入する

```
AGENTS.md の記入が完了したら、続けて以下を伝える：
「.opencode/project-context.md の [] を AGENTS.md の内容をもとに記入してください」
このファイルはコンテキストウィンドウが長くなったときの
軽量な文脈補完として機能する。
```

この4ステップが完了して初めてハーネスとして機能し始める。

### Step 4：opencode.json の設定を確認する

`setup-harness.sh` の実行時に以下が自動で完了しています：

- `opencode.json`（プロジェクトルート）にテンプレート設定をコピー済み（`instructions: ["AGENTS.md"]` — ルールは Plugin がイベント駆動で注入）
- 品質診断戦略を選択して `ARCHITECTURE.md` に記録済み
- `docs/working/` に作業ディレクトリテンプレートをコピー済み（plan.md / notes.md / review-checklist.md）

**Active Plugins：**
`.opencode/plugins/` に13つの TS Plugin が配置されています。
設定変更や無効化については `.opencode/plugins/README.md` を参照してください。

設定を変更したい場合は `opencode.json` を直接編集してください。

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

**コミット保護について**：`setup-harness.sh` は `.git/hooks/pre-commit` を自動作成します。
これにより `.env` ファイルや機密情報パターンが含まれるコミットを、
AIと人間の両方に対してブロックします（`.git/` 内のため git 管理外ですが、
再セットアップのたびに再作成されます）。

### Step 5：AIとの最初のセッションを開始する

OpenCode をプロジェクトフォルダで起動するだけです。
AGENTS.md は OpenCode が自動で読み込み、Session Protocol に従って作業が始まります。

最初のメッセージ例：
```
docs/project-definition.md の対話プロンプトに従って、プロジェクト定義を一緒に記入してください。
```

---

### ハーネスの健全性を確認する（いつでも実行可能）

セットアップ後や、しばらく開発が止まっていた後など、ハーネスが正しく機能しているか確認したいときに使う。以下の指示をAIにそのまま渡す：

```
以下のファイルを確認して、ハーネスの健全性を報告してください：

1. .opencode/standards/principles/ と .opencode/standards/architectures/ が
   存在するか（セットアップ後に自動コピーされているはず）

2. .opencode/project-context.md の「現在のタスク」が最新の状態か
   （「取り組んでいる機能」が完了済みのままになっていないか）

3. .opencode/handoff-artifact.md が存在するか
    存在しない場合：handoff.ts Plugin（session.deleted）が正常に動作していない可能性がある
    → setup-harness.sh を再実行して Plugin を再配置してください

4. decisions/ に記録されている判断のうち、
   前提（使用技術・外部API・チーム構成）が変わっているものがないか

問題があれば修正方法を提案してください。
問題がなければ「ハーネス正常」と報告してください。
```

---

## 開発フローとファイルの対応

```
プロジェクト定義              → `.opencode/standards/principles/project-definition-guide.md` の対話プロンプトに従い docs/project-definition.md を作成
                               ★ セキュリティ要件・リスク評価セクションを必ず記入
                               ★ 商用の場合は .opencode/standards/principles/commercial-operations.md を参照
技術選定                      → snippets/tech-decision.md.template → decisions/
アーキテクチャ決定            → .opencode/standards/architectures/_how-to-choose.md で種別を選ぶ
                               → 該当の .opencode/standards/architectures/*.md を通読する
                               → ARCHITECTURE.md を記入する
                               ★ セキュリティ・コード品質・依存関係リスクセクションも記入
ハーネスセットアップ          → setup-harness.sh を実行
フルアプリ構築（スプリント）   → 1〜4文の仕様を `@planner` に渡す
                                   → spec.md（Sprint Contract 含む）+ tasks.json を生成
                                   → 作業ディレクトリ判断（詳細は harness-engineering.md）
                                → 各スプリント開始前：`@evaluator` に Sprint Contract レビューを依頼
                                  → 承認されたら実装。差し戻されたら spec.md を修正して再依頼
                               → 実装完了後：`@evaluator` に QA評価を依頼
                                   → PASS で tasks.json の passes が更新される
                                  → FAIL で修正しスプリントをやり直す
                               → subagents.md を参照

環境変数の管理               → `.env` に実際の値を記入（絶対にコミットしない）
                               → 新しい変数を追加したら `.env.example` にキー名も追記する
                               → `.env.example` は必ずコミットする
実装（TDD）                   → .opencode/standards/principles/tdd-with-ai.md
                               　Step 8 でAIが自動コミット（AGENTS.md の「コミット実行」設定に従う）
                               → 認証・機密データを扱う実装は
                                 .opencode/standards/principles/security-implementation.md を参照
                               .opencode/instructions/（同じ指摘を2回したら追加）
                               .opencode/skills/（3回以上繰り返したら追加）
コードレビュー                → @code-reviewer / .opencode/standards/principles/code-review.md
                               ★ @security-auditor（認証・機密データ実装後は必須）
本番リリース準備              → .opencode/skills/release-prep/ が自動参照される
                               （「本番に出したい」「リリースしたい」と伝えるだけ）
                               　SemVer・CHANGELOG の自動生成・ユーザーテスト・負荷テスト・
                               　OSS公開チェックリストも含む
                               .opencode/standards/principles/production-deployment.md
                               .opencode/standards/principles/production-readiness.md（9セクション確認）
初回リリース後                → .opencode/skills/handoff/ が「本番に出した」を検知して自動実行
                               　ユーザーフィードバック収集の設定を案内する
本番稼働中の変更              → .opencode/skills/live-operation/ が自動参照される
月次GC                        → 「月次診断して」と依頼するだけ
                               .opencode/skills/live-operation/ のMonthly Checklistが実行される
                               → @resilience-checker（★レジリエンス診断）
                               → @code-quality-auditor（★コード品質診断）
                               → @security-auditor（★セキュリティ監査・依存ライブラリスキャン）
                               → スケーリング診断（データ件数・クエリパフォーマンス・N+1検出）
                               → .opencode/usage/ を参照してGCを実施
サービス終了（EOL）           → 「サービスを終了したい」「閉鎖する」「アーカイブしたい」と伝えるだけ
                               .opencode/skills/handoff/ が自動参照され、
                               ユーザー告知・データ削除・インフラ解約・リポジトリアーカイブを案内する
```

---

## ハーネスの育て方

```
Day 1  ：setup-harness.sh → AIと対話しながら以下の4ファイルを記入する
           docs/project-definition.md（目的・要件・セキュリティ要件）
           ARCHITECTURE.md（技術スタック・層のルール・非機能要件）
           AGENTS.md（プロジェクト名・コマンド・現在のタスク）
           .opencode/project-context.md（AGENTS.mdと同内容で簡潔に）

各セッション：【開始時】OpenCode を起動すると AGENTS.md の Session Protocol が自動実行される。
           .opencode/handoff-artifact.md を読んで前のセッションの文脈を自動復元する。
           docs/tasks.json が存在する場合、未完了タスクを確認する。
           docs/working/ が存在する場合、各 plan.md を読んで未完了タスクの文脈を復元する。
           Smoke Test：Dev コマンドが定義されている場合サーバーを起動して基本動作を確認する（サーバーなしプロジェクトはテストコマンドで代替）。
           AIが Current Task と .opencode/project-context.md の「現在のタスク」を更新する。
             【終了時】handoff.ts Plugin（session.deleted）が handoff アーティファクトのテンプレートを自動生成する。
            「今日はここまで」と伝えると handoff スキルが詳細な引き継ぎ内容を記入する。

技術選定の都度：ライブラリ選定・認証方式・外部サービス契約などの判断が発生したとき、
           AIがReport Formatの「要記録判断」で通知する。
           人間が承認したら decisions/ にAIが記録する。

instructions/の育て方：同じ指摘をAIから2回受けたとき → 「これをinstructionsに追加して」と依頼する。
            AIがルールファイルを作成して .opencode/instructions/ に保存する。

skills/の育て方：同じ作業が3回以上発生したとき → AIが候補を報告する。
           人間が承認したら `/skill-creator` を起動してスキルを作成する。
            （skill-creator は setup-harness.sh 実行時に .opencode/skills/ にダウンロード済み）

本番リリース準備：「本番に出したい」とAIに伝えるだけ。
           .opencode/skills/release-prep/ が自動参照され、
           SemVer・CHANGELOG生成・ユーザーテスト・負荷テスト・OSS公開確認などを
           AIが順番に案内してくれる。
           デプロイ・ロールバック・障害対応の手順が決まったら
           AIと対話しながら docs/operations.md に記入する。

初回リリース後：「本番に出した」とAIに伝えると handoff スキルが自動実行される。
           ユーザーフィードバックの収集方法（GitHub Issues / フォーム等）を
           AIが案内してくれる。設定内容は ARCHITECTURE.md に記録される。

Month 1：「月次診断して」とAIに依頼する。
         .opencode/skills/live-operation/ のMonthly Checklistが実行される。
         @resilience-checker と @code-quality-auditor が呼び出され、診断結果を報告する。
         @security-auditor が呼び出され、依存ライブラリスキャンと
         セキュリティ監査の結果を報告する。
         スケーリング診断（データ件数・クエリパフォーマンス・N+1）も自動実行される。
以降   ：月次で診断・定期的に削除。問題にぶつかるたびにinstructions/skills/を追加。

サービス終了時：「サービスを終了したい」とAIに伝えるだけ。
           handoff スキルが自動参照され、ユーザー告知・データ保護・
           外部サービス解約・リポジトリアーカイブを案内してくれる。
```

詳細は `.opencode/standards/principles/harness-engineering.md` を参照。

---

## 更新ルール

- dev-standards の `principles/` を変更した場合は各プロジェクトの `.opencode/standards/` を再コピーする
  （`cp $DEV_STANDARDS_PATH/principles/*.md プロジェクト/.opencode/standards/principles/`）
- dev-standards の `architectures/` はプロジェクト経験に基づいて随時更新する
- `decisions/` は削除しない
- `snippets/` の設定ファイルは動作確認したものだけを入れる
- `decisions/skill-candidates.md` はスキル化候補を記録する（記録のタイミングは同ファイル参照）
