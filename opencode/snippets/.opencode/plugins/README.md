# Plugins

OpenCode Plugin は TypeScript + Bun ランタイムで動作するイベント駆動型の自動実行仕組み。
AGENTS.md への言語指示と異なり、エージェントの意思に関わらず自動実行される。

## ファイル一覧

| Plugin | イベント | 目的 |
|--------|----------|------|
| `secrets-guard.ts` | `tool.execute.before` | 機密ファイル・パターンの書き込み防止（P1-1 修正：SSoT 化） |
| `tasks-guard.ts` | `tool.execute.before` | tasks.json passes 保護 |
| `lint-and-typecheck.ts` | `tool.execute.after` | ファイル編集後の lint・format・typecheck・単一テスト自動実行（P1-2 修正：性能改善） |
| `doc-links.ts` | `tool.execute.after` | ドキュメントリンクの整合性チェック（P1-3 修正：AI 通知パターン） |
| `adr-prompt.ts` | `tool.execute.after` + noReply | Write/Edit 3回検出 → ADR 記録を促す（冗長発火防止） |
| `arch-diag.ts` | `tool.execute.after` | アーキテクチャ変更検知・スキル診断推奨（P1-3 修正：AI 通知パターン） |
| `skill-tracker.ts` | `tool.execute.after` | スキル使用履歴の記録 |
| `lockfile-record.ts` | `tool.execute.after` | 外部スキルインストール検出・skills.lock.yaml への自動記録 |
| `handoff.ts` | `session.idle` + noReply | 長時間アイドル検知 → AI による handoff 生成 |
| `harness-health.ts` | `tool.execute.after` / `session.idle` | Context Anxiety 兆候の検知（P0-3 per-session sliding window + TTL cleanup） |
| `task-archive.ts` | `session.idle` | 作業ディレクトリの自動アーカイブ提案（全タスク完了時） |
| `working-dir-guide.ts` | `tool.execute.before` | `docs/working/` ファイル Read/Write/Edit 検知時のルール注入 |
| `evaluator-tools.ts` | `tool`（カスタムツール） | `evaluator-passed` / `evaluator-failed` ツール定義 |
| `compaction-context.ts` | `experimental.session.compacting` | コンパクション時に作業ディレクトリの状態を維持 |
| `env-check.ts` | `tool.execute.before` | Python/Node.js 環境パス自動書き換え + .nvmrc 不一致警告 |
| `rule-injector.ts` | `tool.execute.before` | ファイル種別・内容に応じてルールファイルの参照を注入（AGENTS.md 肥大化防止） |
| `destructive-op-guard.ts` | `tool.execute.before` | 破壊的Git操作（reset --hard / rebase / push --force / rm -rf 等）のブロック |
| `commit-review.ts` | `tool.execute.before` | git commit 検出 → 子セッションで @code-reviewer + @security-auditor を並列実行 → 問題ありならブロック |

## イベントの種類

**`tool.execute.before`**: ツール実行前に発火。エラーを投げるとツール実行をブロックする。
- 引数: `(input: ToolCall, output: WritableToolArgs)`
- ブロック: `throw new Error("message")`

**`tool.execute.after`**: ツール実行後に発火。ブロック不可（サイドエフェクトのみ）。
- 引数: `(input: ToolCall, output: ToolResult)`
- ログ: `client.app.log({ body: { service, level, message } })`

**`session.idle`**: セッションがアイドル状態（AI 応答完了）に遷移したときに発火。
- 引数: `(event: { sessionID?: string })`
- 用途: Context Anxiety 検知、handoff 生成トリガー（要内部デバウンス）

## セットアップ

`setup-harness.sh` が自動でファイルをコピーする。
手動で有効化する場合は `.opencode/plugins/` に .ts ファイルを配置するだけでよい。
opencode.json への登録は不要（auto-loading）。

依存関係のインストール：
```bash
cd .opencode
bun install
```

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
Java/PHP には lint-and-typecheck の全言語に共通して採用している「`which` で検出して即座に実行できる高速CLIツール」が標準化されていない。代わりにビルドツール（Maven/Gradle/Composer）経由の品質チェックが必要なため、Plugin 層ではなく `stack-setup.md` 層でプロジェクト固有対応として案内する。

### 動作の流れ

