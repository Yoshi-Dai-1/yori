# Monthly Diagnosis 手順詳細

このファイルは `live-operation` スキルの `## Monthly Checklist` セクションで参照される。
内容は `.opencode/skills/live-operation/SKILL.md` から切り出したもので、**SKILL.md 側から参照されたときに読む**。

---

## Monthly Checklist 詳細手順

以下のサブエージェントと手順を順番に実行する：
```
@resilience-checker
@code-quality-auditor
```

`@code-quality-auditor` 完了後、診断結果を `docs/quality-scorecard.md` に記録する：
1. `docs/quality-scorecard.md` を read_file で読み込む
2. 「品質スコア履歴」テーブルの当月列を追加・更新する（既存の列定義・テーブル書式は変更しない）
3. 「月次診断サマリー」セクションに当月ブロックを先頭に追加する（他のセクションは編集しない）
4. write_file で保存する
（ファイルが存在しない場合は、`docs/quality-scorecard.md` を新規作成する）

依存ライブラリの脆弱性スキャンを実行する（言語別コマンドは `.opencode/instructions/security/_web-search.md` の対応表に従う）

スキャン結果を `.opencode/agents/_shared/security-auditor-invocation.md` の形式で @security-auditor に渡す：

```
@security-auditor
```

`@security-auditor` 完了後、結果とスキャン結果を以下の両方に記録する：

1. `.opencode/handoff-artifact.md` の `## Security Status`（スナップショット：毎回上書き）
   - 検出された問題は深刻度（CRITICAL/HIGH/MEDIUM/LOW）とともに「未対応のセキュリティ要件」に追記する
   - 依存ライブラリの脆弱性スキャン結果を「依存ライブラリの脆弱性状態」に更新する
   - 問題がなければ「最終スキャン：[日付] / 結果：クリーン」に更新する

2. `docs/security-audit-log.md`（累積ログ：追記のみ）
   - `docs/security-audit-log.md` を read_file で読み込む
   - 「監査履歴」テーブルに新しい行を追加する（既存の列定義・テーブル書式は変更しない）
   - 「月次監査サマリー」セクションに当月ブロックを先頭に追加する（他のセクションは編集しない）
   - write_file で保存する
   （ファイルが存在しない場合は、`docs/security-audit-log.md` を新規作成する）

商用プロジェクトの場合は追加で：
`.opencode/standards/principles/commercial-operations.md` の月次確認項目を実施する。

メインエージェントが直接実行する（毎月）：
```
decisions/ の各ファイルを読んで以下を確認する：
1. 判断の前提（使用技術・外部API・チーム構成）が変わっているものがないか
2. 「要確認」「未定」のまま放置されているものがないか
3. 1年以上前のADRで現在の実装と矛盾しているものがないか
4. ADR間の矛盾：同じテーマで相反する決定をするADRがあり、古いADRの状態が「置き換え済み」に更新されていないものがないか
問題があれば、人間に提案の上 decisions/[連番]-review-YYYY-MM.md として記録する（記録には人間の承認が必要）。
「置き換え済み」への更新が必要な場合も、人間に提案し承認を得てから行う（自律的な書き換えは行わない）。

確認後、.opencode/adr-index.md のテンプレート形式に従って、各 ADR から
{番号, タイトル, タグ, 要約（1-2文で重要判断のみ）} を抽出してテーブルを書き換える（write_file、上書き）。
テーブルの列定義や他のセクションは変更しない。
```

## Scaling Diagnosis（スケーリング診断）

ARCHITECTURE.md の非機能要件セクションを read_file で読んで以下の条件を順番に確認する：

条件A：「スケーリング方針：スケーリング不要（個人利用・社内限定）」と記載されている
→ 該当する：このセクションを完全にスキップする。条件Bは確認しない。

条件Aに該当しない場合のみ、条件Bを確認する：
条件B：「データ件数（1年後想定）」に数値（「不明」以外）が記録されている
→ 該当しない：スキップする
→ 該当する：以下を実施する

