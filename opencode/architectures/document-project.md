# アーキテクチャ：ドキュメント・教材プロジェクト

**向いている場面**：研修教材・技術ドキュメント・ナレッジベース・仕様書集
**採用パターン**：番号付きディレクトリ + Markdown中心の構成

これはプロダクションコードにナンバリングを禁止する原則の**例外**。
「読む順序が意味を持つコンテンツ」に限り、ナンバリングが有効。

---

## ディレクトリ構成

```
project-root/
  README.md                     プロジェクトの目的・対象者・使い方

  content/                      コンテンツ本体
    01_introduction/            読む順序を明示（ナンバリング有効）
      README.md
      01_overview.md
      02_goals.md
    02_basics/
      README.md
      01_topic-a.md
      02_topic-b.md
    03_advanced/
      README.md

  assets/                       画像・図・動画
    images/
      diagram-01.png            コンテンツと対応する命名
    videos/

  templates/                    新コンテンツ作成用テンプレート
    chapter-template.md
    topic-template.md

  scripts/                      ビルド・公開用スクリプト（必要な場合）
    build.sh
    export-pdf.sh

  config/                       ドキュメントツールの設定（MkDocs・VitePressなど）
    mkdocs.yml
```

---

## ナンバリングのルール

```
01_ から始める（10以上になるなら01, 02...09, 10）
章レベルは2桁で統一する（01_chapter/）
節レベルも2桁で統一する（01_section.md）

# 良い（一貫したナンバリング）
01_introduction/
02_basics/
03_advanced/

# 悪い（混在）
1_introduction/
02_basics/
advanced/      ← ナンバーがない
```

---

## 教材ファイルの命名

```
# ファイル名はkebab-caseを使う（ナンバリングと組み合わせ）
01_getting-started.md
02_installation-guide.md
03_first-project.md

# 禁止
01_GettingStarted.md    （PascalCase - ドキュメントには不適切）
01_getting_started.md   （snake_case - URLに不向き）
```

---

## Markdownファイルの構造テンプレート

```markdown
# タイトル

## 対象者

このドキュメントを読む人（例：理学療法士・作業療法士・新入職員）

## 前提知識

これを読む前に知っておくべきこと

## 目標

このドキュメントを読んだ後に何ができるようになるか

---

## 本文

（内容）

---

## まとめ

箇条書きで要点を再掲

## 次のステップ

次に読むべきドキュメントへのリンク
```

---

## プロダクションコードとの違い

| 項目 | プロダクションコード | ドキュメント・教材 |
|------|---------------------|------------------|
| ナンバリング | 禁止 | 推奨（順序が意味を持つ場合） |
| ファイル名 | kebab-case | kebab-case（ナンバリングと組み合わせ可） |
| importパス | コード内で参照 | 読者が順番に読む |
| 変更コスト | ナンバー変更でimport破壊 | ナンバー変更は目次の更新だけ |