1. ファイル編集後、拡張子で言語を判定
2. ツールのインストール場所をプロジェクトローカル優先で自動検出（`node_modules/.bin/` / `.venv/bin/` / `bundle exec` → `which` の順）
3. 見つかったツールだけを実行する（見つからないツールはサイレントスキップ）。実行順は format → lint → typecheck → test
4. テスト自動実行は条件付き：
   - 対応するテストファイル（JS/TS: `.test.*` / `.spec.*`、Python: `test_*.py` / `*_test.py` / `*.test.py`、Ruby: `*_spec.rb` / `*_test.rb`）が存在する場合のみ実行
   - タイムアウト60秒。失敗時は先頭4000文字を収集
   - ツール不在時はサイレントスキップ（JS/TS: pm の test script、Python: `.venv/bin/pytest`、Ruby: `bundle exec` 経由 or bare）
5. 結果に応じて Toast 通知：
   - 🟢 `all checks passed` — すべてのツールが正常終了
   - 🟡 `no tools found for [lang]` — 1つもツールが見つからなかった（インストールが必要）
   - 🔴 `${N} check(s) failed` — エラーあり（AI に自動通知して修正させる）

### 責任境界

**`lint-and-typecheck.ts`（Plugin 層）はツールのインストールを行わない。**
インストールは `stack-setup.md`（ルール層）が担当し、auto-deploy level に従って
自動実行・確認付き実行・提案のみを切り替える。

- Plugin 層：ツールが既に存在することを前提に `which` 検出 → 実行 → 結果通知
- ルール層（stack-setup.md）：言語検出時に必要なツールを OS 別にインストール

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

git commit 実行前に @code-reviewer（一般レビュー + CRITICAL security）と @security-auditor（全severity セキュリティ監査）を並列子セッションで実行し、問題を検出したらコミットをブロックする。

### 発火条件

`tool.execute.before` で bash ツールのコマンド文字列に `git commit` が含まれていることを検出して発火する。
AI エージェントが bash で `git commit` を実行したときにのみ動作する（人間がターミナルで直接コミットした場合は発火しない）。

### 保護される / されないケース

| シナリオ | commit-review.ts | 代替保護 |
|---------|-----------------|---------|
| AI が自律実行モードでコミット | ✅ 発火 | — |
| 提案・人間実行モードで人間が「実行して」→ AI が bash 実行 | ✅ 発火 | — |
| 人間が AI の提案をターミナルにコピペして手動実行 | ❌ 発火しない | pre-commit フック（secret patterns のみ） |
| 人間が直接ターミナルで `git commit` | ❌ 発火しない | pre-commit フック（secret patterns のみ） |

### 補完関係

- **commit-review.ts**: LLM によるコードレビュー + セキュリティ監査。広範だが発火条件の制約あり
- **pre-commit フック**: 決定論的パターンマッチ（secret-patterns.json）。範囲は限定されるが常に発火
- 両者で defense in depth を構成する

### 備考

個人開発ではブランチや Pull Request は不要。
commit-review.ts が PR レビューと同じ品質保証をコミット時にコード強制するため、
main ブランチに直接コミットして問題ない。

### 未対応のトリガー

| トリガー | 現状 | 理由 |
|---------|------|------|
| `gh pr create` | AI自己遵守（`_trigger-pr.md`） | PR頻度が低く、commit-review.ts が個別コミットを保護 |
| `git push`（非main） | AI自己遵守（`_trigger-pr.md`） | push 検出は誤検知リスク大（force push は別途 destructive-op-guard.ts が保護）

## `destructive-op-guard.ts` 詳細

AGENTS.md Safety Rules に定義されている破壊的操作のうち、コード強制する範囲としない範囲。

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
| `git commit`（通常） | commit-review.ts が別途レビュー強制。通常の commit 自体は必須操作 |
| `git push`（plain） | 頻繁に使う正常操作。force push のみ別途 guard |
| `git add` | 頻繁に使う正常操作 |
| ファイル削除（単一ファイル） | 誤検知が多い（正常なリファクタリング・リネームを阻害するため） |

**設計意図**: `destructive-op-guard.ts` は Safety Rules の完全なコード実装ではなく、**復元が困難な操作のみを最低限ブロックする**ガードレール。復元可能な操作（通常 push, commit, 単一ファイル削除）は AGENTS.md の行動原則（AI 自発遵守）に委ね、誤検知リスクを回避している。

