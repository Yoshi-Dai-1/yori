# ADR 002: ディレクトリ名に kebab-case を使う

**日付**：2025年  
**状態**：採用

---

## 状況

ディレクトリ名のケーススタイルとして以下を検討した：
- `kebab-case`（stock-detail）
- `camelCase`（stockDetail）
- `PascalCase`（StockDetail）
- `snake_case`（stock_detail）

## 決定

ディレクトリ名は `kebab-case` に統一する。

## 理由

1. **OS間の安全性**：macOSはファイルシステムがデフォルトで大文字小文字を区別しない。`StockDetail/` と `stockdetail/` が同じディレクトリとして扱われる場合がある。kebab-caseは大文字を使わないためこの問題が起きない
2. **URLパスとの対称性**：`/stock-detail` というURLに対応するディレクトリが `stock-detail/` であると一貫性がある
3. **コマンドラインの安全性**：スペースを含まないため、`cd` コマンドや `import` パスで引用符が不要
4. **視認性**：ハイフンで単語が区切られるため、複数単語のディレクトリ名でも読みやすい

## トレードオフ

- Reactコンポーネントの慣習（PascalCase）とディレクトリ名の慣習が異なるため、ファイル名とディレクトリ名で別のルールを覚える必要がある
- ただしこれは業界標準に近い分離であり、混乱は少ない

## 補足

ファイル名のルールは別（`naming-conventions.md` 参照）。ディレクトリ名のみkebab-caseを強制する。
