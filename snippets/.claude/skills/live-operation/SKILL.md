---
name: live-operation
description: |
  This skill should be used whenever modifying code while production is live —
  bug fixes, feature additions, and configuration changes without exception.
  Use this skill whenever the user mentions 「本番で動いている」「ユーザーが使っている」
  or requests monthly maintenance: 「月次診断して」「月次チェックして」
  Make sure to use this skill for ANY change to a running production system,
  even when the user does not explicitly mention production.
  Do NOT use for initial release preparation (use release-prep instead).
  Do NOT use for development-only environments with no live users.
  優先順位：既存機能を壊さない > セキュリティ > バグ修正 > 改善 > 新機能追加
version: 1.0.0
status: active
---

## When to Use

このスキルを使うべきタイミング：
- 本番環境が稼働中の状態でコードを変更するとき（種類を問わない）
- バグ修正・機能追加・設定変更・依存関係の更新
- 「月次診断して」「月次チェックして」と依頼されたとき

このスキルを使わないタイミング：
- 初回の本番リリース準備（→ release-prep を使う）
- ユーザーがいない開発専用環境での作業

## Pre-Change Checklist（変更前に必ず実行）

以下を確認してから変更に進む。確認せずに変更しない。

- [ ] この変更は既存のテストを壊すか → AGENTS.md の Test コマンドを実行して確認
- [ ] 影響範囲はどこか → 依存ファイルを列挙する
      （広い場合は `@codebase-investigator` を呼び出す）
- [ ] ロールバック手順はあるか → git revertで戻せる状態か確認

影響範囲が大きい場合は実施前に人間に確認を求める。

## Periodic Diagnosis（条件付き実行）

このSkillが参照されたセッションで、以下のいずれかに該当するときのみ実行する。
該当しない場合はスキップして Pre-Change Checklist に進む。

- `.claude/handoff-artifact.md` のタイムスタンプが7日以上前（または存在しない）
- handoff-artifactの「未解決の問題」にバグ修正・インシデント対応の記録がある
- 人間から「診断して」と明示的に依頼された

該当した場合に確認する内容：

**DDD診断**：services/・features/のビジネスロジックを読んで以下を確認する：
- 同じバリデーション・ビジネスルールが複数箇所に重複していないか
- 1つの条件を変えると複数ファイルの修正が必要になっていないか
→ `.claude/standards/principles/production-deployment.md` のDDDセクション参照

**スキル化候補**：このセッション中に同じ種類の作業が3回以上発生した場合、
`decisions/skill-candidates.md` に記録して人間に報告する。

## Monthly Checklist（月次・「月次診断して」と依頼されたときのみ実行）

以下のサブエージェントを順番に呼び出す：
```
@resilience-checker
@code-quality-auditor
```

商用プロジェクトの場合は追加で：
`.claude/standards/principles/commercial-operations.md` の月次確認項目を実施する。

メインエージェントが直接実行する（毎月）：
```
decisions/ の各ファイルを読んで以下を確認する：
1. 判断の前提（使用技術・外部API・チーム構成）が変わっているものがないか
2. 「要確認」「未定」のまま放置されているものがないか
3. 1年以上前のADRで現在の実装と矛盾しているものがないか
問題があれば decisions/[連番]-review-YYYY-MM.md として記録する。
```

**ハーネス構造の見直し**（モデル更新時・四半期ごと。それ以外の月はスキップ可）：

```
現在使用しているモデルのバージョンを確認し、以下を評価する：
1. Evaluator は今のモデルに対してまだ必要か
   モデルが単独で十分な品質を出せるなら Evaluator は不要なオーバーヘッドになる。
   「Evaluator なしでスプリント完了とした場合に実際にバグや品質問題が残るか」で判断する。
2. Sprint Contract レビューは今のモデルに対してまだ必要か
   モデルが仕様の解釈を誤りにくくなっているなら、レビューなしで実装を開始してもよい。
3. `.claude/agents/` 内の Planner・Evaluator は現在のモデルに最適化されているか
   （新モデルでスプリント分割が過細分割になっていないか等）
4. AGENTS.md の行数が 100 行を超えていないか
   （超えている場合は段階的開示の見直しが必要）
5. Evaluator の Sprint Contract レビューで差し戻しが頻発していないか
   （頻発している場合は Planner の仕様書品質の改善が必要）

原則：ハーネスの各コンポーネントは「現在のモデルが単独でできないこと」への補助である。
      モデルが改善されれば補助が不要になる部分が生じる。不要なコンポーネントは削除する。
問題があれば decisions/[連番]-harness-review-YYYY-MM.md として記録する。
```

診断完了後の報告：
- 総合評価（GREEN/YELLOW/RED）
- 今月中に対処すべき最優先アクション
- decisions/ の要対応項目
- スキルGCレポート：`.claude/usage/skill-usage.md` を読み、各スキルの出現回数と
  最終使用日を集計して報告する。.claude/skills/ に存在するが当月0回のスキルを
  削除候補として提案する。find-skills・skill-creator はグローバルスキルのため除外する。
- ハーネス構造GCレポート（ハーネス見直しを実施した月のみ）：
  不要になったコンポーネントと、追加が必要なコンポーネントを報告する。

## Output Format

```
## live-operation 完了

### 変更内容
[変更したファイルと概要]

### Pre-Change Checklist
- [x] テスト確認：[結果]
- [x] 影響範囲：[列挙]
- [x] ロールバック：git revert [コミットID]

### 懸念点
[あれば記載。なければ「なし」]
```
