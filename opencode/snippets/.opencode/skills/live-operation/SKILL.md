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
---

<!-- template-version: 1.0.0, template-status: active -->

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

- `.opencode/handoff-artifact.md` のタイムスタンプが7日以上前（または存在しない）
- handoff-artifactの「未解決の問題」にバグ修正・インシデント対応の記録がある
- 人間から「診断して」と明示的に依頼された

該当した場合に確認する内容：

**DDD診断**：services/・features/のビジネスロジックを読んで以下を確認する：
- 同じバリデーション・ビジネスルールが複数箇所に重複していないか
- 1つの条件を変えると複数ファイルの修正が必要になっていないか
→ `.opencode/standards/principles/production-deployment.md` のDDDセクション参照

**スキル化候補**：このセッション中に同じ種類の作業が3回以上発生した場合、
`.opencode/usage/skill-candidates.md` に記録して人間に報告する。

## 品質診断の戦略選択

品質診断の方式はプロジェクトの開発スタイルに合わせて選択する。
どの方式を使うかは `ARCHITECTURE.md` または `docs/project-definition.md` に記録しておく。

| 戦略 | 想定する開発スタイル | トリガー |
|------|-------------------|---------|
| **Reactive**（デフォルト） | 個人・スポット開発・週数回 | 人間が「月次診断して」と依頼したとき |
| **Scheduled** | チーム開発・毎日コードが動く・CI/CDあり | cron または CI パイプライン（週次・日次） |
| **Continuous** | バックグラウンドエージェント常時稼働・並列開発 | PR 作成ごと・コミットごと |

**どの戦略を選ぶかの判断基準**：
- コードが変更される頻度が週に数回以下 → Reactive
- 複数人・複数エージェントが毎日コードを書く → Scheduled
- エージェントが非同期・並列で常時PRを生成する → Continuous

Scheduled・Continuous の設定例は `.opencode/plugins/README.md` を参照。
戦略は `ARCHITECTURE.md` の「品質診断戦略」フィールドを read_file で確認する。
未記入の場合は Reactive として動作する。変更が必要な場合は `ARCHITECTURE.md` を更新する。

---

## Monthly Checklist（Reactive 戦略・「月次診断して」と依頼されたときのみ実行）

以下の手順は `references/monthly-diagnosis.md` に定義されている。
概要のみ以下に示す：

1. `@resilience-checker` を実行
2. `@code-quality-auditor` を実行
3. 品質スコアを `docs/quality-scorecard.md` に記録
4. セキュリティスキャンを実行（`references/monthly-diagnosis.md` 参照）
5. スケーリング診断（`references/monthly-diagnosis.md` の Scaling Diagnosis 参照）
6. ハーネス構造の見直し（四半期ごと・`references/monthly-diagnosis.md` 参照）

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
