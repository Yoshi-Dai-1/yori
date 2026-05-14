---
name: handoff
description: |
  This skill should be used when handing off work between sessions, pausing
  development long-term, or resuming after a break. Use this skill whenever
  the user says: 「本番に出した」「リリースできた」「公開できた」
  「長期間開発を止める」「別の人に引き継ぐ」「しばらく触らない」
  「今日はここまで」「終わりにする」「セッションを終了する」「一旦ここで止める」
  「再開したい」「続きをやりたい」「前回の続きから」
  Make sure to use this skill even when the user does not say "handoff"
  explicitly — any context reset, development pause, session end, or session resumption
  qualifies. Do NOT use for release preparation (use release-prep instead).
version: 1.0.0
status: active
---

## When to Use

このスキルを使うべきタイミング：
- セッションをまたいで作業を引き継ぐとき
- 長期停止・別の人への引き継ぎ前
- 「再開したい」「前回の続きから」など、前セッションの文脈を復元するとき
- 本番リリース後（状態の記録として）

このスキルを使わないタイミング：
- 本番リリースの準備中（→ release-prep を使う）
- 単純な質問・調査タスク（状態保存が不要なとき）

## Workflow

1. **現在の状態を保存する**
   `.claude/handoff-artifact.md` を以下のフォーマットで write_file で保存する
   （既存の内容は上書きしてよい。毎回最新のスナップショットを保存する）：

   ```markdown
   # Handoff Artifact
   # 更新日時: YYYY-MM-DD HH:MM

   ## 前のセッションの状態

   取り組んでいた機能: [具体的な内容]
   完了した部分: [具体的な内容]
   途中で止まっている部分: [具体的な内容・なければ「なし」]
   次にやるべきこと: [具体的な1タスク]

   ## 重要な決定事項

   [このセッションで行った設計判断。なければ「なし」]

   ## 未解決の問題

   [バグ・疑問点・要確認事項。なければ「なし」]

   ## Security Status

   対応レベル: [Lv.1 / Lv.2 / Lv.3 / Lv.4]（security-requirements.md の判断基準）

   適用される規制・標準:
   - [個人情報保護法 / GDPR / PCI DSS / HIPAA / ISMAP / なし]

   未対応のセキュリティ要件:
   - [ ] [要件名]：[理由・対応方法・担当スプリント]
   （なければ「なし」）

   完了したセキュリティ実装:
   - [x] [実装内容]：decisions/[連番]-[slug].md に記録済み
   （なければ「なし」）

   依存ライブラリの脆弱性状態:
   - 最終スキャン：[YYYY-MM-DD] / 結果：[クリーン / HIGH N件 / CRITICAL N件]
   - 自動監視：[Dependabot設定済み / CI組み込み済み / 未設定]

   <!-- HANDOFF_FILLED -->
   ```

   末尾の `<!-- HANDOFF_FILLED -->` は必ず含める（on-stop Hook が記入済みを認識するマーカー）。

2. **Build Log の最終行を更新する**
   `docs/build-log.md` を read_file で読み込む。
   最終行が `| YYYY-MM-DD | （更新待ち） | - |` の形式の場合、
   その行を実際の内容で置換して write_file で保存する：
   ```
   | YYYY-MM-DD | [完了した内容の概要] | [未解決があれば記載。なければ「なし」] |
   ```
   最終行が「（更新待ち）」でない場合（handoff SKILL が2回呼ばれた等）は新しい行を追記する。
   `docs/build-log.md` が存在しない場合は作成してから内容行を追記する。
   このログはセッション間の意思決定の経緯・試行錯誤の積み上げ履歴。
   `handoff-artifact.md`（スナップショット：毎回上書き）とは役割が異なる。

3. **Current Taskを更新する**
   次のセッションで最初に取り組むタスクを AGENTS.md の Current Task（Next 欄）に記録する。

4. **Security Status を確認・引き継ぐ（自律実行）**
   handoff-artifact.md の `## Security Status` を読み、以下を自律的に実行する：
   - 未対応のセキュリティ要件がある場合 → セッション開始直後に人間に報告する
   - 依存ライブラリの最終スキャンが7日以上前の場合 → `npm audit` / `pip-audit` を実行して結果を報告する
   - 自動監視が「未設定」の場合 → Dependabot / CI組み込みの設定を提案する
   人間からの指示を待たずに実行する。

## Output Format（会話への出力）

Workflow 完了後、以下の形式で会話に出力する：

```
## 引き継ぎレポート [YYYY-MM-DD]

### 保存した状態
Taking on: [内容]
Done: [内容]
Next: [内容]

### 未解決の問題
[あれば記載。なければ「なし」]

### 次のセッションで最初にやること
[具体的な1つのタスク]
```
