# AGENTS.md 記入ガイド

このファイルは `AGENTS.md` テンプレートをプロジェクト固有の内容で埋めるためのガイド。
AIがこのファイルを読み、以下の記入手順に従って人間と対話しながら記入する。

---

## AGENTS.md の記入手順

以下の手順で、Project Overview / Commands / コミットメッセージ言語 / Subagents を決定して記入する。
`docs/project-definition.md` と `ARCHITECTURE.md` を参照しながら、以下を1つずつ人間に質問して埋めてください：

1. プロジェクト名と目的（1〜2文）
2. 技術スタックとバージョン
3. 実行コマンド（install/dev/build/typecheck/lint/test）
4. コミットメッセージ言語（以下の手順で提案してください）：
   - docs/project-definition.md と ARCHITECTURE.md から、コミットログを読む対象者（想定コントリビューター・OSS公開範囲）を確認する
   - GitHub 公開予定または国際チームの場合は subject=English を推奨する（理由を説明する）
   - チーム内のみの場合は subject=対話言語と同じを推奨する
   - body の言語は subject と同じを基本とし、subject と分ける選択肢も提示する
    - 人間が承認するまで次に進まない
5. 設定ファイルの自動展開レベル（以下の3択から選んでください）：
   1. 自動展開：言語確定時に設定ファイルを確認なしで自動作成する（デフォルト・初心者〜標準）
   2. 確認付き展開：すべての設定ファイル作成前に内容を説明し、承認を得てから作成する（上級者向け）
   3. 展開なし：設定ファイルはすべて自分で管理する。AIは提案のみ行い作成はしない（上級者・独自構成あり）
   選択後、.opencode/project-context.md の「未設定」を選択した値に書き換える。
   質問は1つずつ。人間が答えるまで次に進まないでください。

## セクションごとの記入ガイド

### Project Overview
- プロジェクト名と目的を1〜2文で書く
- 主要な技術スタックとバージョンを含める

### Commands
- プロジェクトで実際に使うコマンドを完全な形で書く
- 言語・ツールに合わせて書き換える（ARCHITECTURE.md 記入後に stack-setup.md が補完する）

### Boundaries（禁止事項）
- 省略しない。すべてのプロジェクトに共通する禁止事項

### Safety Rules
- そのまま維持する（全プロジェクト共通）

### コミット実行
- ARCHITECTURE.md の「開発プロセス」セクションの設定に従う
- 設定がない場合は「AI が提案・人間が実行」として動作する

### Security Boundaries
- `project-definition.md + security-requirements.md` から自動生成される

### TDD Cycle
- テストドリフト検知の詳細は `.opencode/instructions/tdd-cycle.md` を参照

### Subagents
- [プロジェクト名]・依存の方向・Taking on がプレースホルダーのままなら、ARCHITECTURE.mdの記入を先に促す

### Session Protocol
- そのまま維持する（全プロジェクト共通）

### 初期セットアップ
- 「## 初期セットアップ（初回セッションのみ）」セクションは初回完了後に全文削除する
- 削除指示はセクション自身のコメントにも書かれている

### Report Format
- そのまま維持する（全プロジェクト共通）

---

## プロジェクト途中でAGENTS.mdを書き換える場合

既存の AGENTS.md を修正したいときは、以下のようにAIに伝える：

> 「AGENTS.md を以下の観点で見直してください：
>  1. Project Overview が現在の状態と一致しているか
>  2. Commands が最新の開発コマンドと一致しているか
>  3. Boundaries / Safety Rules / Security Boundaries に追加すべき制約があるか
>  変更が必要な箇所を1つずつ提案し、承認を得てから修正してください。」
