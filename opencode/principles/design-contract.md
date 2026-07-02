# デザイン契約（Design Contract）

---

## なぜデザイン契約が必要か

AI が UI を実装するとき、以下の問題が繰り返し発生する：

- 同じプロジェクトなのにコンポーネントごとに色・フォント・余白が統一されない
- 人間が「ヘッダーを作って」と言ったとき、既存の Navigation/Header があるのに新しい Header コンポーネントが作られる
- デザインを変更するとき、CSS・コンポーネント・ドキュメントの修正漏れが生じる

これらは「プロジェクト内のデザインに関する約束事が AI に伝わっていない」ことが原因。
デザイン契約は以下の3本柱でこの問題を解決する。

---

## 3本柱

### 柱1：Token SSOT（Single Source of Truth）

色・フォント・スペーシング・シャドウのすべての値を `design/token-ssot.json` に集約する。

**トークンの3層構造：**

| 層 | 役割 | 例 |
|---|------|-----|
| primitive | 生の値。ブランドの最小単位 | `#3B82F6`, `16px`, `Inter` |
| semantic | 意味づけ。コンテキストに応じた役割 | `color.accent`, `font.body`, `spacing.m` |
| component | 部品スコープの割り当て | `button.background`, `card.padding` |

**運用ルール：**
- token-ssot.json を唯一の正本とする
- DESIGN.md は値を直接持たない。すべての値は token-ssot.json を参照する
- 値を変更するときは必ず token-ssot.json を先に編集する
- CSS にトークン値を直書きしない。CSS 変数（`var(--color-accent)`）経由で参照する

### 柱2：Component Map

デザイン上の部品名と実装上のコンポーネント名の対応関係を `design/component-map.json` で管理する。

```json
{
  "components": [
    {
      "design_name": "Header",
      "code_name": "Navigation/Header",
      "tokens": ["semantic.color.background", "semantic.color.text-primary"],
      "variants": ["default", "sticky"]
    }
  ]
}
```

**運用ルール：**
- コンポーネントを新規作成するときは必ず component-map.json に登録してから実装する
- 外部UI語彙（Header / Drawer / Tabs / Card Grid / Hero / CTA）がリクエストに含まれる場合、component-map.json に既存コンポーネントがないか確認する。存在する場合は新規作成しない
- variant を追加するときは component-map.json の variants 配列を更新する
- token 参照を変更するときは component-map.json の tokens 配列を更新する

### 柱3：外部UI語彙の正規化

人間から来る UI 実装リクエストには外部UI語彙（汎用的な UI パターン名）が含まれる。
これらをプロジェクト固有のコンポーネント名に変換する。

**変換ルール：**
- Header → Navigation/Header カテゴリのコンポーネントとして既存を確認する
- Drawer → Navigation/Drawer として既存を確認する
- Tabs → Navigation/Tabs として既存を確認する
- Card Grid → Display/Card と Section/RelatedPosts の組み合わせを確認する
- Hero → Display/Hero として既存を確認する
- CTA → Action/Button の variant として既存を確認する

上記以外の外部語彙がリクエストに含まれる場合も同様に、component-map.json の design_name との一致を確認してから実装する。

---

## 変更手順

### Token 値の変更

1. `design/token-ssot.json` を編集する
2. グローバルCSS（globals.css / variables.css）を追従させる
3. 変更の影響を受ける全コンポーネントを確認する
4. `design/component-map.json` の token 参照がずれていないか確認する

DESIGN.md の編集は不要。DESIGN.md は値を直接持たず token-ssot.json を参照するため、変更は自動的に反映される。

### コンポーネントの追加

1. `design/component-map.json` の components 配列に新規エントリを追加する
   - design_name：デザイン上の部品名
   - code_name：実装上のコンポーネント名（パスを含む）
   - tokens：使用する token 名の配列
   - variants：バリエーション名の配列
2. コンポーネントを実装する
3. component-map.json の情報と実装が一致するか確認する

