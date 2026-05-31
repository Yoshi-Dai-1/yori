---
paths:
  - "DESIGN.md"
  - "design/*.json"
  - "**/*.css"
  - "**/*.tsx"
  - "**/*.jsx"
---

# デザイン契約常駐ルール（Design Contract Rules）

このファイルは DESIGN.md・design JSON・UI コンポーネントファイルを編集するたびに自動リロードされる。
詳細な判断基準は `.opencode/standards/principles/design-contract.md` を参照（必要時に読む）。

---

## 自律トリガー

### DESIGN.md が存在し design/token-ssot.json が存在しないとき

1. `design/INTAKE.md` が存在しなければテンプレートから作成する
2. `design/INTAKE.md` の手順に従い、人間と対話しながらデザイン値を収集する
3. 収集した値で `design/token-ssot.json` を作成する
4. `design/component-map.json` を作成する（空のテンプレートでも可）

### デザインの再収集（人間が全面的な変更を指示したとき）

人間が「デザインを変えたい」「見直したい」「リニューアル」「再収集」などの意図を示した場合：

1. `design/INTAKE.md` の手順に従い、人間と対話しながらデザイン値を再収集する
2. `design/token-ssot.json` を新しい値で上書きする
3. グローバルCSS（globals.css / variables.css 等）を新しい値に追従させる
4. `design/component-map.json` の token 参照を新しい値に更新する
5. 影響を受ける全コンポーネントを確認し、token 参照が新しい値に合致しないコンポーネントを更新する

### UI コンポーネントを新規作成するとき

1. `design/component-map.json` を読み、既存コンポーネントを確認する
2. Header / Drawer / Tabs / Card Grid / Hero / CTA がリクエストに含まれる場合、component-map.json に同名のエントリがないか確認する
3. 存在する場合：既存コンポーネントを使用する。新規作成しない
4. 存在しない場合：新規作成し、component-map.json に追記する

### design/token-ssot.json を編集したとき

1. 変更を DESIGN.md の該当説明に追従させる（DESIGN.md は値を直接持たないため、参照が正しいことの確認のみ）
2. グローバルCSS（globals.css / variables.css 等）の該当値を追従させる
3. 変更の影響を受ける全コンポーネントを確認する
4. component-map.json の token 参照がずれていないか確認する

---

## 常駐禁止事項

- token-ssot.json にない色・サイズ・スペーシング値を CSS に直書きしない
- component-map.json 未登録のコンポーネントを新規作成しない
- 外部UI語彙（Header / Drawer / Tabs / Card Grid / Hero / CTA）を component-map.json 未確認のままコードに登場させない
