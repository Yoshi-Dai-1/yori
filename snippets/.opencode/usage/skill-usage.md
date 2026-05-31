# スキル使用履歴

<!-- このファイルは skill-tracker.ts Plugin が自動追記する -->
<!-- 月次レビューでGarbage Collectionの判断基準として使う -->
<!-- ローカルスキル（.opencode/skills/）もグローバルスキル（~/.opencode/skills/）も同じ形式で記録される -->

## 記録形式

```
- YYYY-MM-DD: skill-name
```

## 使用履歴

<!-- skill-tracker.ts Plugin が自動追記する -->

---

## 月次レビュー手順（毎月1回）

AIへの指示：
```
.opencode/usage/skill-usage.md を読んで、以下を報告してください。
「削除候補」の判断は .opencode/skills/ に存在するスキルのみを対象にする。
find-skills・skill-creator はグローバルスキルのため削除候補から除外する。

1. 先月3回以上使ったスキル（積極使用）
2. 先月1〜2回だけ使ったスキル（普通）
3. .opencode/skills/ に存在するが先月まったく使われなかったスキル（削除候補）
4. スキル化されていないが繰り返し発生している作業があれば提案

集計方法：
- 使用回数 = skill-usage.md 内の同名スキルの出現回数（対象月）
- 最終使用日 = 同名スキルの最後の記録日付

報告形式：
## スキル使用レポート [YYYY-MM]

### 積極使用
- skill-name: N回

### 削除候補（.opencode/skills/ のみ）
- skill-name: 0回（最終使用: YYYY-MM-DD または「記録なし」）

### スキル化提案
- [作業の概要]: [繰り返し頻度]
```
