# ハーネスファイル操作戦略

`setup-harness.sh` における全ファイル操作とその判断理由を記録する。
yori の修正・改善時に新規ファイルや既存ファイルの戦略を一貫して判断するためのリファレンス。

## 戦略一覧

| コード | 名称 | 動作 | 該当ケース |
|---|---|---|---|
| **C** | 常に上書き | 無条件でソースからコピー。ガードなし | プロジェクトが編集しない、yori の更新を届けたいファイル |
| **A** | 上書き保護 | ターゲットが存在しない場合のみコピー（`if [ ! -f ]` / `if [ ! -d ]`） | プロジェクトが編集する、絶対に消してはいけないファイル |
| **B** | マージ | 新規は作成、差分はログに記録、上書きしない | yori が更新するがプロジェクトの上書きも許容する知識ベース |
| **D** | 追記のみ | パターンが未記入の場合のみ追加（`grep -q`） | `.gitignore` エントリ |
| **E** | 部分上書き | 既存ファイルの特定フィールドだけ更新（`sed -i`） | 常に最新バージョンを記録すべきメタデータ |

---

## ルート配置ファイル

### `AGENTS.md`
- **戦略**: A
- **元**: `snippets/agents/AGENTS.md`
- **行**: 118-119
- **理由**: AI エージェントの中核設定。プロジェクト固有のエージェント振る舞い・セッションプロトコル・サブエージェント定義をユーザーが徹底的にカスタマイズする。再実行で上書きされては困る。

### `ARCHITECTURE.md`
- **戦略**: A（全体）+ E（品質診断戦略プレースホルダーのみ）
- **元**: `snippets/ARCHITECTURE.md.template`
- **行**: 134-135（コピー）, 479-482（sed-in-place）
- **理由**: アーキテクチャ定義。ユーザーが記入する。`[Reactive/Scheduled/Continuous]` のプレースホルダーのみセットアップ時に置換され、それ以外は一切触らない。

### `opencode.json`
- **戦略**: A
- **元**: `snippets/opencode.json.template`
- **行**: 422-428
- **理由**: OpenCode 設定ファイル。ユーザーが instructions 参照やプラグイン登録などをカスタマイズする。

### `.env.example`
- **戦略**: A
- **元**: `snippets/.env.example`
- **行**: 534-538
- **理由**: 環境変数テンプレート。ユーザーがプロジェクト固有のキーを追加する。

### `.editorconfig`
- **戦略**: A
- **元**: `snippets/.editorconfig`
- **行**: 556-559
- **理由**: エディタ設定。ユーザーがインデントや文字コードをカスタマイズする可能性がある。

### `.gitignore`
- **戦略**: A（テンプレート本体）+ D（エントリ追記）
- **元**: `snippets/.gitignore.template`
- **行**: 716-718（コピー）, 724-783（追記）
- **理由**: ベースファイルは保護。ハーネス関連エントリ（handoff-artifact, standards, .env 等）は未記入の場合のみ追記。

### `.env`
- **戦略**: A
- **作成**: `touch .env`
- **行**: 549
- **理由**: 機密情報を含む。存在しない場合のみ作成、絶対に上書きしない。

---

## `DESIGN.md` / `design/`（UIありプロジェクトのみ）

### `DESIGN.md`
- **戦略**: A
- **元**: `snippets/DESIGN.md.template`
- **行**: 141-155
- **理由**: デザイン定義。ユーザーがコンポーネント仕様やブランドトークンを記入する。

### `design/INTAKE.md`
- **戦略**: A
- **元**: `snippets/design/INTAKE.md.template`
- **行**: 157-162
- **理由**: デザイン受付票。機能ごとにユーザーが記入する。

### `design/token-ssot.json.template`, `design/component-map.json.template`
- **戦略**: A
- **元**: `snippets/design/*.json.template`
- **行**: 163-174
- **理由**: デザイントークンの SSoT。ユーザーが実際のデザイン値で埋める。

---

## `decisions/`

### ~~`decisions/skill-candidates.md`~~ → `.opencode/usage/skill-candidates.md`
- **戦略**: A
- **元**: `snippets/.opencode/usage/skill-candidates.md`
- **行**: 75-78（旧：削除済み）, 492-498（新：usage ループに統合）
- **理由**: スキル化候補の累積ログ。`skill-usage.md` と同じ `usage/` に移動し、決定的ADRと分離した。

---

## `.opencode/` コアファイル

### `.opencode/coding-conventions.md`
- **戦略**: A
- **元**: `snippets/.opencode/coding-conventions.md.template`
- **行**: 180-183
- **理由**: プロジェクト固有のコーディング規約。プロジェクトごとに大きく編集される。

### `.opencode/project-context.md`
- **戦略**: A
- **元**: `snippets/.opencode/project-context.md.template`
- **行**: 189-194
- **理由**: AI エージェント向けプロジェクトコンテキスト。プロジェクトの進行に伴い継続的に更新される。

