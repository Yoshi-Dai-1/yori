# Plugins

OpenCode Plugin は TypeScript + Bun ランタイムで動作するイベント駆動型の自動実行仕組み。
`AGENTS.md` への言語指示と異なり、エージェントの意思に関わらず自動実行される。

## ファイル一覧

| Plugin | イベント | 目的 |
|--------|----------|------|
| `secrets-guard.ts` | `tool.execute.before` | 機密ファイル・パターンの書き込み防止（P1-1 修正：SSoT 化） |
| `tasks-guard.ts` | `tool.execute.before` | `docs/tasks.json` passes 保護 |
| `lint-and-typecheck.ts` | `tool.execute.after` | ファイル編集後の lint・format・typecheck・単一テスト自動実行（P1-2 修正：性能改善） |
| `doc-links.ts` | `tool.execute.after` | ドキュメントリンクの整合性チェック（P1-3 修正：AI 通知パターン。multiedit 対応） |
| `adr-prompt.ts` | `tool.execute.after` + noReply / `experimental.session.compacting` / `event` | Write/Edit 3回検出 → ADR 記録を促す（per-session 化・コンパクションリセット） |
| `arch-diag.ts` | `tool.execute.after` / `experimental.session.compacting` / `event` | アーキテクチャ変更検知・スキル診断推奨（記入中抑制・変更検知・ENF セッション内1回） |
| `skill-tracker.ts` | `tool.execute.after` | スキル使用履歴の記録 |
| `lockfile-record.ts` | `tool.execute.after` | 外部スキルインストール検出・`.opencode/config/skills.lock.yaml` への自動記録 |
| `harness-health.ts` | `tool.execute.after` / `event` | Context Anxiety 兆候の検知（P0-3 per-session sliding window + TTL cleanup、multiedit 対応。pass 率は `event` 内で `session.idle` を購読） |
| `task-archive.ts` | `event` | 作業ディレクトリの自動アーカイブ提案（全タスク完了時。`event` 内で `session.idle` を購読） |
| `working-dir-guide.ts` | `tool.execute.before` / `experimental.session.compacting` / `event` | `docs/working/` ファイル Read/Write/Edit 検知時のルール注入 |
| `evaluator-tools.ts` | `tool`（カスタムツール） | `evaluator-passed` / `evaluator-failed` ツール定義 |
| `compaction-context.ts` | `experimental.session.compacting` | コンパクション時に作業ディレクトリの状態を維持 |
| `env-check.ts` | `tool.execute.before` / `experimental.session.compacting` / `event` | Python/Node.js 環境パス自動書き換え + `.nvmrc` 不一致警告（セッション内1回） |
| `rule-injector.ts` | `tool.execute.before` / `experimental.session.compacting` / `event` | ファイル種別・内容に応じてルールファイルの参照を注入（`AGENTS.md` 肥大化防止。規約未読ブロック・mkdir ゲート・tdd ハードゲート付き） |
| `destructive-op-guard.ts` | `tool.execute.before` | 破壊的Git操作（reset --hard / rebase / push --force / rm -rf 等）のブロック |
| `commit-review.ts` | `tool.execute.before` | git commit 検出 → 子セッションで @code-reviewer + @security-auditor を並列実行 → 問題あり・監査タイムアウト・両監査とも無言のときはブロック（fail-closed） |

## イベントの種類

**`tool.execute.before`**: ツール実行前に発火。エラーを投げるとツール実行をブロックする。
- 引数: `(input: { tool: string, sessionID: string, callID: string }, output: { args: any })`
- ブロック: `throw new Error("message")`

**`tool.execute.after`**: ツール実行後に発火。ブロック不可（サイドエフェクトのみ）。
- 引数: `(input: { tool: string, sessionID: string, callID: string, args: any }, output: { title: string, output: string, metadata: any })`
- ログ: `client.app.log({ body: { service, level, message } })`

**`session.idle`（`event` 経由で購読）**: セッションがアイドル状態（AI 応答完了）に遷移したときに発火。
- 引数: フック名としての `session.idle` はスキーマ未宣言のため、`event` フック内で `event.type === "session.idle"` をフィルタして購読する。`sessionID` は `event.properties.sessionID` から取得
- 用途: Context Anxiety 検知（`.opencode/plugins/harness-health.ts`）・アーカイブ提案（`.opencode/plugins/task-archive.ts`）・セキュリティレビュー催促（`.opencode/plugins/rule-injector.ts`）

