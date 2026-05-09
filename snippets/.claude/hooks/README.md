# Hooks

AIエージェントの行動に「コードによるガードレール」を設ける仕組み。

AGENTS.mdへの言語指示と異なり、Hooksはエージェントの意思に関わらず自動実行される。
「AIが忘れることへの対策」として機能する。

---

## Claude Code Hooks と Git hooks の違い

```
Claude Code Hooks：Claude Codeのライフサイクルイベントに発火する
  設定場所：.claude/settings.json（プロジェクト）または ~/.claude/settings.json（グローバル）
  発火条件：Claude CodeがWrite・Edit・Bash等のツールを実行したとき
  対象：Claude Codeが行う操作のみ。人間が手動で実行した操作には発火しない。

Git hooks：gitコマンド実行時に発火する
  設定場所：.git/hooks/（gitignore対象・チームで共有されない）
  発火条件：git commit・git push等を実行したとき
  対象：Claude Codeと人間の両方のgit操作に発火する
```

このディレクトリのhookファイルはすべて **Claude Code Hooks** です。

---

## AGENTS.mdとHooksの違い

```
AGENTS.md：言語による指示（エージェントが従う前提）
           → エージェントが忘れる可能性がある

Hooks：コードによる強制実行
       → エージェントの意思に関わらず必ず動く
```

---

## ツール対応状況

| ツール | Hooks対応 |
|--------|----------|
| Claude Code | ✅ `.claude/settings.json` |
| Gemini CLI | ✅ Hooks機能あり |
| GitHub Copilot | ⚠️ 部分的 |
| Cursor | ❌ 未対応（2026年4月時点） |

**使用するツールのドキュメントで対応状況を確認してから実装する。**

---

## このディレクトリのファイル

ファイル名は `on-[イベント名].[目的].sh.example` の形式で統一している。
見た瞬間に「いつ発火するか」と「何をするか」が分かる。

```
hooks/
  README.md
  on-stop.generate-handoff.sh.example                       ← Stopイベント：handoff生成
  on-pre-tool-use.check-secrets.sh.example                  ← PreToolUseイベント：機密情報チェック
  on-post-tool-use.lint-and-typecheck.sh.example            ← PostToolUseイベント：lint・型チェック
  on-post-tool-use.record-skill-usage.sh.example            ← PostToolUseイベント：スキル使用履歴記録
  on-post-tool-use.architecture-skill-check.sh.example      ← PostToolUseイベント：外部スキル診断
  on-post-tool-use.check-doc-links.sh.example               ← PostToolUseイベント：ドキュメントリンク整合性チェック
```

`.example` 拡張子を外してプロジェクト固有の設定に書き換えて使う。

---

## 発火タイミング（Claude Codeの場合）

```
PreToolUse   → ツール実行前（ブロック可能）
PostToolUse  → ツール実行後（使用履歴記録・lint・型チェック）
Stop         → セッション終了（handoff生成）
Notification → 通知時
```

## matcherの書き方

```json
{ "matcher": "Write|Edit|MultiEdit" }   // ファイル編集ツール
{ "matcher": "Bash" }                   // Bashツール
{ "matcher": "Skill" }                  // スキル実行
```

matchers は大文字小文字を区別する。正確に記載すること。

## settings.json への登録方法

`.claude/settings.json` に以下の形式で記述する：

```json
{
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "Write|Edit|MultiEdit",
        "hooks": [{ "type": "command", "command": ".claude/hooks/on-post-tool-use.lint-and-typecheck.sh" }]
      },
      {
        "matcher": "Skill",
        "hooks": [{ "type": "command", "command": ".claude/hooks/on-post-tool-use.record-skill-usage.sh" }]
      },
      {
        "matcher": "Write|Edit|MultiEdit",
        "hooks": [{ "type": "command", "command": ".claude/hooks/on-post-tool-use.architecture-skill-check.sh" }]
      },
      {
        "matcher": "Write|Edit|MultiEdit",
        "hooks": [{ "type": "command", "command": ".claude/hooks/on-post-tool-use.check-doc-links.sh" }]
      }
    ],
    "PreToolUse": [
      {
        "matcher": "Bash",
        "hooks": [{ "type": "command", "command": ".claude/hooks/on-pre-tool-use.check-secrets.sh" }]
      }
    ],
    "Stop": [
      {
        "hooks": [{ "type": "command", "command": ".claude/hooks/on-stop.generate-handoff.sh" }]
      }
    ]
  }
}
```

---

## 品質診断の自動化（Scheduled / Continuous 戦略）

`live-operation` スキルの「品質診断の戦略選択」を参照して、
自プロジェクトの開発スタイルに合った方式を選ぶ。

### Scheduled 戦略（チーム開発・CI/CDあり）

CI パイプラインに週次・日次で品質診断を組み込む例（GitHub Actions）：

```yaml
# .github/workflows/weekly-quality-scan.yml
name: Weekly Quality Scan
on:
  schedule:
    - cron: '0 9 * * 1'  # 毎週月曜 09:00 UTC
  workflow_dispatch:       # 手動実行も可能

jobs:
  quality-scan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Run linter
        run: |
          # プロジェクトの lint コマンドを実行
          # AGENTS.md の Lint コマンドに合わせる
          npm run lint 2>&1 | tee lint-report.txt || true
      - name: Notify on failure
        if: failure()
        run: echo "品質問題を検出しました。月次診断を実行してください。"
```

### Continuous 戦略（バックグラウンドエージェント・並列開発）

PR 作成時に自動で品質チェックを実行する例：

```yaml
# .github/workflows/pr-quality-check.yml
name: PR Quality Check
on:
  pull_request:
    branches: [main, develop]

jobs:
  lint-and-check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Lint
        run: npm run lint
      - name: Type check
        run: npm run typecheck
      - name: Test
        run: npm test
```

**複数エージェント並列実行時の注意**：
`docs/features.json` の同時書き込み競合を避けるため、
各エージェントに担当 Sprint を明示的に割り当てる（Sprint 1 担当エージェントと
Sprint 2 担当エージェントは異なるファイルセットを操作するよう AGENTS.md に記述する）。

---

## ドキュメントリンク整合性チェック

`on-post-tool-use.check-doc-links.sh.example` は以下の問題を自動検出する：

- `AGENTS.md`・`ARCHITECTURE.md`・`decisions/*.md` 内のローカルファイル参照切れ
- 参照先ファイルが移動・削除された後に更新されていないリンク

**有効化するかどうかはAIと相談して決める**。月次GCでの手動確認で十分なケースが多い。
有効化が向いているプロジェクト：
- ドキュメントが頻繁に構造変更されるチーム開発
- decisions/ や architectures/ に多くの相互参照があるプロジェクト

有効化手順：
```bash
cp .claude/hooks/on-post-tool-use.check-doc-links.sh.example \
   .claude/hooks/on-post-tool-use.check-doc-links.sh
chmod +x .claude/hooks/on-post-tool-use.check-doc-links.sh
# settings.json の hooks に登録する（上記 settings.json 例を参照）
```
