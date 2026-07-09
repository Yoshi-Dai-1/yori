# ハーネスエンジニアリング

## ハーネスとは

AIエージェントが暴走せずに正しい方向へ進み続けるための外部構造。
プロンプトエンジニアリングが「何を言うか」の設計なら、
ハーネス設計は「どう動かすか」の設計。

モデルを変えなくても、ハーネスを育てるだけで出力の質は変わる。

---

## エージェントの認識モデル

ハーネス設計のすべての判断は、この前提から出発する。

**エージェントの視点では、コンテキストウィンドウに届いていないものは存在しない。**

- Slackのスレッド・口頭合意・暗黙のコンベンションは、エージェントに存在しない
- 「常識」や「業界標準」も、ファイルに書かれていなければ存在しない
- 「先週決めたこと」も、ファイルに記録されていなければ存在しない

この認識モデルを設計の判断基準として使う：

| 確認する問い | Noのとき何が起きるか |
|------------|-------------------|
| このルールは `AGENTS.md` か `.opencode/instructions/` に書いてあるか | エージェントはルールがないものとして動く |
| この設計判断は `decisions/` に記録されているか | エージェントは再び同じ判断を一から行う（または誤る） |
| このアーキテクチャの「なぜ」は `ARCHITECTURE.md` に書いてあるか | エージェントは依存ルールを意図せず破る |
| このプロジェクト固有の制約は `docs/project-definition.md` にあるか | エージェントはWon'tの機能を実装してしまう |

「人間に伝わるドキュメントか」ではなく、
「エージェントのコンテキストウィンドウに届くか・届いたとき正しく動作するか」で判断する。

---

## ハーネスを構成するファイル

```
プロジェクトルート/
  AGENTS.md              エントリポイント（60〜200行）常にロードされる
  ARCHITECTURE.md        設計の詳細（AGENTS.mdから参照）

  docs/（プロジェクト成果物・AIと人間が共有するドキュメント）
    project-definition.md  プロジェクトの目的・制約・Won't
    spec.md                仕様書・Sprint Contract（Plannerが生成）
    tasks.json          Task List・pass/fail追跡（Plannerが生成・Evaluatorが更新）
    build-log.md           セッション間の意思決定・試行錯誤の積み上げログ
    operations.md          本番運用手順書
    working/               タスクごとの揮発的な状態（計画・メモ・チェックリスト）
    archive/               完了したタスクのアーカイブ（task-archive.ts が自動提案・.gitignore 対象）

  .opencode/（ハーネスの詳細）
    instructions/        opencode.json instructions がセッション開始時にLLMに注入（判断基準）
    skills/              プロジェクトスコープのスキル（gitで共有）
                         descriptionで自動参照・/コマンドで明示呼び出しも可能
    agents/              サブエージェント定義（@名前で呼び出す）
    plugins/             TypeScript Plugin（イベント駆動の自動ガードレール）
    usage/               使用履歴（GCの判断基準）
    coding-conventions.md  プロジェクト固有のコーディング規約（AIが常に参照）
    project-context.md   プロジェクト文脈・現在のフェーズ（AIがセッション開始時に参照）
    handoff-artifact.md  Context Reset 時の引き継ぎ（スナップショット・毎回上書き）
    persona.md           エージェントの性格定義（任意）
    standards/           yori の参照ドキュメント（setup-harness.sh が自動コピー）
      principles/        開発原則集（tdd-with-ai / security-implementation 等）
      architectures/     アーキテクチャパターン集

# .opencode/skills/ にコピーされるスキル（プロジェクトスコープ・初回使用時に自動ダウンロード）
  find-skills（stub）   外部スキルの検索・インストール（vercel-labs/skills）
  skill-creator（stub） スキルの作成・改善・eval（anthropics/skills）
```

---

## AGENTS.md・instructions・skills・Pluginsの役割分担