### コンポーネントの変更

1. variant を変える場合：component-map.json の variants を更新する
2. token 参照を変える場合：component-map.json の tokens を更新する
3. 実装を追従させる
4. component-map.json と実装の一致を確認する

### デザインの再収集（新プロジェクト立ち上げ時や初期値の再設定時）

1. `design/INTAKE.md` の手順に従い、人間と対話しながら新しい値を収集する
2. `design/token-ssot.json` を新しい値で上書きする
3. グローバルCSS を新しい値で上書きする
4. `design/component-map.json` の token 参照を新しい値に更新する
5. 影響を受ける全コンポーネントを確認し、必要に応じて更新する

頻繁なピクセル単位の調整（カードサイズ・余白・1色の変更等）に対してこの手順は不要。
その場合は「Token 値の変更」手順で token-ssot.json のみを編集すればよい。

### 破壊的変更（複数の正本ファイルを同時に変更する場合）

複数の正本ファイル（token-ssot.json + component-map.json）を同時に変更する場合、
以下の確認順を固定する。この手順は変更単位別の手順（Token / コンポーネント追加 / コンポーネント変更）より優先する。

1. `design/token-ssot.json` を編集する（primitive → semantic → component の順）
2. グローバルCSS（globals.css / variables.css）を追従させる
3. 全コンポーネントのAPI を確認する（破壊的変更がないか）
4. `design/component-map.json` を更新する（token 参照・variants）
5. 影響を受ける全テンプレート・ページを確認する
6. 派生アセット（OG画像・manifest 等）に影響があれば更新する
7. デザイン契約ルール（`.opencode/instructions/design-contract.md`）に違反していないか最終確認する

判断基準：「複数の正本ファイルを同時に変更するか」。
1ファイルのみの変更であれば通常の「Token 値の変更」「コンポーネントの変更」手順で十分。

---

## W3C Design Token 形式

`design/token-ssot.json` は W3C Design Token 形式に準拠する。

```
primitive/  生の値。ブランドの最小単位
semantic/   意味づけ。コンテキストに応じた役割  
component/  部品スコープの割り当て
```

各トークンは `$value` プロパティを持ち、semantic/component 層から primitive 層への参照には `{}` で囲んだパスを使用する：

```json
{
  "primitive": {
    "color": {
      "blue-500": { "$value": "#3B82F6" }
    }
  },
  "semantic": {
    "color": {
      "accent": { "$value": "{primitive.color.blue-500}" }
    }
  }
}
```

`design/token-ssot.json` を作成するときは `$YORI_PATH/snippets/design/token-ssot.json.template` をコピーして使用する。
`design/component-map.json` を作成するときは `$YORI_PATH/snippets/design/component-map.json.template` をコピーして使用する。
`design/INTAKE.md` を作成するときは `$YORI_PATH/snippets/design/INTAKE.md.template` をコピーして使用する。

---

## Open Design との関係

[Open Design](https://github.com/nexu-io/open-design) はデザイン契約の3本柱と競合しない。
以下の役割分担で協調する：

| レイヤー | 担当 | ファイル |
|---------|------|---------|
| デザイン値の正本 | yori 契約 | `design/token-ssot.json` |
| デザイン生成 | Open Design | Design System（Skill が参照） |
| 検証 | yori 契約 + OD CLI | evaluator / `pnpm tools-dev` |

- Open Design の Design System は token-ssot.json の**外部入力ソース**として利用できる。OD で生成したデザインから値を抽出して token-ssot.json に転記する
- OD の CLI 検証コマンド（`pnpm tools-dev`）は DESIGN.md 編集後の整合検証として使用できる
- Open Design の Skill（132種）と yori の subagents（evaluator 等）は独立した機能。OD Skill はデザイン生成に、yori の evaluator は品質検証に使う
- OD を使う場合も `design/component-map.json` は yori の契約として維持する。OD の生成物をコンポーネントに起こすときの名対応は component-map.json で管理する
