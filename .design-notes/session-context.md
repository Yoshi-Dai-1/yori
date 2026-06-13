# Session Context

<!-- セッション終了時に上書き更新する（追記しない）。
     前回の履歴は git log で参照可能。 -->

## 今回の変更（2026-06-13）

commit-review.ts に @security-auditor（監査モード）を追加。@code-reviewer の委譲チェーンを解決。

### Changed files

| ファイル | 内容 |
|---------|------|
| `snippets/.opencode/plugins/commit-review.ts` | **@security-auditor 並列実行を追加**: git commit 検出 → @code-reviewer（一般 + CRITICAL security）+ @security-auditor（全severity）を並列子セッション実行 → いずれかが問題を検出したらブロック |
| `snippets/.opencode/plugins/README.md` | commit-review.ts の説明を更新 |
| `snippets/agents/AGENTS.md` | **「提案・人間実行」モードの名実一致**: TDD 完了後も AI が自律提案するよう修正（従来は人間指示が必須）。実行は人間（従来通り） |
| `snippets/agents/AGENTS.md` | 「ブランチとPull Request」セクションを一旦追加したが削除（AI不要な情報によるAGENTS.md肥大化を避ける）。代わりに plugins/README.md に人間向け備考を追加 |
| `snippets/agents/subagents/security-designer.md` | **新規作成**: 現 security-auditor.md から設計モード部分を分割（段階的開示のため） |
| `snippets/agents/subagents/security-auditor.md` | **監査モードのみに書き換え**: 設計モード削除、フロントマターを監査特化に |
| `snippets/agents/AGENTS.md` | Security Boundaries: `@security-auditor（設計モード）` → `@security-designer`、`@security-auditor（監査モード）` → `@security-auditor` |
| `snippets/.opencode/plugins/rule-injector.ts` | `@security-auditor（監査モード）` → `@security-auditor`（2箇所） |
| `setup-harness.sh` | サブエージェント一覧に security-designer を追加 |
| `README.md`（ルート） | サブエージェントファイル一覧に security-designer.md を追加 |

### Key design decisions

1. **委譲チェーンの解決**: @code-reviewer が「HIGH以下は @security-auditor に委ねる」と明示していたが、commit-review.ts は @code-reviewer のみ実行していた。@security-auditor を追加することで委譲を解決した。

2. **並列実行**: `Promise.all` で両方の子セッションを並列実行。シーケンシャルより高速で、片方が失敗しても他方の結果は取得できる。

3. **セキュリティ監査の範囲**: 25+脆弱性クラスの明示列挙は行わず、@security-auditor の7カテゴリチェックリストに委ねる。LLM の訓練知識により実質的に同範囲をカバーするため、列挙による複雑性増加は避けた。

4. **hasIssues の拡張**: @security-auditor の出力形式（`[CRITICAL]`, `[HIGH]`, `[MEDIUM]`, `[LOW]` を行頭に配置）も検出できるよう regex を拡張。`m` フラグで行頭マッチ。

5. **「提案・人間実行」モードの修正**: 従来は「人間から「コミットして」と指示されたとき」のみ提案していたが、名実一致のため TDD フロー完了後の自律提案を追加。commit-review.ts が発火する経路を明確化した。また TDD 完了後の提案により、人間が「コミットして」と言うのを忘れるケースもカバーできる。

### 設計上の判断

**Security Guidance Layer 2 との差:**
- **プロセス上のギャップ**（全severityのコミット時コード強制）: ✅ 解決（@security-auditor 追加）
- **検出粒度のギャップ**（25+クラスの明示列挙 vs 7カテゴリ）: ❌ あえて残す（Simplicity First。LLM知識で同範囲カバー可能。列挙による複雑性増加を避ける）
- **トリガータイミングの差**（毎ターン vs コミット時）: 変更なし（dev-standards はコミット時検出で十分と判断）

## 残タスク

- rule-injector.ts の実機動作未検証（OpenCode Plugin ランタイム依存）
- commit-review.ts の実機動作未検証（子セッション API + BunShell + 並列子セッションの実動作）
- compaction-context.ts との連携（conventionsOffered 状態の保存）は未実装（将来対応）
- 他プロジェクト実機テスト（setup-harness.sh 実行後）
