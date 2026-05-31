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
  - "**/*.c"
  - "**/*.cpp"
  - "**/*.cs"
  - "**/*.css"
  - "**/*.scss"
---

# 命名規則常駐ルール（Naming Conventions Rules）

このファイルはコードファイルを編集するたびに自動リロードされる。
AGENTS.md のコンテキスト消失後も、このルールが常に命名規則の判断を補完する。

詳細な判断基準は以下を参照（必要時に読む）：
- `.opencode/standards/principles/naming-conventions.md`

---

## 自律トリガー（人間の指示を待たずに実行する）

### 新しいファイルを作成するとき

1. `.opencode/standards/principles/naming-conventions.md` を読み、ファイル名の命名規則を確認する
2. ARCHITECTURE.md の「命名規則」セクションに確定値がある場合はそちらを SSOT として従う
3. 拡張子に応じた言語別ルールを適用する

### 新しい関数・変数・クラス・型を命名するとき

1. `.opencode/standards/principles/naming-conventions.md` を読み、使用言語の命名規則を確認する
2. 基本ルールと言語別ルールが矛盾する場合、言語別ルールを優先する
3. 既存コードベースの命名パターンと一貫性を保つ

### @code-reviewer が呼ばれたとき

1. `.opencode/standards/principles/naming-conventions.md` を読み、命名規則違反がないか確認する
2. ARCHITECTURE.md の「命名規則」と比較し、逸脱を検出したら報告する

---

## 常駐禁止事項

- ARCHITECTURE.md の「命名規則」に確定値がある場合、それを無視しない
- プロジェクトの言語別ルールと矛盾する命名を行わない
- 同一プロジェクト内でスタイルを混在させない（ファイル名は全ファイル統一）
