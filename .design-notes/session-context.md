# Session Context

## commit-review ゲート改修（判定収束・冗長排除・競合解消）（2026-09-06 実施・未コミット）

### 背景（設計調査の結論）
- 競合 C1: 判定語彙が別々（`[重要度: HIGH/LOW]` vs `[重大度: HIGH/MEDIUM/LOW]` vs `[重要度: HIGH/MEDIUM/LOW]`）
- 競合 C2: ブロック閾値（HIGH vs MEDIUM）・トリガー（tool.execute.tool 毎 vs commit detect）の相違
- 競合 C3: security-auditor が「リスクなし」判定を審査エージェント対話で isAllClear/続行 分岐に委譲
- 競合 C4: `—` 誤字・「リスクなし」分岐テキスト（security-auditor.md:62-79 / 142-156）が auditRequestText 設計と不一致（誤操作のリスクがないと虚偽記述）
- 冗長 R1: 毎コミット全依存監査 (npm audit 等) ×3 場所（セッション開始時 / package-version / commit-review）
- 冗長 R2: コミット量子の終了時オーケストレーション・セッション開始時プルとも重複
- 冗長 R3: コード品質 / 規約ゲートの説明は rule-injector と code-quality が担当、commit review は不要（撤去済み）
- 主因 = 単一確率的 severity 出力に履歴・語彙・検証可能性がない（非収束）

### 設計方針（ユーザー承認済み）
- ブロック: `[重要度: HIGH/CRITICAL]` またはブロック対象クラス（hardcoded-secret / authz / injection / secret-in-log）該当 **かつ** `検証方法:`（エビデンス）あり。MEDIUM/LOW・エビデンスなしは警告
- 履歴: `docs/review-log.md` を git コミット対象とする状態ファイル（SSOT）。同一ファイル:行の未解決は再報告禁止、解消は再計上しない。secret 実値は書かない（マスク保証 + pre-commit / secrets-guard の二重防衛）
- ブートストラップ: 特別分岐なし・履歴SSOTのみ（初回コミットに履歴が含まれるのは自然な挙動）
- 依存監査: staged diff にマニフェストがあるときだけ実行（セッション開始時 / package-version / sprint-audit と重複しない）
- 配役: commit-review がオーケストレータ、reviewer=一般・auditor=セキュリティで並列、エージェント間委譲なし

### 変更ファイル
- 新規: `opencode/snippets/.opencode/config/review-policy.json`（判定 SSoT: severityOrder / block.severities+classes / warning.severities / evidenceRequired / historyFile=docs/review-log.md / historyRecentLines=60 / dependencyAudits 17コマンド）
- `opencode/snippets/.opencode/plugins/commit-review.ts`: readPolicy（DEFAULT_POLICY フォールバック内蔵）・履歴読込/書込（applyHistory/writeHistory）・ブロック判定・警告キュー・バイパス検出（--no-verify / core.hooksPath / git -C / git -c）・依存監査（マニフェスト変更時のみ）・`【解消確認】/【残存確認】`マーカー処理
- `opencode/snippets/agents/subagents/code-reviewer.md`: 委譲行削除・`[重要度: CRITICAL/HIGH/MEDIUM/LOW]`+`検証方法:` 統一・read-only 明記
- `opencode/snippets/agents/subagents/security-auditor.md`: 検証方法追加・「誤操作のリスクがない」虚偽記述是正・依存受渡し明確化
- `opencode/snippets/.opencode/instructions/security/_risk-severity.md`: SSoT = review-policy.json 参照に一本化
- `opencode/snippets/.opencode/plugins/README.md`: commit-review セクション更新
- `opencode/principles/subagents.md`: 「審査エージェントとゲートの設計原則」5条追記（読取専用 / エビデンス / 状態 / クラス判定 / 配役一意化）
- `opencode/README.md` / `.design-notes/harness-file-strategy.md`: config/ 記述に review-policy.json 追記

### 検証（全部 PASS）
- 単体テスト 22件 PASS（`/var/folders/2r/4xmj5zsd5736vnnwzp3gj1x40000gn/T/opencode/commit-review-test/commit-review.test.ts`）
  - analyzeFindings（ブロック/警告/マーカー/クラス/エビデンス）/ applyHistory（解消・行番号ドリフト・二重書き込みなし）/ readPolicy（実配布レイアウト・フォールバック） / isGitCommit・hasHookBypass（-C / -c / --no-verify）
- typecheck: `bunx --bun tsc --noEmit --strict --skipLibCheck --types bun plugins/*.ts` エラーゼロ
- review-policy.json は JSON 妥当・検索: 新規 markdown ローカルリンク追加なし（参照先実在性問題なし）
- 残存 `[重要度: HIGH/...]` は qa-report-format.md（評価テンプレート・ゲートと独立）と code-reviewer/security-auditor（統一後語彙）のみ

