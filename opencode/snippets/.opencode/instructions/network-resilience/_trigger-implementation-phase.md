
### ARCHITECTURE.md の「通信設計」セクションが未記入のまま実装フェーズに入ったとき

実装フェーズへの移行は最初のツール実行（write/edit/multiedit）をプロキシとして検出する。

```
チェック1：ARCHITECTURE.md に「通信設計」セクションが存在するか
  → 存在しない場合：実装を止め、以下を人間に通知する：
    「通信設計が ARCHITECTURE.md に記録されていません。
     `.opencode/standards/principles/network-resilience.md` の判断手順で採否を決定してから実装します。」

チェック2：「通信設計」セクションが記入済みか（テンプレートのままでないか）
  → テンプレートのままの場合：チェック1と同じ対応をする
```