| ファイル | 読み込まれるタイミング | 役割 |
|---------|---------------------|------|
| AGENTS.md | 常時（セッション開始時） | 常駐指示・禁止事項・参照先 |
| instructions/ | opencode.json instructions がセッション開始時に注入 | マークダウン判断基準の提供 |
| skills/ | descriptionで自動参照（発言検知）、または/コマンドで明示呼び出し | 手順書（定型作業の標準化）|
| agents/ | @エージェント名で呼び出したとき | 独立コンテキストの専門処理 |
| plugins/ | コードイベント発生時（ツール実行後等） | 強制的なガードレール・自動記録・プロアクティブなルール注入 |

---

## 単一エージェントが長時間タスクで崩れる3つの理由

**理由1：コンテキストウィンドウの肥大化**
長時間タスクでは会話が積み重なり、初期の指示を忘れる。
解決策：Context Reset（コンテキストリセット）＋handoff-artifact.md

**理由2：自己評価の甘さ（自己評価バイアス）**
自分が書いたコードを自分でレビューすると過大評価する。
解決策：独立コンテキストのサブエージェント（Evaluator等）

**理由3：Context Anxiety（コンテキスト不安）**
コンテキストウィンドウが埋まるにつれ、エージェントが無意識に作業を切り上げようとする。
未完成の機能を「完了」と報告する・中途半端な状態でコミットしようとする挙動として現れる。

⚠️ Context Anxiety は**AIが自己検知できるものではない**。
「コンテキストが苦しい」と自己申告するよう促しても信頼できない。
自己評価バイアスと同様に、同じモデルが自分の状態を正確に認識することは期待できない。
正しい対処は AIへの検知依頼ではなく、**ハーネス設計による構造的な予防**：
- Task List（`docs/tasks.json`）：pass/fail が外部に管理され、宣言的な「完了」が通らない
- Sprint Contract：完了基準をスプリント開始前に合意・外部化する
- Context Reset：コンテキストをクリアして新しいエージェントに引き継ぐ（clean slate）

---

## Planner・Generator・Evaluator の3段階構成

GANの Generator-Evaluator 構造に着想を得た現代的なハーネス設計。

**完了の定義**：フィーチャーは `@evaluator` が Sprint Contract に基づく QA 評価で
PASS と判定し、`docs/tasks.json` の `passes` フィールドを `true` に更新した
時点で「完了」とする。それ以外の方法で完了を宣言してはいけない。

```
Planner（サブエージェント）
  役割：1〜4文のプロンプトを詳細な仕様書（docs/spec.md）と
        Task List（docs/tasks.json）に変換する
  使うタイミング：中規模以上のタスク開始時
  書く場所：`.opencode/agents/planner.md`

Generator（メインエージェント・Build）
  役割：仕様書から実装する。各スプリント開始前に Evaluator へ
        Sprint Contract のレビューを依頼し、承認を得てから実装に入る
  使うタイミング：常時
   書く場所：AGENTS.md（＋instructions/ skills/ が自動補助）

Evaluator（サブエージェント）
  役割：① Sprint Contract のレビュー（スプリント開始前・合意）
        ② ビルド完了後の品質評価（playwright-cli で実機確認）
  使うタイミング：フルアプリ構築・主観的品質が重要なとき
  書く場所：`.opencode/agents/evaluator.md`
```

### Task List（docs/tasks.json）

Planner がスプリント計画と同時に生成する機能追跡ファイル。
各フィーチャーに `"passes": false` フィールドを持ち、Evaluator のみが `true` に更新する。
**Markdown ではなく JSON を使う理由**：エージェントが Markdown より JSON を
誤って上書き・編集する可能性が低いため、状態が安定して追跡できる。

#### フィーチャー形式

```json
{
  "id": "auth-refactor",
  "passes": false,
  "group": "auth-refactor"
}
```

| フィールド | 型 | 役割 |
|-----------|------|------|
| `id` | string | フィーチャーのユニーク識別子 |
| `passes` | boolean | Evaluator のみが更新する完了フラグ |
| `group` | string | `docs/working/<group>/` との対応（省略可） |

`group` フィールドは **作業ディレクトリ パターン** 使用時に必須。
`task-archive.ts` Plugin が `session.idle` 検知時にこのフィールドで
各作業ディレクトリの全タスクの `passes` が `true` かを確認し、
完了したタスクを自動アーカイブする。
`group` フィールドがないタスクはアーカイブ対象外（手動で対応する）。

