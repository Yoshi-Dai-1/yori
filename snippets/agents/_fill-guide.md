# AGENTS.md 記入ガイド

このファイルは `AGENTS.md` テンプレートをプロジェクト固有の内容で埋めるためのガイド。
AIがこのファイルを読み、以下の対話プロンプトに従って人間と対話しながら記入する。

---

## プロンプト：AGENTS.md の記入を開始する

以下のプロンプトをAIに渡す：

> 「AGENTS.md の Project Overview と Commands を記入してください。
>  docs/project-definition.md と ARCHITECTURE.md を参照しながら、
>  以下を1つずつ質問して埋めてください：
>  1. プロジェクト名と目的（1〜2文）
>  2. 技術スタックとバージョン
>  3. 実行コマンド（install/dev/build/typecheck/lint/test）
>  4. 依存の方向（ARCHITECTURE.mdから転記）
>  5. 現在取り組んでいるタスク
>  6. 設定ファイルの自動展開レベル（以下の3択から選んでください）：
>     1. 自動展開：言語確定時に設定ファイルを確認なしで自動作成する（デフォルト・初心者〜標準）
>     2. 確認付き展開：すべての設定ファイル作成前に内容を説明し、承認を得てから作成する（上級者向け）
>     3. 展開なし：設定ファイルはすべて自分で管理する。AIは提案のみ行い作成はしない（上級者・独自構成あり）
>     選択後、.opencode/project-context.md の「未設定」を選択した値に書き換える。
>  質問は1つずつ。私が答えるまで次に進まないでください。」

## セクションごとの記入ガイド

### Project Overview
- プロジェクト名と目的を1〜2文で書く
- 主要な技術スタックとバージョンを含める

### Commands
- プロジェクトで実際に使うコマンドを完全な形で書く
- 言語・ツールに合わせて書き換える（ARCHITECTURE.md 記入後に stack-setup.md が補完する）

### Architecture
- 依存の方向は ARCHITECTURE.md から転記する
- UIなしプロジェクトは「UIデザインの入口」行を削除する

### Code Style
- 言語・フレームワークに合わせて書き換える
- 不要な行は削除する

### Boundaries（禁止事項）
- 省略しない。すべてのプロジェクトに共通する禁止事項

### Safety Rules
- そのまま維持する（全プロジェクト共通）

### コミット実行
- ARCHITECTURE.md の「開発プロセス」セクションの設定に従う
- 設定がない場合は「AI が提案・人間が実行」として動作する

### Security Boundaries
- `@security-auditor` がプロジェクト固有の制約を自動追記する

### TDD Cycle
- テストドリフト検知の詳細は `.opencode/instructions/tdd-cycle.md` を参照

### Subagents
- [プロジェクト名]・依存の方向・Taking on がプレースホルダーのままなら、ARCHITECTURE.mdの記入を先に促す

### Current Task
- 毎セッション開始時に更新する
- `.opencode/project-context.md` の「現在のタスク」も同じ内容に合わせて更新する

### Session Protocol
- そのまま維持する（全プロジェクト共通）

### Report Format
- そのまま維持する（全プロジェクト共通）

---

## プロジェクト途中でAGENTS.mdを書き換える場合

既存の AGENTS.md を修正したいときは、以下のようにAIに伝える：

> 「AGENTS.md を以下の観点で見直してください：
>  1. Project Overview が現在の状態と一致しているか
>  2. Commands が最新の開発コマンドと一致しているか
>  3. Architecture / 依存の方向が現在の設計と一致しているか
>  4. Current Task が現在の進捗を反映しているか
>  5. Boundaries / Safety Rules / Security Boundaries に追加すべき制約があるか
>  変更が必要な箇所を1つずつ提案し、承認を得てから修正してください。」
