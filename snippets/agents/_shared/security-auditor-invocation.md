# security-auditor 監査モード呼び出し形式

**目的**: 依存ライブラリスキャン結果を security-auditor（監査モード）に渡すためのデータ契約。

**参照元**:
- `.opencode/agents/subagents/security-auditor.md`（受信側）
- `.opencode/rules/security/_web-search.md`（送信側）
- `.opencode/skills/live-operation/SKILL.md`（送信側）

## 呼び出しテンプレート

````
@security-auditor（監査モード）

以下の依存ライブラリスキャン結果を分析し、CRITICAL/HIGHの脆弱性について対策を提案してください：

```
[スキャンコマンドの出力をそのまま貼り付ける]
```
````

## ルール

- 呼び出しメッセージは必ず上記テンプレートの形式に従う
- `[スキャンコマンドの出力]` の部分は実際のコマンド出力で置換する
- 結果が渡されなかった場合（コードレビュー目的の呼び出しなど）、subagent は依存ライブラリ分析をスキップする