```
1. データ件数の確認
   以下の手順でデータ件数を取得する（ARCHITECTURE.mdにテーブル名の記録はないため
   コードベースから自律的に特定する）：
   Step 1：マイグレーションファイルまたはスキーマ定義ファイルを検索して主要テーブルを特定する
           （例：schema.prisma / migrations/ / models.py / schema.rb 等）
   Step 2：特定したテーブルに対して件数クエリを実行する
           `SELECT COUNT(*) FROM [特定したテーブル名];`
   Step 3：取得した件数を ARCHITECTURE.md の「データ件数（1年後想定）」の値と比較する

2. クエリパフォーマンス診断
   主要テーブルへの頻繁なクエリにインデックスが設定されているか確認する。
   確認方法（ツールは変化するため毎月検索する）：
   `[ARCHITECTURE.md の「DB / ORM」値のDB部分] query performance analysis [現在年]`
   信頼できる情報源の判断基準：使用DBの公式組織が管理するドメイン。
   「[使用DB名] official documentation」で検索し公式ドメインを採用する
   （例：PostgreSQL は postgresql.org、MySQL は dev.mysql.com、
   MongoDB は mongodb.com）。

3. N+1診断（ARCHITECTURE.md の「DB / ORM」に ORM が記録されている場合のみ）
   `[使用言語] [使用ORM] N+1 detection [現在年]`

4. スケーリング実施判断
   以下の判断基準を順番に適用する（`.opencode/standards/principles/risk-based-approach.md` の4象限に対応）：

   【A領域：即座に対処】
   以下のいずれかが真の場合：
   - 現在のレスポンスタイムが ARCHITECTURE.md の「パフォーマンス > p95」目標値を超えている
   - 取得したデータ件数が「データ件数（1年後想定）」の値を超えている
   → `.opencode/standards/principles/risk-based-approach.md` の「確率：高・影響：高」に相当する。
     スケーリングを即座に実施する。人間に報告して承認を得てから実施する。

   【C領域：計画的に対処】
   以下の両方が真の場合：
   - 現在のレスポンスタイムは p95 目標値を超えていない
   - 取得したデータ件数が「データ件数（1年後想定）」の値に近づいている
     （目安：想定値の半分以上。ただし最終判断は人間が行う）
   → `.opencode/standards/principles/risk-based-approach.md` の「確率：中・影響：高」に相当する。
     次の月次診断までにスケーリングを計画するよう人間に報告する。

   【D領域：許容】
   上記のいずれにも該当しない場合：
   → 継続監視のみ。報告に記載する。

   スケーリングを実施する場合（A・C領域）：
   ARCHITECTURE.md の「スケーリング方針」の記録を read_file で確認する。
   - 「垂直スケーリング」と記録されている場合：
     `[ARCHITECTURE.md の「デプロイ先」値] vertical scaling [現在年]`
   - 「水平スケーリング」と記録されている場合：
     `[ARCHITECTURE.md の「デプロイ先」値] horizontal scaling auto-scaling [現在年]`
   信頼できる情報源の判断基準：デプロイ先の公式組織が管理するドメイン。
   「[デプロイ先名] official documentation」で検索し公式ドメインを採用する
   （例：Vercel は vercel.com/docs、Fly.io は fly.io/docs、
   AWS は docs.aws.amazon.com、GCP は cloud.google.com/docs）。
   具体的な実施手順を検索結果から確認し、人間に報告してから実施する。
```

## ハーネス構造の見直し（モデル更新時・四半期ごと。それ以外の月はスキップ可）

```
現在使用しているモデルのバージョンを確認し、以下を評価する：
1. Evaluator は今のモデルに対してまだ必要か
   モデルが単独で十分な品質を出せるなら Evaluator は不要なオーバーヘッドになる。
   「Evaluator なしでスプリント完了とした場合に実際にバグや品質問題が残るか」で判断する。
2. Sprint Contract レビューは今のモデルに対してまだ必要か
   モデルが仕様の解釈を誤りにくくなっているなら、レビューなしで実装を開始してもよい。
3. `.opencode/agents/` 内の Planner・Evaluator は現在のモデルに最適化されているか
   （新モデルでスプリント分割が過細分割になっていないか等）
4. AGENTS.md の行数が 100 行を超えていないか
   （超えている場合は段階的開示の見直しが必要）
5. Evaluator の Sprint Contract レビューで差し戻しが頻発していないか
   （頻発している場合は Planner の仕様書品質の改善が必要）

原則：ハーネスの各コンポーネントは「現在のモデルが単独でできないこと」への補助である。
      モデルが改善されれば補助が不要になる部分が生じる。不要なコンポーネントは削除する。
問題があれば、人間に提案の上 decisions/[連番]-harness-review-YYYY-MM.md として記録する（記録には人間の承認が必要）。
```

## 診断完了後の報告

- 総合評価（GREEN/YELLOW/RED）
- 今月中に対処すべき最優先アクション
- decisions/ の要対応項目
- スキルGCレポート：`.opencode/usage/skill-usage.md` を読み、各スキルの出現回数と
  最終使用日を集計して報告する。.opencode/skills/ に存在するが当月0回のスキルを
  削除候補として提案する。find-skills・skill-creator はグローバルスキルのため除外する。
- ハーネス構造GCレポート（ハーネス見直しを実施した月のみ）：
  不要になったコンポーネントと、追加が必要なコンポーネントを報告する。
