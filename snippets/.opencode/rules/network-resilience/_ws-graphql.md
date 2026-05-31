## WebSocket・GraphQL実装時の自律チェック

以下のいずれかの条件を満たすファイルを編集したとき、自律的に実行する：

**WebSocket実装を検出したとき（`WebSocket` / `socket.io` / `ws` / `useWebSocket` 等のキーワードがコードに含まれる場合）：**
- `.opencode/standards/principles/network-resilience.md` の「WebSocket・リアルタイム通信の設計原則」を参照する
- 再接続戦略・Heartbeat・メッセージ順序保証が実装されているか確認する
- 問題がある場合は人間に報告してから修正案を提示する

**GraphQL実装を検出したとき（`graphql` / `gql` / `useQuery` / `useMutation` 等のキーワードがコードに含まれる場合）：**
- `.opencode/standards/principles/network-resilience.md` の「GraphQL通信の設計原則」を参照する
- `.opencode/standards/principles/security-implementation.md` の「GraphQLセキュリティ」を参照する
- N+1問題・クエリ深さ制限・Introspection設定が適切か確認する
- 問題がある場合は人間に報告してから修正案を提示する