**`experimental.session.compacting`**: セッションコンパクション開始時に発火。
- 引数: `(input: { sessionID: string }, output: { context: string[]; prompt?: string })`
- 用途: コンパクション時の文脈注入（`.opencode/plugins/compaction-context.ts`）。`.opencode/plugins/arch-diag.ts` / `.opencode/plugins/rule-injector.ts` / `.opencode/plugins/adr-prompt.ts` / `.opencode/plugins/working-dir-guide.ts` / `.opencode/plugins/env-check.ts` はこれを利用して per-session フラグをリセットする（実験的API。将来変更される可能性あり）
- 安定APIフォールバック: `event` フックで `session.compacted` イベント（`properties.sessionID`）を検知してもリセットする

**`event`**: 全サーバーイベントの購読フック。
- 引数: `(input: { event: Event })`（`Event` は `@opencode-ai/sdk` のイベントユニオン）
- 用途: 型付きフックを持たないイベント（`session.compacted` / `session.idle` / `session.deleted` など）を購読する汎用フック。`session.deleted` で各 Plugin は per-session 状態を破棄する（メモリリーク防止）
- イベント固有のプロパティ: `session.idle` / `session.compacted` は `event.properties.sessionID`、`session.deleted` は `event.properties.info.id` から取得する（`session.deleted` の `properties` は `{ info: Session }` で、`sessionID` を持たない）

## セットアップ

`setup-harness.sh` が自動でファイルをコピーする。
手動で有効化する場合は `.opencode/plugins/` に .ts ファイルを配置するだけでよい。
`opencode.json` への登録は不要（auto-loading）。

依存関係のインストール：
```bash
cd .opencode
bun install
```

### 型チェック（開発時）

Plugin は TS で書かれている。`@types/bun`（Bun グローバルと `Bun.$`）・`@opencode-ai/plugin`（Hooks 型）を devDependencies に含め、以下で全 Plugin を検査できる：

```bash
cd .opencode
for f in plugins/*.ts; do bunx --bun tsc --noEmit --strict --skipLibCheck --types bun "$f"; done
```

`--types bun` を付けないと `Bun` グローバルが解決できない（ファイル直指定時は自動 include が効かないため）。

## `lint-and-typecheck.ts` 詳細

### カバレッジ

| 言語 | フォーマッター | リンター | 型チェッカー | テスト自動実行 |
|------|--------------|---------|------------|--------------|
| TypeScript / JavaScript | `prettier --write` | `(pm) run lint` | `(pm) run typecheck` | `(pm) run test -- ${targetFp}` |
| Python | `ruff format` | `ruff check` | `mypy --follow-imports=silent --no-incremental ${fp}`（P1-2 修正：ファイル単位） | `.venv/bin/pytest ${testFp} -v --tb=short` |
| Go | `gofmt -w` | `go vet` | — (go vet が統合) | — |
| Rust | `rustfmt` | `cargo clippy --quiet` | — (cargo が統合) | — |
| Ruby | `rubocop --autocorrect-all` | `rubocop` | — (rubocop が統合) | `rspec ${specFp} --format=progress` / `ruby -I. ${testFp}` |
| Kotlin | `ktlint -F` | `ktlint` | — | — |
| Swift | `swift-format --in-place` | `swiftlint` | — | — |
| C/C++ | `clang-format -i` | — (clang-tidy は CI で) | — | — |
| C# | `dotnet format` | `dotnet format --verify` | — (dotnet build が統合) | — |
| Java | — (スキップ) | — (スキップ) | — (スキップ) | — |
| PHP | — (スキップ) | — (スキップ) | — (スキップ) | — |

### テスト自動実行

`lint-and-typecheck.ts` は format/lint/typecheck に加えて、編集ファイルに対応する単一テストファイルを自動実行する。

**対応言語とテストファイル検出パターン：**

| 言語 | 検出パターン（優先順） | 実行コマンド |
|------|---------------------|-------------|
| JS/TS | `<file>.test.<ext>` → `<file>.spec.<ext>`（8種の拡張子: ts/tsx/js/jsx/mts/cts/mjs/cjs） | `(pm) run test -- ${targetFp}` |
| Python | `test_<base>.py` → `<base>_test.py` → `<base>.test.py` | `.venv/bin/pytest ${fp} -v --tb=short` |
| Ruby | `<base>_spec.rb` → RSpec / `<base>_test.rb` → Minitest | `bundle exec rspec` / `bundle exec ruby -I.`（Gemfile.lock がなければ bare） |