### 実装メモ
- writeHistory/applyHistory の二重書き込みバグを修正（writeHistory は applyHistory の結合済み本文を直接書込）。テストで回帰防止
- normalizeHistKey で `:行番号` を除去し、同ファイルなら行番号ドリフトでも解消判定
- テスト用 export: SEV_HEADER_RE / LEGACY_SEV_RE / RESOLVE_RE / REMAIN_RE / HIST_ENTRY_RE / isGitCommit / hasHookBypass / analyzeFindings / applyHistory / writeHistory / normalizeHistKey / readPolicy
- HIST_ENTRY_RE はクラスラベル `[hardcoded-secret]` 許容形
- setup-harness.sh L367-375 で config/*.json 配布（overwrite-protect A）→ 新規プロジェクトは自動、既存は手動コピーが必要
- yori 自身の opencode.json には commit-review 非配線（ハーネス本体のため意図通り）

### 残存リスク（ユーザーに開示済み・受容）
- 人間のターミナル手動コミットは不発火（pre-commit が秘密のみ保護）
- LLM の HIGH→MEDIUM 誤分類は決定論レイヤー（pre-commit / マニフェスト時 audit / secrets-guard / sprint-audit）+ 警告キューで相殺

## 5件README + harness-engineering.md 反映監査と修正 C1〜C7（2026-09-07 実施・未コミット）

### 監査（2026-09-07）
- 対象: ルート README.md / README.ja.md、opencode/README.md / README.ja.md、
  opencode/snippets/.opencode/plugins/README.md、opencode/principles/harness-engineering.md
- 既に反映済み: opencode/README.md / plugins/README.md（詳細）/ ルート2件（概要のみ・問題なし）
- 未反映を検出: opencode/README.ja.md（config 一覧が旧）/ harness-engineering.md（config 一覧・
  「横断的品質ゲート」節に commit-review 節そのものが無い）
- 誤字脱字・語彙・マーカー・パスの表記ゆれなし。コア設計（analyzeFindings / HIST_ENTRY_RE /
  findingToRecord / 配布経路・参照先実在）は整合

### C3 の方針（ユーザー選択 A 採用）
- warning.severities を「宣言のみの未使用設定」から**判定で実際に参照する**仕様へ変更
- analyzeFindings: 非ブロック候補は warning.severities に含まれる severity のみ警告記録（SSoT が警告対象を制御）。
  ブロック候補のエビデンス不足は**降格警告**（warning.severities と無関係に常に警告・ブロック強度を落とさない）
- policyContext: ハードコード「MEDIUM/LOW は警告扱い」→ `warning.severities` の動的参照に置換

### 変更ファイル
- `opencode/snippets/.opencode/plugins/commit-review.ts`: 警告分類を warning.severities 参照に改修（C3）・
  policyContext 動的化・HIST_ENTRY_RE から未使用トークン「経過観察」削除（C5）・
  path なし指摘が解消上書き対象にならない設計意図のコメント追加（C6）
- `opencode/snippets/.opencode/config/review-policy.json`: _comment に「警告対象」を追記（SSoT の範囲明記）
- `opencode/snippets/.opencode/instructions/security/_risk-severity.md`: 「全エージェント」→
  「審査エージェント（code-reviewer / security-auditor）」（C4）・警告扱いの SSoT 参照を明記
- `opencode/principles/harness-engineering.md`: 横断的品質ゲートに「### commit-review」節を新設（C1）・
  config/ SSoT 一覧に review-policy.json 追記（C2）
- `opencode/README.ja.md`: config/ SSoT 一覧に review-policy.json 追記（EN と一致・C2）
- `opencode/snippets/.opencode/plugins/README.md`: 警告記述を warning.severities 参照に更新（C3 整合）・
  `_trigger-pr.md` の裸参照を `.opencode/instructions/security/_trigger-pr.md` にフルパス化（C7）

### 検証（全部 PASS）
- 単体テスト **25件 PASS / 0 fail（48 expect）**: C3 用に3件追加
  （SSoT 外 severity は記録されない / 含む severity は警告記録 / エビデンスなし HIGH は SSoT と無関係に降格警告）
- typecheck: `bunx --bun tsc --noEmit --strict --skipLibCheck --types bun plugins/commit-review.ts`
  を `opencode/snippets/.opencode/` で実行 → TSC_EXIT=0
- 新規参照先（_risk-severity.md / review-policy.json / commit-review.ts / _trigger-pr.md）の実在確認済み
- 「経過観察」「全エージェントが」の残存参照なし

### 変更せず維持
- qa-report-format.md（@evaluator 用 HIGH/MEDIUM/LOW）は変更しない（ゲートと独立・以前の決定）
- TUI 色問題は「修正しない」決定維持

## commit-review スキップ通知化（残存観察2・2026-09-07 実施・未コミット）

### 決定（ユーザー確認）
- 残存観察1（【残存確認】の severity 固定）は**修正しない**。残存観察2のみ修正
- 残存観察2は「案A 恒久ブロック」ではなく**「案B 通知して継続」**を採用:
  - 恒久ブロックは初心者をセットアップ失敗と区別できないデッドロックに陥れる（最悪）
  - 通知（毎コミット・AI + 人間トースト）があれば穴を気づかせつつ回復へ導ける
  - ハーネス哲学（destructive-op-guard の「復元可能な操作はブロックしない・ヒューマンインザループ」）と整合
  - 秘密の決定論的保護（pre-commit / secrets-guard）は別レイヤーで残るためトータルの穴は限定的

### 変更内容（従来の `if (!reviewerMd) return` による無音スキップを改めた）
- **通知**: 審査エージェント定義（code-reviewer.md / security-auditor.md）欠落時は、恒久ブロックせず
  AI へのプロンプト + トーストで「スキップした」と毎コミット通知（notifySkipped ヘルパー新設）
- **穴の最小化**: code-reviewer.md が無くても security-auditor は可能なら継続実行（従来はレビュー放棄で
  監査ごと中止していた）。skipNotices はブロック/通過の両方の最終メッセージにも前置される
- 両方が欠落しレビュー結果が空のときも、通知してから return

### 対象ファイル
- `opencode/snippets/.opencode/plugins/commit-review.ts`: 上記改修 + notifySkipped 追加
- `opencode/snippets/.opencode/plugins/README.md`: 保護される/されないケース表に「審査エージェント定義欠落」行を追加
- `opencode/principles/harness-engineering.md`: commit-review 節に「欠落時は恒久ブロックせず通知で回復」を追記
- `.design-notes/session-context.md`: 本ファイル更新

### 検証
- typecheck: `bunx --bun tsc --noEmit --strict --skipLibCheck --types bun plugins/commit-review.ts` → TSC_EXIT=0
- 単体テスト 29 pass / 0 fail（61 expect）— 回帰なし

## ファイル参照のバッククォート＋展開後フルパス統一（2026-08-15 実施・未コミット）

### 監査
- 監査結果: principles/ 96件・architectures/ 48件・instructions/ 88件・agents-plugins-skills 177件の裸ファイル参照を検出
- 展開マッピングは setup-harness.sh から確認: `principles/`→`.opencode/standards/principles/`、`architectures/`→`.opencode/standards/architectures/`、`instructions/_fill-guide.md`→`.opencode/instructions/agents-fill-guide.md`、`skills/`→`.opencode/skills/`、`secret-patterns.json`/`skills.lock.yaml`→`.opencode/config/`、`plugins/*.ts`→`.opencode/plugins/`、`subagents/*.md`→`.opencode/agents/`

### 方針（ユーザー確認済み）
- 影響度順（Phase 1〜5）に優先修正・最終目標は全件
- パス形式: ハーネス展開後フルパスで統一
- ルート配置ファイル（`AGENTS.md` / `ARCHITECTURE.md` / `DESIGN.md` / `opencode.json`）はベース名のままバッククォートのみ付与
- 対象外: コードフェンス内 / TS 実行用引数（`Bun.file()` 等）/ JSON 値（opencode.json.template の instructions 配列）/ Design Token 参照値（`{primitive.shadow.md}`）/ ユーザー固有サンプル（`src/services/*`）
- TS テンプレートリテラル内のバッククォートは `\`` エスケープが必要
- 検証スキャナ: コードフェンス除去 + バッククォート区間除去後に `(?<![\w./-])([\w./-]+\.(?:md|json|ts|...))(?![\w.-])` で走査（URL 除外）

### 変更（86ファイル・+562/-562）
- Phase 1: `snippets/.opencode/instructions/` 41ファイル（perl 一括 + 個別修正）+ `plugins/*.ts` 9本 + `agents/AGENTS.md`。検証 OUT=0
- Phase 2: `snippets/ARCHITECTURE.md.template` + `DESIGN.md.template`
- Phase 3: `principles/` 全24ファイル（88件、design-contract 23件・harness-engineering 12件が上位）
- Phase 4: `architectures/` 全13ファイル（27件、web-frontend-large 7件・mobile 5件が上位。_how-to-choose.md は違反0）
- Phase 5: `skills/`（release-prep・handoff・live-operation）+ `agents/subagents/` + `docs/*.template` + `design/token-ssot.json.template` + `plugins/README.md` + `usage/` + `project-context`/`coding-conventions`/`.gitignore` テンプレート
- 主なフルパス化: `token-ssot.json`→`design/`・`component-map.json`→`design/`・`stack-setup.md`→`.opencode/instructions/`・`network-resilience.md` 等→`.opencode/standards/principles/`・`mobile.md` 等→`.opencode/standards/architectures/`・`web-frontend-large.md`→`.opencode/standards/architectures/`・`handoff-artifact.md`→`.opencode/`・`skills.lock.yaml`/`secret-patterns.json`→`.opencode/config/`・plugin `.ts`→`.opencode/plugins/`・`tasks.json`/`spec.md`/`project-definition.md`→`docs/`・`release-prep/SKILL.md`→`.opencode/skills/release-prep/SKILL.md`
- `plugins/README.md` は一部 plugins/*.ts を自身が配置される `.opencode/plugins/` 配下としてフルパス化

### 最終検証
- 全対象（snippets/・principles/・architectures/）を再走査し、フェンス外の裸ファイル参照 0 件
- 残存8件は全員対象外: opencode.json.template の JSON 値6件・Design Token 参照値1件・検索クエリ例示1件（production-readiness.md:232 の `[`ARCHITECTURE.md` の...]` はバッククォート境界内）
- 注意: `opencode/snippets/.opencode/node_modules/` がローカルに存在（git 未追跡・.gitignore 除外）. 配布混入リスクはなし

## API 準拠キャスト除去 + session.deleted バグ修正（2026-08-14 実施）

### 変更ファイル（未コミット）
- `opencode/snippets/.opencode/plugins/rule-injector.ts` / `secrets-guard.ts` / `working-dir-guide.ts` / `env-check.ts` / `arch-diag.ts` / `adr-prompt.ts` / `harness-health.ts` / `task-archive.ts`: 不要な `(input as any).sessionID` / `(ev as any).properties?.sessionID` / `(input.args as any)` キャストを除去し、実型（`input.sessionID` / `ev.properties.sessionID` / `input.args`）に置換
- `opencode/snippets/.opencode/plugins/commit-review.ts`: `(child as any).data.id` → `child.data?.id`、`(resp as any).data?.parts || (resp as any).parts` → `resp.data?.parts || []`、`(diffResult as any).text()` → `diffResult.text()`。`client` 引数を `any` → `OpencodeClient`（`@opencode-ai/sdk/client`）に型付け
- `opencode/snippets/.opencode/plugins/lockfile-record.ts`: `(output as any)?.exitCode` は `tool.execute.after` の output 型に exitCode が無いため**必要なキャストとして維持**（唯一の残存 `as any`）
- `opencode/snippets/.opencode/plugins/README.md`: `tool.execute.before`/`after` の引数型を実型（`{tool, sessionID, callID}` / `{tool, sessionID, callID, args}`）に修正。`event` セクションに `session.deleted` は `properties.info.id`（`properties` は `{ info: Session }` で sessionID を持たない）の注記を追加

### session.deleted のバグ修正（今回の主目的の1つ）
- **バグ**: `EventSessionDeleted` の properties は `{ info: Session }`（types.gen.d.ts:505-510）。旧実装は `(ev as any).properties?.sessionID` を参照しており、常に `undefined` → session.deleted 分岐のクリーンアップが**実質発火していなかった**
- **修正**: `ev.properties.info.id` に変更（rule-injector / working-dir-guide / env-check / arch-diag / adr-prompt の5 Plugin）

### 検証
- typecheck: `bunx --bun tsc --noEmit --strict --skipLibCheck --types bun plugins/*.ts` エラーゼロ
- テストハーネス（archdiag-test）で全 PASS（41+12+13=66件）。test-plugins-consistency.ts の session.deleted フィクスチャを `properties.sessionID` → `properties.info.id` に修正（実型と整合）

### 判断基準（ユーザーと確認済みの監査結論から）
- `AGENTS.md` の `instructions[]` 明記は維持（opencode ソース `instruction.ts` の `systemPaths()` が `Set<string>` で絶対パス管理 → 二重ロードされない）
- lockfile-record の exitCode キャストは API 型の制約上必要（output 型に exitCode フィールドがない）

## `.opencode/instructions/code-quality.md` 常時化（2026-08-14 実施）

### 変更ファイル
- `opencode/snippets/opencode.json.template`: `instructions[]` に `.opencode/instructions/code-quality.md` を追加（**6ファイル構成**）
- `opencode/snippets/.opencode/instructions/code-quality.md`: 先頭を「コードファイル編集時に Plugin が注入する」→「セッション開始時に常時読み込まれる」に修正。品質6軸・劣化サイン・自律トリガーがセッション開始時点で文脈に存在する
- `opencode/snippets/.opencode/plugins/rule-injector.ts`: RULES から `code-quality` エントリを削除（常時化により noReply 通知が冗長）。`CODE_FILE_PATTERN` は規約ゲートで引き続き使用
- `opencode/snippets/.opencode/plugins/README.md`: 作用フロー（6ファイル記載）・検出テーブル（code-quality 行削除）・BLOCK 詳細・初期状態（6ファイル）を更新
- `opencode/snippets/ARCHITECTURE.md.template`: コード品質セクションに「ベースルール：`.opencode/instructions/code-quality.md`（常時読込）に従う」を追加（naming 常時化時の命名規則セクションと同型）。重複していた「詳細は principles」行を削除
- `opencode/snippets/.opencode/instructions/code-quality.md`: principle 参照（code-quality / cognitive-load-design / file-size-and-cohesion / tdd-with-ai）は維持

### 判断基準（ユーザーと確認済み）
- `.opencode/instructions/code-quality.md` 常時化の目的: **コードを書く前段階（思考段階）から品質6軸・分割統合の基準を考慮**できるようにする。プラグインはコード編集イベントでしか注入できず、設計・計画段階の品質判断が未保護だった
- `.opencode/instructions/code-quality.md` は「入り口の instruction」。詳細は principles/ を **必要時に自律的に読みに行く**（naming 常時化と同じ設計パターン）
- **`.opencode/coding-conventions.md` は常時化しない**: プロジェクト固有にカスタマイズされるファイル（7.4KB+）で、既に初回書き込みハードゲートで読了100%保証済み。常時化は文脈圧迫のリスクがメリットを上回る
- principles（file-size-and-cohesion / cognitive-load-design / code-quality）は on-demand 維持。約20KB の常時化は文脈圧迫

### テスト
- `test-plugins-consistency.ts`: **41件**（code-quality 常時化チェック4件追加: opencode.json に含まれる / 先頭に常時読込注記 / principle 参照維持 / rule-injector RULES から除外）
- `test-rule-injector.ts`: 12件（テスト6のバッチ化検証を security+network-resilience 同時該当に修正）
- 全テスト PASS（計66件: 12+41+13）

### v1120test 反映
- `opencode/setup-harness.sh` 再実行（YORI_HAS_UI=n / QUALITY_STRATEGY=1 / USAGE_GIT=1）
- `.opencode/instructions/code-quality.md` / `rule-injector.ts` / `plugins/README.md` が yori 最新と SAME
- `opencode.json`: 上書き保護のため手動で `.opencode/instructions/code-quality.md` 追記（6ファイル構成）
- `ARCHITECTURE.md`: コード品質セクションに「ベースルール：`.opencode/instructions/code-quality.md`（常時読込）」を手動追記（参照先2ファイル実在確認）
- STALE_REF = 0 / 参照先全パス実在

### 常時化ファイル間参照の「（常時読込）」注記付与（2026-08-14 追記）
- **背景（公式ドキュメント調査）**: OpenCode のコンパクションは**会話履歴のみ**を対象とする。instructions（常時化ファイル）はシステムプロンプトとしてリクエスト組み立て時に毎回導出され、コンパクション後も残る。コンパクション自体はソース再読をしない（「Compaction advances the instruction epoch」節）。→ 常時化ファイルへの参照で Read を呼ぶと**本当の冗長読込**になる
- 前回の分析「コンパクション後の再読は自己回復」は不正確 → 訂正。注記が再読防止の有効防御
- **修正**:
  - `agents/AGENTS.md:22`: `cli-first.md` → `cli-first.md`（常時読込）
  - `.opencode/instructions/naming-conventions.md`: `ARCHITECTURE.md` 参照5箇所（15/74/101/103/113/120）に「（常時読込）」付与
- `.opencode/instructions/code-quality.md` 内の参照は全て非常時化 principles（正当な on-demand）なので注記不要
- v1120test: `.opencode/instructions/naming-conventions.md` は setup で自動反映（SAME 確認）。`AGENTS.md` はプロジェクト固有版で cli-first 参照がないため手動編集不要
- 全テスト PASS（66件: 12+41+13）

## ステージ済みの変更
- `opencode/snippets/opencode.json.template`: `instructions[]` に `.opencode/instructions/naming-conventions.md` を追加（常時読込化。5ファイル構成）
- `opencode/snippets/.opencode/instructions/naming-conventions.md`: 「優先チェーン（ARCHITECTURE(SSOT) > coding-conventions > 本ファイル > フレームワーク規約）」+「自己充足的コア表（ケーススタイル・ディレクトリ名・ファイル名・テストファイル命名規則）」を追加し、自律トリガー・常駐禁止事項をコア表参照に書き換え（1.8KB→6.2KB）
- `opencode/principles/naming-conventions.md`: コア表（ケーススタイル一覧・ディレクトリ名・ファイル名・テストファイル命名規則）を instruction へ移動し、冒頭に「コア表は instructions が SSOT」注記。判断フローを4段階に更新。Step 1 の「このファイルの冒頭のケーススタイル一覧」参照を instruction 参照に修正
- `opencode/snippets/ARCHITECTURE.md.template`: 命名規則セクションのベースルール参照を `.opencode/instructions/naming-conventions.md`（常時読込）に変更
- `opencode/snippets/.opencode/plugins/rule-injector.ts`:
  - リトライバイパス修正: `conventionsOffered` を「全規約読了済み」の意味に変更。未読のまま再試行しても再ブロック
  - 規約ゲート対象を directory-structure / coding-conventions の2ファイルに変更（naming は常時読込のため除外）
  - `TEST_FILE_PATTERN` を定数化し tdd-cycle ルールと共有
  - tdd-cycle ハードゲート追加（テストファイル write/edit 時、未読なら throw）
  - bash `mkdir` 検知ゲート追加（directory-structure 未読なら throw）
  - 既存 RULES 注入の noReply をバッチ化（複数該当時は1回の prompt に列挙）
  - `resetAfterCompaction` に `conventionsOffered=false` / `conventionsRead.clear()` を追加（コンパクション後は単発ハードゲート再起動）
- `opencode/snippets/.opencode/plugins/README.md`: rule-injector 詳細（作用フロー・検出ルール表・BLOCK 詳細・初期状態）を新設計に更新
- `opencode/principles/naming-conventions.md`: 「このファイルの使い方」の判断フローを優先チェーンと整合（言語別(2) → 基本コア表(3) → 確定手順(4)）に並び替え。**コア表は principle → instruction へ移設**
- `opencode/snippets/.opencode/instructions/stack-setup/_step-35.md`: 「命名規則の確定手順」参照を `.opencode/standards/principles/naming-conventions.md` に明確化
- `opencode/snippets/.opencode/instructions/naming-conventions.md`: 優先チェーン表の「3 までで決まらない場合」＋行3の確定手順参照パス明記。**コア表（ケーススタイル・ディレクトリ名・ファイル名・テストファイル命名規則）が SSOT として移設**
- `.design-notes/session-context.md`: 本ファイル更新

## 未解決の課題
- 検証用プロジェクト（v1120test 等）の `opencode.json` は上書き保護（戦略 A）のため、`.opencode/instructions/naming-conventions.md` / `.opencode/instructions/code-quality.md` の常時化が自動反映されない。opencode.json に手動追加が必要（v1120test は反映済み）。プロジェクト固有の編集を尊重するため自動変更しない
- touch / 非 mkdir によるファイル作成はゲート対象外のまま（ユーザー確認済み・現状維持）

## 質疑監査（2026-08-14 追記）
- **Q1（常時読込注記の要否）**: **残す判断**。`.opencode/instructions/code-quality.md` の「このルールはセッション開始時に常時読み込まれる。」は必要。ただし根拠は「naming と同型」ではなく独立判断:
  - 事実: ルール系の常時読込ファイルは全て「常時有効宣言」を持つ（`.opencode/instructions/cli-first.md`「全セッション・全フェーズで有効」/ naming「常時読み込まれる」/ `.opencode/instructions/code-quality.md` 同文）。`AGENTS.md`（最上位SSOT）と `ARCHITECTURE.md`（書かれる対象）は宣言を持たないのが一貫
  - 機能: `AGENTS.md`:8 が「instructions は Plugin がイベント駆動で注入する」と宣言しているため、常時読込ルールが「セッション開始時から有効である」ことの適用タイミング明示が必要。この情報は opencode.json（AIの文脈外）にしか存在せず、ファイル自身の宣言でのみ文脈内で完結 → 真の重複ではない
  - 「無ければ正しく判断できない」は不正確。正しくは「適用タイミングの誤認防止・文書契約」
- **Q2（`ARCHITECTURE.md.template` の「詳細・深掘りは principles を参照」行）**: **冗長と判断し削除（ユーザー承認済み 2026-08-14）**
  - 根拠: `.opencode/instructions/code-quality.md`:5-8（常時読込）冒頭に同一導線が既にあり、`ARCHITECTURE.md` も常時読込なので AI の文脈内で同じ情報が既に成立。再掲しても到達手段は増えない
  - 残したのは「ベースルール：`.opencode/instructions/code-quality.md`（常時読込）に従う。」のみ（適用タイミングの明示として独自機能を持つため）
  - naming セクション（同型）も同時に削除し整合性を確保: `ARCHITECTURE.md.template` 409行（naming）/496行（code-quality）→ 両「詳細・深掘り」行を削除
  - v1120test `ARCHITECTURE.md`（102-103 / 178-179行）にも手動反映（上書き保護のため）
  - 全66テスト PASS を確認（この行へのテスト依存なし）
- **Q3（監査で検出・修正）**:
  1. `.opencode/instructions/code-review.md`:18: `instructions/naming-conventions.md`（相対パス・注記なし）→ `.opencode/instructions/naming-conventions.md`（常時読込）に完全一致形へ修正。設置場所が reference 側のためテスト対象外ではあるがパス表記不統一を解消
  2. `AGENTS.md:117`: `ARCHITECTURE.md` に（常時読込）注記を付与（セッション開始時の確認は注入済み内容の参照なので注記が有効）。v1120test `AGENTS.md`:49 にも手動反映
  3. `AGENTS.md`:117 以外は `ARCHITECTURE.md` 参照は「編集対象」または「0-* 初期セットアップ」中のものであり、注記追加は不要と判断（編集時は Read が正当、初期セットアップはテンプレート全文の refile が目的）
- v1120test: `.opencode/instructions/code-review.md` は setup 再実行で自動反映（SAME 確認済み）、`AGENTS.md` と `ARCHITECTURE.md` はプロジェクト固有版のため手動反映

## 質疑調査（2026-09-06〜09-07・Q&A 3ラウンドの回答確定）

### Q1: security-auditor-invocation.md は使われなくなったのか
- **現役**。`opencode/snippets/agents/_shared/security-auditor-invocation.md` は setup-harness.sh L237-246 で `.opencode/agents/_shared/` へ配布され、送信側 `_web-search.md:50`・受信側 `security-auditor.md:58` が参照。CVE検索→監査依頼フロー用で、commit-review の依存監査添付とはトリガーが別

### Q2: review-log.md の書式は定まっているか
- 書式は code 固定。`findingToRecord`（commit-review.ts L265-272）が統一シリアライズ、`HIST_ENTRY_RE`（L87）がパース。エージェントが直接書かず、プラグインがパース→再出力するため語彙分岐は起きない
- 蓄積は「追記」でなく**上書き更新**: 各コミット判定で `## <ISO> commit-review` セクション追加 + 既存未解決をその場「解消済み」化。git 管理下で単調成長、ローテーションなし（長期的肥大が残存リスクとして記録済み）

### Q3: subagents.md の配役一意化記述で二重実行は防げるのか
- 文書上の記述は不変条件であり機械的防御ではない。実際の防御は **task ツール拒否**（`permission: "*": deny`）。README の「サブエージェント同士の委譲は行わない」は権限設定で担保
- OpenCode 公式では Task ツール + `permission.task` で制御。エンジンはサブエージェント生成を primary に限定しておらず、**task 許可があればサブ→サブ委譲は技術可能**
- 旧ハーネスに委譲指示（code-reviewer.md:28「HIGH以下は @security-auditor に委ねる」）は存在したが、**実際の二重実行は実行ログで観測していない**（構造診断による指摘）。改修で委譲行は削除済み

### Q4: TUI で build⇔plan の色が変わらない問題
- **OpenCode のバグではなく仕様**。ソース解析で確定:
  - `packages/tui/src/context/local.tsx:119-131`: エージェント色はパレット `[secondary, accent, success, warning, primary, error, info]`（7色）から「全可視エージェント一覧の並び順×7の剰余」で自動割当。`agent.color` 未指定時のフォールバック
  - `packages/opencode/src/agent/agent.ts:316-326`: 一覧は「build(既定)を先頭、あとは名前昇順」でソート
  - ninteichosa = build + 9サブ + general/plan/explore → **plan が 7 枠後ろに循環し build と同じ色**。素のプロジェクトでは plan=3番目=warning で色が変わる
- 修正方法: `opencode.json` で `"agent": { "build": {"color": "primary"}, "plan": {"color": "accent"} }` を明示指定（エージェント数非依存）。**修正は行わない決定**（調査のみで終了）
- グローバル設定（`~/.config/opencode/opencode.json`=mcp open-design のみ / `opencode.jsonc`=$schema のみ）・ninteichosa の opencode.json（instructions のみ）とも色指定なし → フォールバック発動

### Q5: 監査系サブエージェントの役割は明確に分離しているか
- 役割表（9体）: security-designer=実装前設計 / code-reviewer=実装後一般+ブロッククラス / security-auditor=認証・機密実装後・全severity / code-quality-auditor=月次品質6軸 WARN / resilience-checker=月次・リリース前可用性 / codebase-investigator=調査 / test-generator=TDD / planner=タスク計画 / evaluator=スプリントQA
- 「完全独立ではなく、実装後コード監査グループ（reviewer/auditor/quality-auditor/resilience-checker）の観点境界には曖昧さあり」と正直に回答。**コミットゲート内は reviewer + auditor の2体限定**にしたことで構造課題は解消済み
- 全エージェントの明確なマトリクス明文化は「対応不要」決定

### Q6: 改修はテストプロジェクトの問題を解消するか
- ハーネス**再配布しない限り現状は旧挙動のまま**（ninteichosa の commit-review.ts は改修前の複製）。setup-harness.sh 再実行で plugins (L356-359) / subagents (L229-234) / _shared (L238-243) は常時上書き、config (L367-375) は `if [ ! -f ]` の新規のみ → review-policy.json は新規作成される。**色問題は別要因なので改修では直らない**

### Q7: review-policy.json は harness-file-strategy.md に則っているか（追加調査①）
- 則っている。`.opencode/config/` 節（L209-215）に review-policy.json を明記済み。戦略 A（上書き保護・`if [ ! -f ]` で新規コピーのみ・L371-372、glob は `*.json *.yaml *.yml`）で配布される
- 軽微な不整合1点: ドキュメントは「A+E（yori_version のみ sed 更新）」と書くが、sed（L395-410）は **skills.lock.yaml のみ**を対象にする実装。review-policy.json には yori_version フィールドが無いため E は no-op（スキーマを持たない SSoT）。**2026-09-07 に harness-file-strategy.md を行分割して解消済み**（skills.lock.yaml=A+E / secret-patterns.json・review-policy.json=A）。機能影響はゼロ（E が効くべきファイルにのみ E が効いていた）
- 既存プロジェクト再実行時は: plugins/subagents/_shared/instructions は常時上書き（改修版が届く）、config は A（既存保護・新規のみ追加）、削除は発生しない

### Q8: Plugin は OpenCode 公式に準拠しているか（追加調査②）
- **準拠**。yori 側 dev 型定義 1.15.13 と ninteichosa ランタイム 1.17.13 の両方で照合:
  - `Plugin: (input: PluginInput, options?) => Promise<Hooks>`、`PluginInput` に `worktree: string`（両バージョン同型）
  - `"tool.execute.before"?: (input: {tool, sessionID, callID}, output: {args}) => Promise<void>`（commit-review.ts は `input.tool==="bash"`・`input.sessionID`・`output.args?.command` を使用、throw によるブロックは公式 env-protection 例と同パターン）
  - SDK: `client.session.create` / `session.prompt`（`body.noReply`）/ `tui.showToast` が 1.17.13 の sdk.gen.d.ts L364 / types.gen.d.ts L2252・L2337 に存在、1.15.13 でも typecheck PASS
  - 配置は `.opencode/plugins/`（公式の自動ロード対象）
- 付記: yori 側 `@opencode-ai/plugin` は devDependency `"latest"`（現インストール 1.15.13）。ランタイム 1.17.13 と使用面で互換を確認済みだが、`"latest"` のためインストール時期で型定義がドリフトしうる（軽微な開発衛生面の留意点）

## 次のセッションでやること
- commit-review 改修（2026-09-06）+ 5件README 監査修正 C1〜C7（2026-09-07）のコミット可否を人間に確認する（commit/push は人間の指示があるまで実行しない）
- 既存プロジェクト（nintei-chosa-form-assistant 等）へのハーネス再配布可否を確認（対象プロジェクトからの指示時のみ・自動で手を加えない）。再実行で改修版 commit-review.ts / code-reviewer.md / security-auditor.md が上書き配布され、review-policy.json が新規作成される
- TUI 色修正は「しない」決定済み（必要なら opencode.json の agent.color 明示指定が解）
- 実機での軽量E2E（ノイズ入り初回 diff → 警告通過 / エビデンス付き HIGH → ブロック → 修正 → 履歴で再計上なし → 通過）は opencode 経由時のみ実施可能。要望があれば次回
- 前回 nline の変更（ファイル参照バッククォート＋フルパス統一 86ファイル / naming・code-quality 常時化 / API キャスト除去）のコミット可否も未確認のまま残っている

## 検証メモ（2026-08-13）
- テストハーネス: `/var/folders/2r/4xmj5zsd5736vnnwzp3gj1x40000gn/T/opencode/archdiag-test/`
  - `test-arch-diag.ts` 13件 / `test-rule-injector.ts` 12件（新規9件: リトライバイパス・読了後パス・tdd ゲート・mkdir ゲート・バッチ化・コンパクション再起動）/ `test-template.ts` 1件 / `test-plugins-consistency.ts` **36件**（新規9件: 常時化整合性 + 優先チェーンの並び順回帰2件） PASS（計62件）
- 全 Plugin typecheck: `bunx --bun tsc --noEmit --strict --skipLibCheck --types bun plugins/*.ts` でエラーゼロ
- 新規配布検証: 一時ディレクトリで setup-harness.sh 実行 → `opencode.json` に `naming-conventions.md` が含まれ、`.opencode/instructions/naming-conventions.md`・`.opencode/standards/principles/naming-conventions.md`・`.opencode/instructions/stack-setup/_step-35.md` が最新配布されることを確認。STALE_REF チェック（principles 旧参照）0件
- tdd/mkdir ゲートは設計メモの `tddGateFired` / `mkdirGateFired` フラグ方式ではなく readByAI / conventionsRead ベースで実装（未読の限り再ブロック）。リトライバイパス修正の原則と一貫し、コンパクションリセットで再武装される
- 事後レビュー（2026-08-13）で修正した参照不整合:
  1. instruction 優先チェーン表の内部矛盾（コア表4th と言語別優先注記）→ 言語別・フレームワーク(3) > コア表(4) に統一
  2. principle「使い方」フロー（コア表2nd → 言語別3rd）が優先チェーンと逆順 → 言語別(2) → 基本コア表(3) → 確定手順(4) に揃えた
  3. `_step-35.md:15` の `naming-conventions.md` 曖昧参照 → `.opencode/standards/principles/naming-conventions.md` を明記。principle「確定手順」ヘッダも `_step-35.md` を明記
  4. instruction:92 の「principle の」曖昧参照 → フルパス化