`commit-review.ts`、`secrets-guard.ts` と合わせて defense in depth を構成する。

## `rule-injector.ts` 詳細

ファイル編集時にファイル種別と内容を検出し、対応するルールファイルの参照を注入する。
AGENTS.md を軽量に保つための仕組み。

### 作用の流れ

```
Session開始（instructions: AGENTS.md / cli-first.md / ARCHITECTURE.md / project-definition.md）
  ↓
AI: アーキテクチャ設計・プロジェクト設定（コードは未記述）
  ↓
AI: 最初のコードファイルを作成しようとする
  ↓
Plugin: コードファイル検出 + 規約未読 → throw new Error() で書き込みを BLOCK
  ↓
AI: エラーを確認 → 規約ファイル（naming-conventions / directory-structure / coding-conventions）を読む
  ↓
AI: 規約に従って正しいコードを書く
  ↓
通常の編集フェーズ：Plugin が個別ルールを noReply 注入
```

`throw new Error()` は AI に tool result として返り、人間には表示されない。
AI が自己回復し、規約を読んでから再試行する。

### 検出と注入のルール

| 作用 | トリガー | 内容 |
|------|----------|------|
| **BLOCK**（初回のみ） | コードファイル（`.ts/.js/.py/.css/.scss/...`）の初回 write/edit | 3つの規約ファイル（naming-conventions / directory-structure / coding-conventions）を読むよう要求。書き込みを中断 |
| **noReply 注入** | コードファイル編集 | `code-quality.md` の参照を推奨 |
| **noReply 注入** | コードファイル + 非コードファイル（`package.json` / `docs/project-definition.md` / `AGENTS.md` / 依存関係ファイル 等） | `security.md` の確認を推奨。内容キーワード（login/auth/token/stripe/payment 等）に合致すると再注入 |
| **noReply 注入** | コードファイル + `ARCHITECTURE.md` + `docs/project-definition.md` | `network-resilience.md` の確認を推奨。内容キーワード（fetch/axios/retry/timeout/redis 等）に合致すると再注入 |
| **noReply 注入** | `.tsx/.jsx/.css/.scss` + `DESIGN.md` + `design/*.json` | `design-contract.md` の確認を推奨 |
| **noReply 注入** | `ARCHITECTURE.md` 編集 | `stack-setup.md` の確認を推奨 |
| **noReply 注入** | テストファイル（`.test.*` / `_test.*` / `test_*.*` / `*Test.java` 等）の write/edit | `tdd-cycle.md` の確認を推奨。内容キーワード（test/spec/tdd/describe/it/assert/expect/func Test/#[test]）に合致すると再注入 |

### 初回ブロックの詳細

**条件**: `conventionsOffered === false` かつ `CODE_FILE_PATTERN` に一致
**動作**: `session.conventionsOffered = true` を設定後、未読の規約ファイルのパスを列挙して `throw new Error()`
**再試行**: AI が規約を読み、全ての読了が確認されると以降のコードファイル書き込みはブロックしない
**事前読了**: AI が最初の書き込みより前に規約ファイルを自発的に読んでいた場合、ブロックは発生しない
**コンパクション**: セッションコンパクションで Plugin のメモリ状態は消失するが、最悪1回の再ブロックが発生するのみ。AI は会話履歴から規約内容を把握しており、即座に再試行する

### 再注入の条件（個別ルール、per-session state 管理）

1. **初回**: 該当ファイル編集時 → `noReply` で注入
2. **未読**: 前回注入後、AI が Read ツールで該当ルールファイルを開いていない → `noReply` で再注入
3. **違反再発**: 前回注入後、AI がルールを読んだが、内容に同種キーワードが再出現 → `noReply` で再注入（強めのメッセージ）

### 初期状態

`opencode.json` の `instructions` フィールドは 4ファイル（`AGENTS.md` / `.opencode/instructions/cli-first.md` / `ARCHITECTURE.md` / `docs/project-definition.md`）を読み込む。
`cli-first.md` を除く `instructions/` 配下のルールファイル（および `.opencode/coding-conventions.md`）はセッション開始時には読み込まれず、
この Plugin が初回ブロックまたは noReply 注入でイベント駆動する。