**制約：**
- 単一ファイルのみ実行。フルスイートは実行しない（パフォーマンス理由）
- Go / Rust / Kotlin / Swift / C/C++ / C# / Java / PHP はテスト実行なし（プロジェクト固有のビルドシステムに委ねる）
- 各テスト実行は `timeout 60` で強制終了
- ツール不在時（例：`.venv/bin/pytest` が存在しない）はサイレントスキップ

**Java/PHP をスキップする理由：**
Java/PHP には lint-and-typecheck の全言語に共通して採用している「`which` で検出して即座に実行できる高速CLIツール」が標準化されていない。代わりにビルドツール（Maven/Gradle/Composer）経由の品質チェックが必要なため、Plugin 層ではなく `.opencode/instructions/stack-setup.md` 層でプロジェクト固有対応として案内する。

### 動作の流れ

1. ファイル編集後、拡張子で言語を判定
2. ツールのインストール場所をプロジェクトローカル優先で自動検出（`node_modules/.bin/` / `.venv/bin/` / `bundle exec` → `which` の順）
3. 見つかったツールだけを実行する（見つからないツールはサイレントスキップ）。実行順は format → lint → typecheck → test
4. テスト自動実行は条件付き：
   - 対応するテストファイル（JS/TS: `.test.*` / `.spec.*`、Python: `test_*.py` / `*_test.py` / `*.test.py`、Ruby: `*_spec.rb` / `*_test.rb`）が存在する場合のみ実行
   - タイムアウト60秒。失敗時は先頭4000文字を収集
   - ツール不在時はサイレントスキップ（JS/TS: pm の test script、Python: `.venv/bin/pytest`、Ruby: `bundle exec` 経由 or bare）
5. 結果に応じて通知（人間向け Toast + コード対象の場合は AI への noReply 注入）：
   - 🟢 `all checks passed` — すべてのツールが正常終了（Toast のみ）
   - 🟡 `no tools found for [lang]` — 1つもツールが見つからなかった。Toast とともに AI に「`.opencode/instructions/stack-setup.md` でインストール」を通知して促す（`lang` が特定できた場合のみ）
   - 🔴 `${N} check(s) failed` — エラーあり。Toast とともに AI に修正対象を通知させる

### 責任境界

**`lint-and-typecheck.ts`（Plugin 層）はツールのインストールを行わない。**
インストールは `.opencode/instructions/stack-setup.md`（ルール層）が担当し、auto-deploy level に従って
自動実行・確認付き実行・提案のみを切り替える。

- Plugin 層：ツールが既に存在することを前提に `which` 検出 → 実行 → 結果通知
- ルール層（`.opencode/instructions/stack-setup.md`）：言語検出時に必要なツールを OS 別にインストール

### 設定変更

カスタマイズしたいときは「`lint-and-typecheck.ts` の lint コマンドを変更して」とAIに指示する。AIが該当 `.ts` ファイルを編集する。
`lint-and-typecheck.ts` は使用可能なツールを自動検出する（デフォルトで設定変更の必要なし）。
変更箇所の候補：
- `exists()` の引数（ツール名）を変更する
- 該当言語ブロック内のコマンド文字列（`formatFile` / `lintFile` / `typecheck` の第1引数）を変更する
設定を変更した場合は `bun install` の再実行は不要（TypeScript は実行時コンパイルされる）。

## 無効化

不要な Plugin の .ts ファイルを削除するだけで無効化できる。

## 新規 Plugin の追加

`.opencode/plugins/` に .ts ファイルを作成し、`Plugin` 型に従ってエクスポートする：

```typescript
import type { Plugin } from "@opencode-ai/plugin"

export const MyPlugin: Plugin = async ({ client, $ }) => ({
  "tool.execute.after": async (input) => {
    // ...
  },
})
```

型定義は `@opencode-ai/plugin` パッケージから提供される。

## `commit-review.ts` 詳細

