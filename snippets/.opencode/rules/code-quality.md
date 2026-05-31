---
paths:
  - "**/*.ts"
  - "**/*.tsx"
  - "**/*.js"
  - "**/*.jsx"
  - "**/*.py"
  - "**/*.go"
  - "**/*.rs"
  - "**/*.java"
  - "**/*.kt"
  - "**/*.rb"
  - "**/*.swift"
  - "**/*.php"
---

# コード品質常駐ルール（Code Quality Rules）

このファイルはコードファイルを編集するたびに自動リロードされる。
AGENTS.md のコンテキスト消失後も、このルールが常にコード品質の判断を補完する。

詳細な判断基準・実装手順は以下を参照（必要時に読む）：
- `.opencode/standards/principles/code-quality.md`
- `.opencode/standards/principles/file-size-and-cohesion.md`

---

## 自律トリガー（人間の指示を待たずに実行する）

### 新規ファイルを作成したとき

1. `.opencode/standards/principles/code-quality.md` を読み、コード品質の6軸（可読性・保守性・テスト容易性・予測可能性・一貫性・段階的改善）を満たしているか確認する
2. `.opencode/standards/principles/file-size-and-cohesion.md` を読み、ファイルサイズの閾値と凝集度基準を確認する
3. 閾値を超える場合は分割を提案する
4. 品質チェックの確認順序（型チェック → lint → テスト → @code-reviewer → 人間レビュー）を実行する

### 既存ファイルを編集したとき

1. `.opencode/standards/principles/code-quality.md` を読み、編集後のコードが品質6軸に沿っているか確認する
2. `.opencode/standards/principles/file-size-and-cohesion.md` を読み、編集後のファイルサイズが閾値を超えていないか確認する
3. 超過している場合は分割を提案する
4. 品質チェックの確認順序を実行する

### リファクタリングを行うとき

1. `.opencode/standards/principles/file-size-and-cohesion.md` を読み、凝集度基準に従って分割を提案する
2. 単一責任の原則に反するコードを特定し、解消する

---

## 常駐禁止事項

- 200行を超えるファイルを分割せずに放置しない
- 複数の責務を持つ関数・クラスを作成しない
- コード品質の6軸のうち複数に違反する変更を一度に行わない
