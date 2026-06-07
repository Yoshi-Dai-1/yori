### package.json のバージョンが変更されたとき（CHANGELOG未更新検知）

`package.json` が編集され、かつ `version` フィールドの値が前回の値から変更されたとき：
1. `CHANGELOG.md` の存在を確認する
2. 存在しない場合 → 作成を提案する
3. 存在する場合 → `## [Unreleased]` セクションに変更内容を追記するよう提案する
4. 除外条件:
   → `package.json` の変更が `version` フィールド以外のみ（依存関係の更新等）
   → ARCHITECTURE.md で「CHANGELOG: 管理しない」が明示されている場合