git commit 実行前に @code-reviewer（一般レビュー）と @security-auditor（全severity セキュリティ監査）を並列子セッションで実行し、判定ポリシーに従ってブロックする。オーケストレータ役であり、サブエージェント同士の委譲は行わない（二重監査を防ぐため）。

### 発火条件

`tool.execute.before` で bash ツールのコマンド文字列に `git commit` が含まれていることを検出して発火する（`git -C <dir> commit` / `git -c key=val commit` 形式も検出）。
AI エージェントが bash で `git commit` を実行したときにのみ動作する（人間がターミナルで直接コミットした場合は発火しない）。

フックバイパス操作（`--no-verify` / `core.hooksPath` 変更等）は destructive-op-guard に加えて commit-review 自体もブロックする。

### 判定ポリシー（`.opencode/config/review-policy.json` が SSoT）

- **ブロック**: `[重要度: HIGH/CRITICAL]` に該当する指摘、またはブロック対象クラス（機密情報のハードコード・認証/認可の欠如・インジェクション・機密情報のログ出力）に該当し、**「検証方法」が添えられた**指摘
- **警告（ブロックしない）**: `warning.severities` に該当する指摘（既定 `MEDIUM/LOW`）、および検証方法のない HIGH/クラス系指摘
- エビデンス不足の指摘や感覚的懸念が門を止めないことで、ゲートの収束を保証する

### 審査履歴（状態を持つゲート）

- 審査結果は `docs/review-log.md` に記録される（`status: 未解決 / 解消済み / 警告`）
- 次回コミット時は履歴を読み込み、**未解決指摘の再報告を禁止**し、「【解消確認】/【残存確認】」マーカーで状態を更新する
- 【残存確認】の重要度は履歴に記録された元の指摘（同じファイル）から引き継ぐ（履歴が見つからない場合のみ HIGH で記録）
- 解消済み指摘は再ブロックされない。同一指摘の無限再ブロックを防ぎ、修正が行われれば確実にコミットへ到達できる

### 監査の有界化（タイムアウト・fail-closed）

- 子セッション応答は `reviewTimeoutMs`（既定 **15 分**・`review-policy.json` で調整可・下限 1 秒）で**有界化**される。モデル/環境が無応答でも無期限には待たない
- タイムアウトした監査がある場合は**監査未完走としてコミットをブロック**（fail-closed。時間切れで通過させない）。履歴に `status: 警告` のレコードを残し、次回コミットで再審査させる
- 両方の審査エージェントが**無言で結果を返さなかった場合もブロック**（fail-closed。審査未成立を素通ししない）
- 開始時と経過半分時点で継続中通知（noReply）を親セッションへ表示し、待機を見える化する

### 依存監査（決定論的・マニフェスト変更時のみ・allowlist 限定）

`git diff --cached --name-only` に依存マニフェスト（package.json / requirements.txt / go.mod 等）が含まれる場合のみ、**検出した全てのマニフェスト**に対応する監査コマンドを実行し、出力を @security-auditor に添付する（package.json + package-lock.json のように同じコマンドが割り当てられた複数マニフェストは 1 回の実行に集約）。毎コミットの監査は行わない（セッション開始時・package-version トリガー・sprint-audit との重複を避ける）。

- **コマンドはコード内の固定 allowlist のみ実行**する（`npm audit --audit-level=high` / `pip-audit` / `govulncheck ./...` / `cargo audit` / `bundle audit` / `composer audit` / `dart pub audit`）。`review-policy.json` に allowlist 外のコマンドを登録しても実行されない（設定由来の任意コマンド実行を防ぐ）
- 監査コマンド自体も **5 分でタイムアウト**し、その場合は「静的検査で代替確認」を @security-auditor に注記する

### 保護される / されないケース

| シナリオ | `.opencode/plugins/commit-review.ts` | 代替保護 |
|---------|-----------------|---------|
| AI が自律実行モードでコミット | ✅ 発火 | — |
| 提案・人間実行モードで人間が「実行して」→ AI が bash 実行 | ✅ 発火 | — |
| 人間が AI の提案をターミナルにコピペして手動実行 | ❌ 発火しない | pre-commit フック（secret patterns のみ） |
| 人間が直接ターミナルで `git commit` | ❌ 発火しない | pre-commit フック（secret patterns のみ） |
| 審査エージェント定義（`.opencode/agents/code-reviewer.md` / `security-auditor.md`）の欠落 | ⚠️ 該当審査をスキップ＋毎コミット通知（AI プロンプト + トースト） | 恒久ブロックせず回復へ導く。`code-reviewer.md` 欠落時も `security-auditor` は可能なら継続し監査の穴を最小化 |
| 両審査エージェントが起動されたのに無言で結果を返さない | ✅ ブロック（fail-closed）＋通知 | 審査未成立のまま通過させない。モデル/環境復旧後に再コミット |

