## 自律トリガー（人間の指示を待たずに実行する）

### ARCHITECTURE.md が作成・更新されたとき

1. `.opencode/standards/principles/network-resilience.md` を読む
2. 「プロジェクト性質による採否の自律判断」の手順を実行する
3. 採否と根拠を ARCHITECTURE.md の「通信設計」セクションに記録する
4. 採用した対策の実装が必要な場合は、次のコードファイル作成時に
   network-resilience.md の実装手順に従うよう準備する
5. 判断結果のサマリーを人間に報告する

