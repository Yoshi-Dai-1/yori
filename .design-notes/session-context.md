# Session Context

<!-- セッション終了時に上書き更新する（追記しない）。
     前回の履歴は git log で参照可能。 -->

## Session 4: test-2 動作確認からのフィードバック修正

### 完了した変更
- `opencode/snippets/agents/AGENTS.md`:
  - 0-d: ADR 自動作成手順を追加
  - 0-d: 「テンプレート全文を先に読む」を明確化
  - 0-d: テンプレート指示に従い不要セクションを削除する旨を追記
  - 0-f: Report Format スキップ注釈を追加
  - Subagents: `harness-engineering.md` を完全パスに修正
- `opencode/snippets/.opencode/plugins/harness-health.ts`: 初期セットアップ中ファイル（project-definition.md / ARCHITECTURE.md / AGENTS.md）を LOOP 検出から除外する SETUP_PATHS を追加
- `opencode/snippets/.opencode/plugins/rule-injector.ts`: 同一ルールの連続発報を抑制するクールダウン（RULE_COOLDOWN_MS = 10分）を追加
- 全 broken link 修正（8件）:
  - naming-conventions.md / security.md: `principles/` → `.opencode/standards/principles/`
  - ARCHITECTURE.md.template / tech-decision.md.template: `non-functional-requirements.md` → 完全パス
  - monthly-diagnosis.md: 相対パス・欠落プレフィックス修正
  - handoff/SKILL.md: `handoff-artifact.md` → `.opencode/handoff-artifact.md`
  - _env-gitignore.md: `iac.md` → `.opencode/standards/architectures/iac.md`
  - resilience-checker.md: `coding-conventions.md` → `.opencode/coding-conventions.md`
- コミット: 未 commit（本セッションで push 予定）

### アーキテクチャ上の決定
- 初期セットアップ中は harness-health の LOOP 検出をバイパスする（SETUP_PATHS による除外）
- rule-injector の再発報抑制は session.rules の既存機構を拡張（クールダウン追加、新規 Plugin 不要）
- broken link の修正方針: すべてプロジェクトルートからの完全パス（`.opencode/` / `docs/` プレフィックス）に統一

### 今回発見された設計上の課題
- 初期セットアップ（反復書き込み）と通常開発用ガードレール（harness-health 閾値）の競合 → SETUP_PATHS で緩和
- harness-engineering.md など原則文書への broken link は存在しないが、README への修正反映は不要（高レベル記述のみで矛盾なし）

### 次のセッションでやること
- test-2（または新しい test-3）で `setup-harness.sh` を再実行し、修正内容を検証
  - ARCHITECTURE.md の broken link が解消されたか
  - initial-setup 中の harness-health 誤検出が抑制されたか
  - rule-injector の重複発報が抑制されたか
  - ADR が自動生成されるか