### 補完関係

- **`.opencode/plugins/commit-review.ts`**: LLM によるコードレビュー + セキュリティ監査（ポリシー＋エビデンス＋履歴で判定）。広範だが発火条件の制約あり
- **pre-commit フック**: 決定論的パターンマッチ（`.opencode/config/secret-patterns.json`）。範囲は限定されるが常に発火
- 両者で defense in depth を構成する。機密のハードコード等の決定論的クラスは pre-commit 側が常に防衛するため、LLM 側の誤分類リスクを相殺する

### 備考

個人開発ではブランチや Pull Request は不要。
`.opencode/plugins/commit-review.ts` が PR レビューと同じ品質保証をコミット時にコード強制するため、
main ブランチに直接コミットして問題ない。

### 未対応のトリガー

| トリガー | 現状 | 理由 |
|---------|------|------|
| `gh pr create` | AI自己遵守（`.opencode/instructions/security/_trigger-pr.md`） | PR頻度が低く、`.opencode/plugins/commit-review.ts` が個別コミットを保護 |
| `git push`（非main） | AI自己遵守（`.opencode/instructions/security/_trigger-pr.md`） | push 検出は誤検知リスク大（force push は別途 `.opencode/plugins/destructive-op-guard.ts` が保護）

## `destructive-op-guard.ts` 詳細

`AGENTS.md` Safety Rules に定義されている破壊的操作のうち、コード強制する範囲としない範囲。

### 強制する操作（guard がブロック）

| 操作 | パターン |
|------|---------|
| `git reset --hard` | `git reset --hard ...` |
| `git rebase` | `git rebase ...` |
| `git push --force` / `--force-with-lease` | `git push --force...` |
| `git branch -d` / `-D` | `git branch -d...` / `-D...` |
| `git clean -fd` | `git clean -f[d]...` |
| `rm -rf` / `rm -r` | `rm -rf...` / `rm -r...` |
| `--no-verify`（フックバイパス） | `--no-verify` |

### 強制しない操作（AI の行動原則に委ねる）

| 操作 | コード強制しない理由 |
|------|-------------------|
| `git commit`（通常） | `.opencode/plugins/commit-review.ts` が別途レビュー強制。通常の commit 自体は必須操作 |
| `git push`（plain） | 頻繁に使う正常操作。force push のみ別途 guard |
| `git add` | 頻繁に使う正常操作 |
| ファイル削除（単一ファイル） | 誤検知が多い（正常なリファクタリング・リネームを阻害するため） |

**設計意図**: `.opencode/plugins/destructive-op-guard.ts` は Safety Rules の完全なコード実装ではなく、**復元が困難な操作のみを最低限ブロックする**ガードレール。復元可能な操作（通常 push, commit, 単一ファイル削除）は `AGENTS.md` の行動原則（AI 自発遵守）に委ね、誤検知リスクを回避している。

`.opencode/plugins/commit-review.ts`、`.opencode/plugins/secrets-guard.ts` と合わせて defense in depth を構成する。

## `rule-injector.ts` 詳細

ファイル編集時にファイル種別と内容を検出し、対応するルールファイルの参照を注入する。
`AGENTS.md` を軽量に保つための仕組み。

### 作用の流れ

```
Session開始（instructions: `AGENTS.md` / `.opencode/instructions/cli-first.md` / `.opencode/instructions/naming-conventions.md` / `.opencode/instructions/code-quality.md` / `ARCHITECTURE.md` / `docs/project-definition.md`）
  ↓
AI: アーキテクチャ設計・プロジェクト設定（コードは未記述）
  ↓
AI: 最初のコードファイルを作成しようとする
  ↓
Plugin: コードファイル検出 + 規約未読 → throw new Error() で書き込みを BLOCK（リトライしても読了まで再ブロック）
  ↓
AI: エラーを確認 → 規約ファイル（`.opencode/instructions/directory-structure.md` / `.opencode/coding-conventions.md`）を読む
  ↓
AI: 規約に従って正しいコードを書く
  ↓
通常の編集フェーズ：Plugin が個別ルールを noReply 注入（複数該当時は1回に列挙）
```