#### passes フィールドの保護メカニズム

`passes` フィールドは tool.execute.before Plugin（`tasks-guard.ts`）によって
機械的に保護される。

- **ブロック対象**: 実装エージェントが誤って `passes: true` を設定する操作
- **許可条件**: `.opencode/.evaluator-updating` マーカーファイルが存在する場合のみ
- **評価エージェントの責務**: `PASS` 判定後、マーカー作成 → `passes` 更新 → マーカー削除の順に実行
- **詳細**: `.opencode/plugins/tasks-guard.ts` と
  `.opencode/agents/evaluator.md` の「PASS後の後処理」セクションを参照

### Sprint Contract（スプリント契約）

スプリント開始前に Generator と Evaluator が「完了の定義」を合意する仕組み。
Sprint Contract の枠組みは Planner が spec.md 生成時に作成する。
Generator は各スプリント開始前に @evaluator を呼び出してレビューを依頼し、
Evaluator が承認してから実装に入る。
「実装者の解釈」と「評価者の期待」のずれを事前に防ぐ。
詳細フォーマットは `.opencode/agents/planner.md` と `.opencode/agents/evaluator.md` を参照。

タスク規模別の推奨構成：

```
10分以内の単機能実装   → ハーネスなし（プロンプト直接）
30分〜1時間の中規模   → AGENTS.md + instructions/ + skills/ + code-reviewer
数時間のフルアプリ    → 上記 + Planner + Generator + Evaluator
                        （Sprint Contract → Build → QA サイクル）
```

---

## 6つの原則

**1. Progressive Disclosure（段階的開示）**
AGENTS.mdは60〜200行以内。詳細は instructions/・docs/ に分離して
必要なときだけ読み込まれるようにする。
全部を常に見せるのではなく、必要なときに必要なものだけ。

**2. 判断基準 > 手順書**
ルールは「何をするか（How）」ではなく「なぜそうするか（Why）」を書く。
Whyが書いてあれば、エージェントはHowを自分で導き出せる。
手順はすぐ陳腐化するが、判断基準は長持ちする。

ただし、**アーキテクチャ制約の強制だけは例外**。
依存ルールを AGENTS.md に「なぜ層をまたいではいけないか（Why）」として書くだけでは、
エージェントが無意識にルールを破る「AIスロップ」を防げない。
言語指示と機械的強制の3層を組み合わせる：

| レイヤー | 役割 | 実装場所 |
|---------|------|---------|
| Why（言語指示） | 「なぜこの依存ルールが存在するか」を記述 | AGENTS.md・ARCHITECTURE.md |
| 機械的強制 | アーキテクチャ違反をファイル書き込み時に検出 | 言語固有のリンター設定 |
| 即時フィードバック | lint をファイル編集後に自動実行してAIへ返す | `lint-and-typecheck.ts` Plugin |

リンターのエラーメッセージには「どの層に移動すれば正しいか」をインラインで記載する。
AIが修正方法を推測なしで実行できるようになる。

**リンターとフォーマッターの役割分担**：
リンターは「問題を報告する」、フォーマッターは「スタイルを自動修正する」と役割が異なる。
両方を `lint-and-typecheck.ts` Plugin に組み込み、ファイル編集のたびに自動実行する。

| 言語 | リンター（アーキテクチャ違反・バグ検出） | フォーマッター（スタイル統一） |
|------|----------------------------------------|-----------------------------|
| JavaScript / TypeScript | ESLint（`no-restricted-imports`・`eslint-plugin-boundaries`） | Prettier |
| Python | Ruff | Ruff |
| Rust | Clippy | rustfmt |
| Go | staticcheck / golangci-lint | gofmt（標準） |
| Ruby | RuboCop | RuboCop |

使用言語の設定例は `.opencode/standards/architectures/` の各アーキテクチャファイルを参照。

**3. 共進化**
ハーネスを書く過程で人間自身のドメイン理解が深まる。
エージェントに教えているつもりが人間が学んでいる。
ハーネスは人間とエージェントが互いに影響し合って進化する環境。

