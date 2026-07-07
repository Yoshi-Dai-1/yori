# Session Context

## Session 1: instructions SSoT Redesign

### 完了した変更
- `opencode/snippets/opencode.json.template`: `instructions` に `ARCHITECTURE.md` + `docs/project-definition.md` を追加（3ファイル構成）
- `opencode/snippets/agents/AGENTS.md`: Step 0 末尾を「新規セッションを促す」に変更、Step 1 を handoff のみに簡略化、line 66「読み」→「から」、header「> CLI First」削除、Step 0 に cli-first.md 参照追加
- `opencode/snippets/.opencode/instructions/_fill-guide.md`: Session Protocol 節に Step 0 削除ルールを追記
- `AGENTS.md`（yori ルート）: データフロー図を `instructions[]` 構成に更新、「構成」→「Directory Structure」に修正
- コミット: `33b0cf1`（SSoT redesign）, `7e9f0ec`（Read 冗長修正）, `2473f3b`（push 済み）

## Session 2: CLI First 常時注入化

### 完了した変更
- `opencode/snippets/.opencode/instructions/cli-first.md`: 新規作成（CLI First の単一 SSoT）
- `opencode/snippets/opencode.json.template`: `instructions` に `cli-first.md` を追加（4ファイル構成）
- `opencode/snippets/agents/AGENTS.md`: header から「> CLI First」を削除（冗長解消）、Step 0 に cli-first.md 参照を追記
- `opencode/snippets/.opencode/plugins/rule-injector.ts`: 不要になった cli-first ブロック（L158-173）と `cliFirstPrompted` プロパティを削除
- `AGENTS.md`（yori ルート）: データフロー図に cli-first.md を追加、後に対象外注釈を削除
- `opencode/snippets/.opencode/plugins/README.md`: 4ファイル構成に更新（L220, L266-268）
- `opencode/snippets/.opencode/instructions/cli-first.md`: 但し書き「未記載のサービス・ツールにも適用」を追記
- コミット: `49cc4ed`（push 済み）

### アーキテクチャ上の決定
- CLI First を AGENTS.md ヘッダの行動原則リストから削除し、専用の `instructions/cli-first.md` に分離
- rule-injector のイベント駆動型 cli-first 注入を廃止（常時注入に統一）
- `cli-first.md` は「判断基準 + 手順」の両方を記載（手順を含む例外ファイルとして位置づけ）

### 未解決の課題
- なし

### 次のセッションでやること
- 通常の開発作業（このプロジェクトのハーネス設計を進める、または他プロジェクトで動作確認）