`throw new Error()` は AI に tool result として返り、人間には表示されない。
AI が自己回復し、規約を読んでから再試行する。
`.opencode/instructions/naming-conventions.md` / `.opencode/instructions/code-quality.md` は `opencode.json` の `instructions` で常時読込されるため、BLOCK・通知対象外（セッション開始時点で文脈に存在する）。

### 検出と注入のルール

| 作用 | トリガー | 内容 |
|------|----------|------|
| **BLOCK**（読了まで） | コードファイル（`.ts/.js/.py/.css/.scss/...`）の write/edit | 2つの規約ファイル（`.opencode/instructions/directory-structure.md` / `.opencode/coding-conventions.md`）を読むよう要求。書き込みを中断。未読のまま再試行しても再ブロック（リトライバイパス対策） |
| **BLOCK**（読了まで） | テストファイル（`.test.*` / `_test.*` / `test_*.*` / `*Test.java` 等）の write/edit | `.opencode/instructions/tdd-cycle.md` を読むよう要求。書き込みを中断 |
| **BLOCK**（読了まで） | bash の `mkdir` コマンド | `.opencode/instructions/directory-structure.md` を読むよう要求。実行を中断 |
| **noReply 注入** | コードファイル + 非コードファイル（`package.json` / `docs/project-definition.md` / `AGENTS.md` / 依存関係ファイル 等） | `.opencode/instructions/security.md` の確認を推奨。内容キーワード（login/auth/token/stripe/payment 等）に合致すると再注入 |
| **noReply 注入** | コードファイル + `ARCHITECTURE.md` + `docs/project-definition.md` | `.opencode/instructions/network-resilience.md` の確認を推奨。内容キーワード（fetch/axios/retry/timeout/redis 等）に合致すると再注入 |
| **noReply 注入** | `.tsx/.jsx/.css/.scss` + `DESIGN.md` + `design/*.json` | `.opencode/instructions/design-contract.md` の確認を推奨 |
| **noReply 注入** | `ARCHITECTURE.md` 「技術スタック」「採用アーキテクチャ」「法的・コンプライアンス」セクション編集 | `.opencode/instructions/stack-setup.md` の確認を推奨 |
| **noReply 注入** | テストファイルの write/edit | `.opencode/instructions/tdd-cycle.md` の確認を推奨（読了後）。内容キーワード（test/spec/tdd/describe/it/assert/expect/func Test/#[test]）に合致すると再注入 |

注入通知はバッチ化されている：1回のツール実行で複数ルールに該当した場合、複数回の prompt を送らず1回の noReply に全ルールを列挙する。

### BLOCK の詳細

**規約ゲート（コードファイル）**: `conventionsOffered === false` かつ `CODE_FILE_PATTERN` に一致
- 未読の規約ファイルのパスを列挙して `throw new Error()`
- `conventionsOffered` は「全規約読了済み」を意味し、読了が確認できた場合のみ true になる。未読のまま再試行しても再ブロックする（リトライバイパス修正）
- `.opencode/instructions/naming-conventions.md` / `.opencode/instructions/code-quality.md` は常時読込（instructions）のためゲート・通知対象外

**tdd ゲート（テストファイル）**: `TEST_FILE_PATTERN` に一致かつ `.opencode/instructions/tdd-cycle.md` 未読
- テストファイルの作成・編集は `.opencode/instructions/tdd-cycle.md` を読了するまでブロックする
- 読了後（`readByAI`）は通常の noReply 注入に移行する

**mkdir ゲート（bash）**: bash コマンドに `mkdir` が含まれ、`.opencode/instructions/directory-structure.md` 未読
- ディレクトリ作成は `.opencode/instructions/directory-structure.md` を読了するまでブロックする
- 読了後はブロックしない

**再試行**: AI が規約を読み、全ての読了が確認されると以降のコードファイル書き込みはブロックしない
**事前読了**: AI が最初の書き込みより前に規約ファイルを自発的に読んでいた場合、ブロックは発生しない
**コンパクション**: セッションコンパクションで AI の記憶が失われても、`experimental.session.compacting` / `session.compacted` 検知で `injected` / `reminded` / `readByAI` フラグに加えて規約ゲート（`conventionsOffered` / `conventionsRead`）をリセットする。コンパクション後は単発ハードゲートが再起動し、次に作成操作をしたときに再度ゲートが効く（`.opencode/plugins/arch-diag.ts` と同型の対策）。