**4. Garbage Collection**
使われないルール・スキルは月1回見直す。
「先月このファイルを参照したか？」答えがNoなら削除候補。
92個作って74個に減らす作業が、足し算より価値がある。

GCのもう一つの契機：**モデルのアップグレード時**。
ハーネスの各要素は「モデルがまだできないこと」への補完として存在する。
モデルが進化すると、補完が不要になる要素が生まれる。
定期GCとは別に、新しいモデルに切り替えたタイミングでも見直しを行う。

| 確認する問い | 削除を検討する条件 |
|-------------|------------------|
| このスプリント分割は必要か | 新モデルで3回以上長時間タスク（3時間以上の実装）を試したとき、以下のすべてを満たしていれば不要: (1) Sprint Contractの差分が2回以下、(2) 不完全な完了宣言が0回、(3) Context Resetの必要性を人間が申告しなかった |
| このContext Resetは必要か | Context Anxietyの兆候（不完全な完了宣言等）が観察されなくなったなら不要 |
| このルールはAIが守れているか | 違反が長期間ゼロなら削除して様子を見る |
| このサブエージェントは必要か | メインが同等の精度で処理できるなら統合を検討 |

判断の基準は「最近これが実際に問題を防いだか」。
防いでいない補完はコンテキストの無駄遣いになっている可能性がある。

**5. 設計する人と消費する人を分ける**
全員がSkillを設計する必要はない。
設計する人と使う人の分業が自然に発生する。
非エンジニアも「使う」だけなら自走できる。

**6. CLI First（CLI優先）**
このハーネスでは AI エージェントが実装・テスト・データ確認・CI監視・Git操作などを
実行する設計のため、ツールの操作は CLI 経由を原則とする。
ブラウザ上の Dashboard 操作は CLI が未サポートの場合のみ提案する。
CLI の具体的なコマンドは `command -v` / `--help` / `webfetch` で
最新情報を確認してから実行する。

---

## ハーネスの育て方（時系列）

```
Day 1：AGENTS.mdに5行（プロジェクト概要・コマンド・禁止事項）
Week 1：同じ指摘を2回した → instructions/ に追加
Week 2：3回以上繰り返した作業 → skills/ に追加（/skill-creator で作成）
Month 1：使っていないものを削除（最初のGC）
以降：問題にぶつかるたびに追加・定期的に削除
```

**ハーネスは「完成」しない。プロジェクトが進化する限り進化し続ける。**

---

## Context Reset と handoff-artifact

### Context Reset vs Compaction

長時間タスクで使えるコンテキスト管理の方法は 2 種類ある。

| 方法 | 動作 | Context Anxiety への効果 |
|------|------|--------------------------|
| **Compaction** | 会話の前半を要約して同じエージェントが継続する | 解消されない（同じエージェントが継続するため） |
| **Context Reset** | コンテキストを完全にクリアし、新しいエージェントが handoff-artifact から引き継ぐ | clean slate になる |

Context Anxiety の兆候（不完全な状態で完了宣言が増える等）が見られるときは
Compaction ではなく Context Reset を選ぶ。

### Context Reset の手順

長時間タスクでコンテキストが肥大化したとき：

1. 現在のセッションを終了する前に「handoff-artifact.mdを生成して」と指示する
2. または `.opencode/plugins/handoff.ts` Plugin（自動有効化）で自動生成する
3. 新しいセッション開始時に handoff-artifact.md を渡す
4. 「このファイルを読んで、前の状態から続きを進めてください」と指示する

```markdown
# handoff-artifact.md の内容
- 取り組んでいた機能
- 完了した部分
- 途中で止まっている部分
- 次にやるべきこと
- このセッションで行った設計判断
- 未解決の問題
```

---

## 作業ディレクトリ（タスク間の状態分離）

### なぜ必要か

`docs/spec.md` / `docs/tasks.json` / `docs/build-log.md` はプロジェクト全体で
1つのファイルとして設計されている。単一タスクの進行には十分だが、複数タスクが
並行する局面では、各タスクの計画・メモ・状態を分離して管理する必要がある。
作業ディレクトリは**各タスクの揮発的な状態を分離する箱**として機能する。

