---
name: skill-creator
description: |
  This skill creates, improves, evaluates, and optimizes skill definitions.
  Install autonomously, with confirmation, or not at all depending on the
  project's expansion level setting.
status: not-installed
expansion-level: auto / confirm / none（project-context.md の設定に従う）
---

## Purpose

スキルの新規作成・改善・eval・description の最適化。
同じ作業が繰り返し発生する場合に、その作業をスキルとして文書化する。

## Trigger Conditions（客観的・検証可能）

以下のいずれかに該当する場合、条件成立と判定する。
「手順が定形化している」のような主観的判断は行わない。

1. **3回以上パターン検出**: 同一セッション内で、同じファイル種別の作成・
   同じ構造のコード生成が 3 回以上発生した
   （例：3回目のコンポーネント作成指示で「このパターンをスキル化すべき」と判断）
2. **2回目以降の同一質問**: 過去のセッションまたは同一セッション内で
   全く同じ質問を 2 回以上受けた（セッション間の判断は
   `.opencode/usage/skill-usage.md` の使用履歴を参照）
3. **人間からの明示的示唆**: ユーザーが「これスキルにできない？」
   「このパターン繰り返してる」「毎回同じことしてる」
   「また同じ手順だ」と発言した

## Install Protocol

`.opencode/project-context.md` の「設定ファイルの自動展開レベル」を確認し、
以下の3段階で挙動を変える：

| 設定値 | AIの挙動 |
|--------|---------|
| `自動展開` | 確認なしで `_install.sh` を実行 → 完了後スキルを呼び出す |
| `確認付き展開` | 「skill-creator をインストールしますか？」と人間に確認 → 承認後 `_install.sh` を実行 |
| `展開なし` | 「skill-creator というスキルがあります。インストールしますか？」と提案する。実行は人間の判断に委ねる |
| 未設定（初回） | 上記3択を人間に提示し、選んでもらってから実行する |

インストール失敗時は「ネットワーク環境を確認してください」と伝える。
インストール成功後、本物の skill-creator スキルを呼び出して目的の処理を続行する。