### 再注入の条件（個別ルール、per-session state 管理）

1. **初回**: 該当ファイル編集時 → `noReply` で注入
2. **未読**: 前回注入後、AI が Read ツールで該当ルールファイルを開いていない → `noReply` で再注入
3. **違反再発**: 前回注入後、AI がルールを読んだが、内容に同種キーワードが再出現 → `noReply` で再注入（強めのメッセージ）

### 初期状態

`opencode.json` の `instructions` フィールドは 6ファイル（`AGENTS.md` / `.opencode/instructions/cli-first.md` / `.opencode/instructions/naming-conventions.md` / `.opencode/instructions/code-quality.md` / `ARCHITECTURE.md` / `docs/project-definition.md`）を読み込む。
`.opencode/instructions/cli-first.md`・`.opencode/instructions/naming-conventions.md`・`.opencode/instructions/code-quality.md` を除く `instructions/` 配下のルールファイル（および `.opencode/coding-conventions.md`）はセッション開始時には読み込まれず、
この Plugin が BLOCK または noReply 注入でイベント駆動する。
`.opencode/instructions/naming-conventions.md` は常時読み込まれるため「作成・命名前に欠かさず読む」ことを保証し、`.opencode/instructions/code-quality.md` は常時読み込まれるため「コードを書く前段階から品質6軸・分割統合の基準を踏まえる」ことを保証する。`.opencode/instructions/directory-structure.md` は mkdir ゲート、`.opencode/coding-conventions.md` はコード書き込みゲートでそれぞれ読了を強制する。

## `arch-diag.ts` 詳細

`ARCHITECTURE.md` の技術スタック変更を検知し、スキルの追加検討を促す。
あわせて、層のルールが定義されているのにアーキテクチャ違反検出が未設定の場合（ENF）に設定を促す。

### 過剰発火対策（2026-08）

初回セッションで 37件（TECH 23 / ENF 14）のノイズ注入を観測したため、以下の対策を実装した。

1. **記入中抑制**: `## 人間とAIが対話しながら記入する手順` / `<!--`（HTMLコメント） / `[...]`（プレースホルダー）が残っている間は通知しない（セットアップ記入プロセス中）
2. **変更検知**: 技術スタックセクションを抽出し、セッション毎の直前内容（`techBaseline`）と比較して実際に変わったときだけ通知する。無関係セクションの編集では発火しない
3. **ENF セッション内1回**: アーキテクチャ違反検出未設定の警告はセッション中1回のみ
4. **10分クールダウン**: TECH 通知専用。技術スタックの変更通知を10分に1回に抑制する（rule-injector の `RULE_COOLDOWN_MS` と同型）。ENF はセッション内1回フラグのみで制御されクールダウンは使わない
5. **コンパクションリセット**: `experimental.session.compacting` / `session.compacted` 検知で ENF フラグとクールダウンをリセット。コンパクション後に条件が一致すれば ENF が1回だけ再発火する（技術スタックの `techBaseline` はリセットしない → 同値での再発火を防ぐ）

なお、手法が異なるのは通知対象の性質の違いによる。TECH は変化イベントなので複数回の発火を認めつつ10分クールダウンで抑制し、ENF は恒常的な「未設定」状態なのでクールダウンでは10分ごとに再発火してしまうため、セッション内1回＋コンパクションリセットで制御する。

### 発火条件（TECH）

- 対象ファイル: `ARCHITECTURE.md`（パス末尾一致）
- 技術スタックセクション（`## 技術スタック` / `## Tech Stack` など）の内容がセッション内で実際に変化した場合
- 初回観測時はベースラインを設定するだけで通知しない（ノイズ抑制）

### 発火条件（ENF）

- 層のルールが具体的に記入されている（`[層A]` のようなプレースホルダーがない）
- アーキテクチャ違反検出設定が存在しない（eslint の `no-restricted-imports` / `boundaries`、`pyproject.toml` の `TID` など）
- セッション内1回のみ（コンパクションでリセットされる）
