# 作業ディレクトリ・マルチタスク設計：Phase 2 と Phase 3 の方針

<!-- 2026-06-03 作成 -->
<!-- Phase 1 は実装済み（principles/harness-engineering.md + task-archive.ts Plugin） -->

## Phase 1（実装済み）

`docs/working/<group>/` パターンで状態分離を実現。
メインエージェントが **逐次的** に作業ディレクトリを切り替える。
アーカイブは `task-archive.ts` Plugin が `session.idle` 検知で自動提案し、
AI が `docs/archive/<group>/` へ移動する。

**前提条件**：
- OpenCode のサブエージェントの sessionID 仕様は未検証
- 並列実行時のマージ戦略が未確立
- 観測指標（並列実行の品質測定）がない

---

## Phase 2（将来導入）

**サブエージェント並列実行プロトコル**

### 概要

`@planner` が分解した複数タスクを、`@worker` サブエージェントが並列で実行する。

### 導入条件（すべて充足したときのみ）

1. **サブエージェントの sessionID 仕様が検証済み**
   - `.design-notes/subagent-session.md` で「未検証」と記載されている前提
   - サブエージェントが独立 sessionID を持つか、親と共有するかを確定
   - 検証方法：サブエージェント2体を並列起動し、`sessionID` の出力を確認

2. **並列実行時の品質を測る観測指標が確立**
   - 並列実行 vs 逐次実行の精度比較
   - マージコンフリクト発生率
   - Context Anxiety の検知精度（サブエージェント間での誤検知）

3. **マージ戦略の確立**
   - `@worker` A と `@worker` B が同じファイルを変更した場合の解消手順
   - git worktree による物理分離 vs 逻辑分離の選択
   - コンフリクト解消の自動化（または手動手順の明文化）

### プロトコル概要

```
@orchestrator（メインエージェント）
  1. @planner で分解 → tasks.json に group フィールド追加
  2. 各タスクに対して @worker を並列起動
     - @worker は `docs/working/<group>/` 内だけでファイルを編集
     - 他の @worker の作業ディレクトリに触れない
  3. 各 @worker の完了通知を待つ
  4. @aggregator で結果を統合（手動マージ or git merge）
  5. @evaluator で QA 評価
```

### 導入時のファイル変更

| ファイル | 変更内容 |
|---------|---------|
| `principles/subagents.md` | `@worker` / `@orchestrator` / `@aggregator` の定義を追加 |
| `principles/harness-engineering.md` | 並列実行セクションを追加 |
| `snippets/.opencode/plugins/task-archive.ts` | 並列実行時のアーカイブ判定を調整 |
| `snippets/agents/subagents/` | `worker.md` テンプレートを追加 |

### リスク

- 並列実行は **中〜大規模プロジェクト** のみで有効（小規模は逐次で十分）
- オーバーヘッド（サブエージェント起動・通信・マージ）が逐次より大きい
- 導入時期：Phase 1 の運用が安定し、並列実行の必要性が実感されたとき

---

## Phase 3（遠い将来）

**完全自律的なマルチエージェント開発**

### 概要

人間は「最初の要件」と「最終承認」のみ。それ以外はすべて AI エージェント群が自律的に実行。

### 導入条件

1. モデル性能が十分（現在のモデルで不可能なレベル）
2. サブエージェント間の通信プロトコルが安定（Phase 2 の完全実装）
3. マージコンフリクト解消が自動化可能
4. Context Anxiety の検知精度が人間と同等以上
5. 品質保証（E2Eテスト・統合テスト）の自動化が確立

### プロトコル概要

```
人間：「[高レベル要件]」

@orchestrator（自動起動）
  → @planner で分解
  → @worker 群で並列実装
  → @aggregator で統合
  → @evaluator で品質評価
  → 人間に最終承認を依頼

人間：承認 or 差し戻し
```

### 現状との差

- 現在：人間が「やるならどうぞ」と指示してから AI が動く
- Phase 3：AI が自律的に判断・実行し、人間は承認のみ

### リスク

- 人間のドメイン知識を AI が代替できない（暗黙知・ユーザー体験）
- 品質責任の所在が不明確
- モデルの Hallucination が実装に影響するリスク
- 導入時期：AI エージェント技術が大幅に進化したとき

---

## 決定事項

| 判断 | 理由 |
|------|------|
| Phase 2 は「条件充足時のみ導入」 | 技術的未成熟・観測指標なし・小規模には不要 |
| Phase 3 は「遠い将来の理想形」と位置付け | 現状のモデル性能では不十分 |
| Phase 1 の `group` フィールドは Phase 2 で再利用 | tasks.json の設計が将来も有効 |
| アーカイブは `docs/archive/` に物理移動 | git管理から外すため（.gitignore 追加済み） |