### `.opencode/handoff-artifact.md`
- **戦略**: A
- **作成**: inline `cat >` heredoc
- **行**: 500-532
- **理由**: セッション単位の作業状態。タスク追跡や決定事項を含む。セッション間で維持される必要がある。

### `.opencode/package.json`
- **戦略**: C
- **元**: `snippets/.opencode/package.json`
- **行**: 414-416
- **理由**: Plugin 型定義の依存関係（`@opencode-ai/plugin`）。プロジェクトが編集することは稀であり、yori の更新を届けるべき。

### `.opencode/.setup-diff.log`
- **戦略**: C（毎回新規作成）
- **作成**: `echo ... >`
- **行**: 290, 728（gitignore 追記）
- **理由**: principles/architectures の差分を記録する診断ログ。毎回上書き。`.gitignore` に自動登録され、git 管理を汚さない。

---

## `.opencode/instructions/`（AI 振る舞いルール）

### 全ファイル（code-quality.md, code-review.md, design-contract.md, directory-structure.md, naming-conventions.md, network-resilience.md, security.md, stack-setup.md, tdd-cycle.md, `_shared/*.md`, `_template.md`, およびサブファイル群）
- **戦略**: C
- **元**: `snippets/.opencode/instructions/`（再帰的 `find`、`_fill-guide.md` は除外）
- **行**: 196-207
- **理由**: AI エージェントの思考と判断を制御するルール定義。yori が提供する定義であり、プロジェクトが直接編集することは稀（カスタマイズは AGENTS.md や project-context.md で行う）。バグ修正や新ルールの追加を再実行で反映させる必要がある。

### `agents-fill-guide.md`
- **戦略**: C
- **元**: `snippets/.opencode/instructions/_fill-guide.md`
- **行**: 127-131（別コピー処理）
- **理由**: AGENTS.md 記入ガイド。`_fill-guide.md` から `agents-fill-guide.md` にリネームして配置。AI が参照するため `.opencode/instructions/` に置く（エージェント定義ではない）。yori 開発者のみが更新する。

---

## `.opencode/agents/`（サブエージェント定義）

### サブエージェント: planner.md, evaluator.md, code-reviewer.md, security-designer.md, security-auditor.md, test-generator.md, codebase-investigator.md, resilience-checker.md, code-quality-auditor.md
- **戦略**: C
- **元**: `snippets/agents/subagents/*.md`
- **行**: 229-233
- **理由**: AI エージェント種別定義（OpenCode Markdown agent 仕様）。ツールアクセス・プロンプト・振る舞いを定義する。プロジェクトが編集することは稀。yori の改善を反映させる。

### 共有ファイル: `_shared/*.md`
- **戦略**: C
- **元**: `snippets/agents/_shared/*.md`
- **行**: 237-244
- **理由**: エージェント間共有テンプレート。`mode: subagent + hidden: true` frontmatter により Tab 対象から除外。同上。

---

## `.opencode/skills/`（AI スキル）

### 機能スキル: handoff/, live-operation/, playwright-setup/, release-prep/
- **戦略**: C
- **元**: `snippets/.opencode/skills/*/`（`cp -r`）
- **行**: 210-226
- **理由**: 実際に開発で使用するスキル。バグ修正や改善をプロジェクトに届ける。ユーザーが別名で作成したカスタムスキルはループの走査対象外のため触らない。

### スタブスキル: find-skills/, skill-creator/
- **戦略**: A
- **元**: `snippets/.opencode/skills/*/`（`cp -r`、ガード付き）
- **行**: 216-221（case 節でガード）
- **理由**: 外部インストール用のプレースホルダ。ユーザーが `npx skills add` で実体をインストールした後、再実行でスタブが上書きするのを防ぐ。

---

## `.opencode/plugins/`（TypeScript プラグイン）

### 全プラグイン `.ts` ファイル + `README.md`
- **戦略**: C
- **元**: `snippets/.opencode/plugins/*.ts` + `README.md`
- **行**: 356-362
- **理由**: 実行可能コード。ガードレールと自動化を提供する。バグ修正と機能追加が最も頻繁に発生するカテゴリ。ユーザーは別ファイル名でカスタムプラグインを作成でき、それらはループの走査対象外。yori 提供ファイルのみが上書きされる。

---

## `.opencode/config/`（SSoT ファイル）

### secret-patterns.json, skills.lock.yaml
- **戦略**: A（ファイル全体）+ E（yori_version フィールドのみ）
- **元**: `snippets/.opencode/config/*.json`, *.yaml, *.yml
- **行**: 367-385（コピー）, 395-410（yori_version の sed-in-place）
- **理由**: 単一真実源（SSoT）設定。ユーザーがカスタム secret パターンや外部スキル登録を追加する。ファイル全体は保護し、`yori_version` のみ常に最新に更新する。

---

## `.opencode/standards/principles/`（知識ベース）

### 23 の原則ファイル
- **戦略**: B
- **元**: `$YORI_SRC/principles/*.md`
- **行**: 248-296
- **理由**: AI 推論のための原則ドキュメント。yori の知識ベース。新規ファイルは自動追加。既存ファイルに差分がある場合は `.opencode/.setup-diff.log` に記録し、上書きはしない（ユーザーが `.local/` で上書きしている可能性があるため）。

