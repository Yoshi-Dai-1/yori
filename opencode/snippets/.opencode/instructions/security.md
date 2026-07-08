# セキュリティルール（Security Rules）

このルールはコードファイル・project-definition.md 編集時に Plugin が注入する。

詳細な判断基準・チェックリスト・言語別ガイドは以下を参照（必要時に読む）：
- `.opencode/standards/principles/security-requirements.md`（対応レベル・法令判断・言語別詳細）
- `.opencode/agents/security-designer.md`（セキュリティ設計の詳細手順）
- `.opencode/agents/security-auditor.md`（セキュリティ監査の詳細手順）

---

## 自律トリガー（人間の指示を待たずに実行する）

各トリガーの詳細手順は対応するサブファイルを読んで実行する：

| トリガー | 参照先 |
|---------|--------|
| project-definition.md 作成・更新時 | `.opencode/instructions/security/_trigger-project-definition.md` |
| 最初のコードファイル作成時 | `.opencode/instructions/security/_trigger-first-code.md` |
| スプリント完了後（セキュリティ監査） | `.opencode/instructions/security/_trigger-sprint-audit.md` |
| PR作成時（gh pr create / git push） | `.opencode/instructions/security/_trigger-pr.md` |
| 新機能実装時（Won't違反チェック） | `.opencode/instructions/security/_trigger-wont.md` |
| package.json バージョン変更時 | `.opencode/instructions/security/_trigger-package-version.md` |

### コードファイルを編集するとき

| 編集内容 | 判定キーワード |
|---------|--------------|
| 認証・ログイン | login, auth, signin, password, token, session, jwt, oauth |
| 決済・課金 | payment, billing, charge, stripe, card, checkout |
| 個人情報 | user, email, address, phone, profile, personal |
| 外部API連携 | api_key, secret, bearer, authorization, webhook |
| 外部入力処理 | request.body, req.params, form, input, query |
| DB操作 | query, execute, sql, find, insert, update, delete |

実装完了後は `@security-auditor` を呼び出す。

---

## 常駐禁止事項（セッション中いつでも適用）

AGENTS.md の記憶が薄れても以下は常に有効：

- 機密情報（APIキー・パスワード・トークン）をコードにハードコードしない
- 機密情報をログに出力しない（デバッグログも含む）
- 変数名・ログ出力・コメントから機密情報の存在・構造を推測させない（`.opencode/standards/principles/naming-conventions.md` の「セキュア命名ルール」を参照）
- 外部入力をバックエンドでバリデーションせずに使用しない
- SQLクエリを文字列連結で組み立てない（パラメータバインディングを使う）
- エラーレスポンスにスタックトレース・内部パス・DB情報を含めない
- 環境変数を追加したとき `.env.example` へのキー名追記を忘れない
- 環境変数名は `UPPER_SNAKE_CASE` で、機密情報には `_KEY` / `_SECRET` / `_TOKEN` / `_CREDENTIAL` のいずれかを suffix に付ける（`.opencode/standards/principles/naming-conventions.md` の「環境変数名の規約」を参照）
- `.env.example` が変更されたとき:
  → 追加されたキーが `.env`（存在する場合）に反映されているかチェックする
  → 追加キーに `_KEY`, `_SECRET`, `_TOKEN`, `_CREDENTIAL` suffix が含まれる場合、CI/CD シークレットへの登録が必要であると警告する
  → 除外条件: `.env.example` の変更が空白・コメントのみの場合、またはキーの削除のみ（追加なし）の場合

---

## リスク深刻度と対処タイミング
→ `.opencode/instructions/security/_risk-severity.md` を読む

## Web検索の実行タイミングと情報源（言語別コマンド対応表を含む）
→ `.opencode/instructions/security/_web-search.md` を読む
