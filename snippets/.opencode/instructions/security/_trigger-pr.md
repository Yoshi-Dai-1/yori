### PR が作成されたとき（`gh pr create` または `git push` が実行されたとき）

Bash ツールで `gh pr create` または `git push`（main/mainline 以外のブランチへの push）が実行されたとき：
1. PR 対象ブランチの diff に以下の判定キーワードが含まれるかチェックする：
   login, auth, signin, password, token, session, jwt, oauth,
   payment, billing, charge, stripe, card, checkout,
   api_key, secret, bearer, authorization, webhook,
   request.body, req.params, form, input, query,
   query, execute, sql, find, insert, update, delete
2. 判定キーワードが含まれる場合：
   → `@security-auditor` を呼び出し、diff 範囲のセキュリティレビューを依頼する
3. 除外条件:
   → docs/ または .md ファイルのみの変更、または判定キーワードが一切含まれない場合はスキップする