### パターン

```
docs/
  spec.md                ← プロジェクト全体の仕様（共通）
  tasks.json          ← Task List（共通）
  build-log.md           ← 意思決定ログ（共通）
  working/               ← ★ タスクごとに分離した作業ディレクトリ
    auth-refactor/
      plan.md            ← タスクの詳細計画
      notes.md           ← 試行錯誤のメモ
      review-checklist.md ← 完了前チェック
    payment-integration/
      plan.md
      notes.md
      review-checklist.md
  archive/               ← 完了したタスクのアーカイブ（task-archive.ts が自動提案）
    old-feature/
      notes.md
      plan.md
      review-checklist.md
```

### 使い方

1. **タスク開始時**：`@planner` が `docs/working/<group>/` を作成し `plan.md` を書く
2. **タスク実装中**：メインエージェントは作業ディレクトリ内で計画・メモを管理
3. **タスク完了時**：`task-archive.ts` Plugin（`session.idle`）が `tasks.json` を確認する。
   同一 `group` フィールドを持つ全タスクの `passes` が `true`（= `@evaluator` が
   完了と判定）の場合、当該作業ディレクトリをアーカイブ対象として提案する
4. **アーカイブ時**：AI が `docs/working/<group>/` の内容を
   `docs/archive/<group>/` へ移動する

### handoff-artifact.md との違い

| 仕組み | スコープ | ライフサイクル | 目的 |
|--------|----------|----------------|------|
| `handoff-artifact.md` | **セッション** | `session.idle`（30分デバウンス）+ noReply で AI 生成（毎回上書き） | 前セッションの文脈を次セッションに渡す |
| `docs/working/<group>/` | **タスク** | タスク完了まで保持 | 複数タスクの状態を互いに干渉させない |

### 使い方を判断する基準

| タスク規模 | 作業ディレクトリ | 判定基準（数値で判断） |
|-----------|-----------------|----------------------|
| 単機能 | 使わない | タスク数1 |
| 中規模 | 任意 | タスク数2〜5 |
| 大規模 | 使う | タスク数6以上 |
| 既存 working ディレクトリが2以上 | **必須** | `docs/working/` 内ディレクトリ数が2以上 |

---

## yori とハーネスの関係

```
yori（このリポジトリ）
  = ハーネスの設計図・テンプレート集
  「このハーネス」とは yori の setup-harness.sh が
  各プロジェクトに配布するハーネス一式を指す。

各プロジェクトの .opencode/
  = 実際に機能するハーネス本体

yori をプロジェクトに「配置」しても機能しない。
setup-harness.sh でテンプレートをコピーして、
プロジェクト固有の情報を記入することで初めて機能する。
```

## AIへの活用

**ハーネス健全性の評価（定期実行）**：

   ```
   .opencode/standards/principles/harness-engineering.md と .opencode/standards/principles/subagents.md を読んで、
   現在の .opencode/ ディレクトリの構成を評価してください。
   以下を確認してください：
   1. AGENTS.mdが60〜200行以内か
   2. instructions/ に使われていないファイルがないか
   3. skills/ に使われていないスキルがないか
   4. usage/ の履歴から削除候補を特定する
   5. agents/ のサブエージェント定義が .opencode/standards/principles/subagents.md の設計基準に従っているか
   ```

ドキュメントリンクの自動検証・品質診断の自動化（Scheduled/Continuous）を
導入したい場合は `.opencode/plugins/README.md` を参照して、AIと相談しながら判断する。

**フルアプリ構築の開始**（1〜4文の仕様がある場合）：

```
@planner
[1〜4文でやりたいことを書く]
```

→ Planner が docs/spec.md（Sprint Contract 含む）と docs/tasks.json を生成する。
→ 生成後、Sprint 1 の Contract を @evaluator にレビューしてもらってから実装を開始する。

**Task List の現在の進捗を確認する**：

```
docs/tasks.json を読んで、未完了（passes: false）のタスクを一覧してください。
```
