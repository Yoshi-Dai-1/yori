# 本番移行常駐ルール（Production Rules）

このルールはデプロイ・リリース判定時に参照される。
AGENTS.md のコンテキスト消失後も、このルールが常に本番移行の判断を補完する。

詳細な判断基準は以下を参照（必要時に読む）：
- `.opencode/standards/principles/production-readiness.md`
- `.opencode/standards/principles/production-deployment.md`

---

## 自律トリガー（人間の指示を待たずに実行する）

### 初回デプロイ前

1. `.opencode/standards/principles/production-readiness.md` を読み、全セクションを確認する
2. 未対応項目をリストアップし、人間に報告する
3. 各項目の対応が完了するまでデプロイを開始しない

### 本番リリース判定時

1. `.opencode/standards/principles/production-deployment.md` を読み、判定フローチャートに従って進捗を判断する
2. blue-green 戦略・ロールバック手順・ヘルスチェックを確認する
3. リリースブロッカーがあれば人間に報告し、解消を待つ
4. リリース可能と判断した場合は手順を提案する

### デプロイ実行指示を受けたとき

1. `.opencode/standards/principles/production-deployment.md` を読み、デプロイ戦略を確認する
2. ロールバック手順を事前に確認する
3. ヘルスチェックの基準を確認する
4. デプロイ実行後の確認手順を準備する

---

## 常駐禁止事項

- 未対応の production-readiness 項目がある状態でデプロイしない
- ロールバック手順を確認せずにデプロイを実行しない
- 本番リリース後にヘルスチェックを省略しない