---

## `.opencode/standards/architectures/`（アーキテクチャパターン）

### 13 のアーキテクチャパターンファイル
- **戦略**: B
- **元**: `$YORI_SRC/architectures/*.md`
- **行**: 298-326
- **理由**: principles と同じく B。アーキテクチャパターンも知識ベース文書。

---

## `decisions/000-template.md`
- **戦略**: C
- **元**: `$YORI_SRC/snippets/docs/adr-template.md`
- **行**: 114
- **理由**: ADR/技術選定兼用テンプレート。常に最新版を反映。同名ファイルのみ上書きのため、ユーザー作成のADRに影響しない。

---

## `.opencode/standards/principles/.local/README.md`, `.opencode/standards/architectures/.local/README.md`
- **戦略**: A
- **作成**: inline `cat >` heredoc
- **行**: 257-282
- **理由**: `.local/` 上書き機構の説明。初回のみ作成され、再実行では維持される。

---

## `.opencode/usage/`（使用履歴）

### skill-usage.md, skill-candidates.md, rule-hits.md
- **戦略**: A
- **元**: `snippets/.opencode/usage/*`
- **行**: 492-498
- **理由**: 蓄積される使用履歴。プラグイン（skill-tracker, compaction）や live-operation スキルが読み書きする。絶対にリセットしてはいけない。

---

## `docs/` — 生きた文書

### `docs/project-definition.md`
- **戦略**: A
- **作成**: inline `cat >` heredoc
- **行**: 564-622
- **理由**: プロジェクトスコープ・要件・リスク。AI と人間の対話を通じて継続的に洗練される。

### `docs/operations.md`
- **戦略**: A
- **作成**: inline `cat >` heredoc
- **行**: 624-631
- **理由**: デプロイ手順・インシデント対応。本番移行時に記入される。

### `docs/quality-scorecard.md`
- **戦略**: A
- **元**: `snippets/docs/quality-scorecard.md.template`
- **行**: 675-678
- **理由**: 品質メトリクス履歴。`@code-quality-auditor` が月次診断で追記する。

### `docs/build-log.md`
- **戦略**: A
- **元**: `snippets/docs/build-log.md.template`
- **行**: 690-694
- **理由**: ビルド・セッション履歴。handoff スキルと evaluator が追記する。

---

## `docs/` — 参照用テンプレート

### `docs/spec-structure.md`, `docs/sprint-contract-template.md`, `docs/tasks-json-template.json`
- **戦略**: C
- **元**: `snippets/docs/*`
- **行**: 696-704
- **理由**: ユーザーがコピーして使う参照文書（直接編集しない）。yori の更新を反映させる。

---

## `docs/working/`（作業ドキュメント）

### plan.md, notes.md, review-checklist.md
- **戦略**: C
- **元**: `snippets/docs/working/*.template`
- **行**: 705-714
- **理由**: 作業ドキュメントのひな形。プロジェクトはこれらを起点に別ファイルで作業するか、あるいはテンプレートとして使う。yori の改善を反映させる。

---

## `.git/hooks/pre-commit`
- **戦略**: C
- **作成**: inline `cat >` heredoc（`secret-patterns.json` から動的生成）
- **行**: 789-816
- **理由**: `.git/` 内のセキュリティフック（git 管理対象外）。常に最新の secret パターンを反映するために毎回再生成。

---

## `.gitignore` 追記エントリ

### handoff-artifact.md, .handoff-trigger, .setup-diff.log, standards/, .env, .env.local, .env.*.local, usage/
- **戦略**: D
- **行**: 724-783
- **理由**: 各エントリは `grep -q` でガード — 未記入の場合のみ追記。`usage/` のみユーザーに gitignore するか選択させる。

---

## skills.lock.yaml の yori_version フィールド
- **戦略**: E
- **行**: 395-410
- **理由**: ファイル全体は A（保護）。`yori_version:` 行のみ毎回 `sed -i` で更新。インストール方法によらず記録バージョンと実バージョンが一致することを保証する。

---

## 設計原則

1. **ファイルの所有者が戦略を決める**: プロジェクト所有 → A。yori 提供 → C。yori 提供だがプロジェクトが上書き可能 → B。
2. **ユーザーの編集を静かに破壊しない**: ユーザーがカスタマイズした内容は、明示的な操作（rm + 再実行）なしには上書きされない。
3. **バグ修正はプロジェクトに届く**: 最も頻繁に更新されるファイル（plugins, instructions, agents）は C とし、yori リポジトリでの修正がテストプロジェクトに伝播する。
4. **カスタムファイルには決して触れない**: ループは yori のソースディレクトリのみ走査する。同名でないユーザーファイルはコピー処理から不可視。
5. **ユーザー向けメッセージは日英バイリンガル**: インタラクティブプロンプトは `日本語 / English` 形式。ログヘッダは英語（ツール生成コンテンツは言語中立）。
