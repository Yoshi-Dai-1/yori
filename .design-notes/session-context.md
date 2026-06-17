# Session Context

## 今回の変更（2026-06-17）

### Session 1: ランタイムバージョン管理の統一 + Python venv-first 化 + プラグインのプロジェクトローカルツール優先

### Changed files

| ファイル | 内容 |
|---------|------|
| `opencode/snippets/.opencode/instructions/stack-setup.md` | バージョン管理のルール強化（デフォルト→確定値への上書き許可、ランタイムバージョン決定のSSOT明記） |
| `opencode/snippets/.opencode/instructions/stack-setup/_step-35.md` | ブロックBにランタイムバージョン自動検出 + バージョン管理ファイル整合性確認を追加。ブロックCにフレームワーク互換性確認を追加 |
| `opencode/snippets/.opencode/instructions/stack-setup/_python.md` | 全面書き換え：venv-first（`.venv/bin/` 内ツールのみ使用）、`pip freeze` ベースの依存管理、`requirements.txt`/`requirements-dev.txt` 分離 |
| `opencode/snippets/.opencode/instructions/stack-setup/_typescript.md` | `.nvmrc` 自動生成ロジック追加（TypeScript/JavaScript両方） |
| `opencode/snippets/.opencode/instructions/stack-setup/_ruby.md` | `.ruby-version` 生成ロジック追加 |
| `opencode/snippets/.opencode/instructions/stack-setup/_rust.md` | `rust-toolchain.toml` 生成ロジック追加 |
| `opencode/snippets/.opencode/instructions/stack-setup/_go.md` | `go.mod` の `go` ディレクティブによるバージョン固定ロジック追加 |
| `opencode/snippets/.opencode/instructions/stack-setup/_swift.md` | `.swift-version` 生成ロジック追加 |
| `opencode/snippets/.opencode/instructions/stack-setup/_php.md` | `composer.json` の `require.php` バージョン固定ロジック追加 |
| `opencode/snippets/.opencode/instructions/stack-setup/_c-family.md` | `global.json` による.NET SDK バージョン固定ロジック追加 |
| `opencode/snippets/.opencode/instructions/stack-setup/_java.md` | JVM バージョン固定ロジック追加（build.gradle.kts / pom.xml） |
| `opencode/snippets/.opencode/instructions/stack-setup/_kotlin.md` | JVM バージョン固定ロジック追加（build.gradle.kts / pom.xml） |
| `opencode/snippets/.opencode/plugins/lint-and-typecheck.ts` | Python: `.venv/bin/ruff` / `.venv/bin/mypy` を絶対パス指定。JS/TS: `node_modules/.bin/prettier` 優先。Ruby: `Gemfile.lock` 存在時 `bundle exec` 経由。`exists()` が相対パス対応 |
| `opencode/snippets/.opencode/plugins/README.md` | `env-check.ts` 追記、ツール検出順を「プロジェクトローカル優先」に更新 |
| `opencode/snippets/.opencode/plugins/env-check.ts` | **新規**: Python/Node.js 環境パス自動書き換え + `.nvmrc` 不一致警告 Plugin |
| `opencode/principles/harness-engineering.md` | Python リンター表から Flake8 削除（Ruff に統一） |

### Key design decisions

1. **ランタイムバージョンの決定主体**: 人間ではなく Web検索（ブロックB）が決定し ARCHITECTURE.md を SSOT とする。ブロックCでフレームワーク互換性確認後、最終確定。
2. **バージョン管理ファイルは各言語ファイルで生成**: `_step-35.md` のブロックBがバージョン決定し、各言語の `_*.md` が対応する管理ファイル（`.nvmrc` / `.python-version` / `rust-toolchain.toml` 等）を生成する責務を負う。
3. **Python は venv 絶対パスのみ**: グローバル pip/Ruff/mypy にフォールバックしない。`_python.md` で仮想環境作成 + ツールインストールが保証されている前提。
4. **プラグインのツール検出順**: `node_modules/.bin/` / `.venv/bin/` / `bundle exec` → `which`（グローバル）。プロジェクトローカルを最優先。
5. **`env-check.ts` は自動パス書き換え**: ユーザーが `python3` や `pip` を実行した際、`.venv/bin/` 配下に自動で書き換える。OpenCode の `tool.execute.before` フックで実現。
6. **Flake8 削除**: Ruff が Flake8 の全ルールをカバーするため、表記を Ruff に統一。

### 未実施
- `NPM_TOKEN` の GitHub Secrets 設定（GitHub Actions で自動公開する場合に必要）
- `npm publish --access public` の初回実行

---

### Session 2: Testing Pyramid 導入（Google Testing Blog 記事ベース）

Google Testing Blog "Just Say No to More End-to-End Tests"（Mike Wacker, 2015）を yori に適用。

### Changed files

| ファイル | 内容 |
|---------|------|
| `opencode/principles/test-strategy.md` | **新規**: Testing Pyramid 理論・Feedback Loop 3要件（Fast/Reliable/Isolates Failures）・70/20/10 目安・アンチパターン（Inverted Pyramid/Hourglass）・yori 既存機構とのマッピングテーブル |
| `opencode/principles/naming-conventions.md` | 「テスト種別の命名規則」セクション追記（12言語×3種別のパターン表 + 分類ルール4段階 + Rust `tests/` 例外 + Rust inline unit test 注釈） |
| `opencode/snippets/.opencode/instructions/tdd-cycle.md` | lines 33-35（テスト種別の定義）を `.opencode/standards/principles/test-strategy.md` および `.opencode/standards/principles/naming-conventions.md` への参照に置き換え |
| `opencode/snippets/agents/subagents/code-quality-auditor.md` | 項目7「テストピラミッドのバランス」追加 + 報告書式にピラミッドバランスセクション追加 |

### Key design decisions

1. **命名規則のSSOT**: `naming-conventions.md` に言語別テスト種別命名規則を集約（`instructions/test-strategy.md` は作成せず、新しい注入トリガーも追加しない）
2. **AGENTS.md 変更なし**: 肥大化回避。`tdd-cycle.md` の既存注入トリガーが参照チェーン（`tdd-cycle.md` → `test-strategy.md` → `naming-conventions.md`）を起動
3. **プラグイン追加なし**: Testing Pyramid は agent の推論に依存する判断（戦略）であり、プラグインによる強制には不向き
4. **分類ルールは4段階**: 1=e2e → E2E、2=integration/IT → 結合、3=Rust tests/ → 結合、4=default → ユニット
5. **plugin の参照形式**: AGENTS.md の既存規約（`` `name.ts` Plugin ``）に統一
6. **Rust の tests/ ディレクトリ**: 言語標準の強制構造のため、分類ルールに Rust 例外を明示。Go/Java/Python は言語強制がなくプロジェクトの慣行に委ねる

### 未実施
- `playwright-setup` SKILL.md へのピラミッド参照追加（ツールセットアップと戦略判断は時間分離されており現状で許容）
- `code-quality.md` L187 への参照追加（高レベル原則であり詳細へのリンクは記述粒度の範囲外）
- `test-generator.md` へのテスト種別認識追記（agent の推論に委ねる判断）

---

### Session 3: テスト自動実行 + Report Format 拡充（Pocock レビュー後）

mattpocock/skills リポジトリとの比較分析を経て、yoriの不足点を補完。

### Changed files

| ファイル | 内容 |
|---------|------|
| `opencode/snippets/.opencode/plugins/lint-and-typecheck.ts` | `fileExists()` / `runTest()` 新規ヘルパー追加。JS/TS（`.test.$1`/`.spec.$1`、8種の拡張子対応）. Python（`test_*.py`/`*_test.py`/`*.test.py`）。Ruby（`*_spec.rb`→`rspec`、`*_test.rb`→`ruby -I.`）。ツール不在ガード: `.venv/bin/pytest`・`runTest` 内蔵 `exists()` |
| `opencode/snippets/agents/AGENTS.md` | Report Format に「所感」行追加（技術知識有無を問わない平易な説明） |
| `opencode/snippets/.opencode/instructions/tdd-cycle.md` | バグ修正ルールに再現手順の最小化を追記 |

### Key design decisions

1. **テスト実行は単一ファイルのみ**: フルスイートは実行しない（パフォーマンス）。対応言語は単一ファイル実行が実用的なJS/TS/Python/Rubyのみ。Go/Rust/他はスキップ
2. **エラー報告は既存パイプライン統一**: `errors[]` + `attempt.n` + 終了ハンドラに統合。新たな制御フロー不要
3. **AGENTS.md は +1行のみ**: 肥大化回避。60-200行の範囲内を維持
4. **Ruby のテスト種別振り分け**: `*_spec.rb` → RSpec / `*_test.rb` → Minitest で実行コマンドを分離
5. **構造化デバッグループは追加見送り**: 診断ループのメタ判断はエージェントに委ねられず、Plugin 強制が必要だがコストに見合わない

### 未実施
- 診断ループ専用 instruction（`diagnose.md`）: エージェントのメタ認知依存が大きく、現状の `@codebase-investigator` + `tdd-cycle.md` の既存機構で十分と判断

---

### Session 4: ルート README.md 作成（GitHub / npm 説明不足の解消）

### Changed files

| ファイル | 内容 |
|---------|------|
| `README.md` | **新規**: ルート README.md。yori プロジェクト自体の説明（哲学・Quick Start・Feature 一覧・構造・関連リンク）。`opencode/README.md`（ハーネスのセットアップ手順）とは異なる役割 |

### Key design decisions

1. **ルート README.md は「プロジェクト自体の説明」**: `opencode/README.md`（ハーネスの使い方）とは明確に分離。ルート README は GitHub/npm 訪問者向けのプロジェクト紹介。
2. **Badge は3種**: MIT License / npm version / GitHub Stars（4種以内のベストプラクティス準拠）
3. **先頭50語に SEO キーワードを含める**: 「ハーネスエンジニアリング」「AI エージェント」「自律判断・記憶・推論」を冒頭に配置
4. **Quick Start は3行以内**: `bash <(curl -s ...)` の一行のみ。詳細は `opencode/README.md` に委譲
5. **Features はテーブル形式**: スキャン容易性を優先。Principles/Architectures/Plugins/Instructions/Subagents の数量を一覧

### 未実施
- （なし）

---

### Session 5: README 修正 + LICENSE 作成 + AGENTS.md Report Format 拡充（レビュー後・後日修正あり）

**注意**: 初回実装時に plugins/README.md（dot ディレクトリ内）を見落としたため、後日 AGENTS.md の Report Format を修正（3件→3件の明示）

### Changed files

| ファイル | 内容 |
|---------|------|
| `README.md` | 数値修正（Principles 21→23, Plugins 4→16, Subagents 8→9）。「ハーネス」定義を冒頭に追加。Why yori に context anxiety / 秘密情報漏洩を追記。Quick Start に npm/git clone の参照を追加。Features に ADRs 行追加（4件）。ディレクトリツリーに package.json / cli.js / LICENSE 等の欠落ファイルを追加。yori-vs-ハーネスの区別を明記 |
| `LICENSE` | **新規**: MIT License ファイル。README バッジの broken link 解消 |
| `AGENTS.md` (Report Format) | 「公開README更新」行を追加（`README.md` / `opencode/README.md` / `plugins/README.md` / 不要 の4択）。セッション終了時のチェックリストに組み込み |
| `opencode/snippets/.opencode/plugins/README.md` | テスト自動実行のドキュメントを追記（カバレッジ表にテスト列追加・テスト自動実行セクション新設・動作の流れにテスト実行ステップ追加） |

### Key design decisions

1. **公開README更新の記録は Report Format に1行追加**: session-context.md 更新（内部記録）とは分離。役割の異なる2つの作業を混ぜない。
2. **Report Format の行は明示的に2つの README を列挙**: `README.md`（ルート・プロジェクト概要）と `opencode/README.md`（ハーネス手順書）のどちらを更新したか明記。単なる「README更新」では曖昧。
3. **LICENSE は MIT**: `package.json` の宣言と一致。2025年（リポジトリ作成年）。
4. **Plugins 説明文を拡大**: 4→16 に増えたため「lint, typecheck, test, pre-commit」の列挙から「秘密情報防止・診断・環境チェック・lint 等」に変更。

### 未実施
- （なし）

---

### Session 6: 3件の README 最終確認と修正

**指摘**: ルート README の 4ファイルパス表記が不完全 / opencode/README.md に Bun 前提条件の欠落 / ルート `docs/` が空ディレクトリ / plugins/README.md のカバレッジ表に不正確な表記

### Changed files

| ファイル | 内容 |
|---------|------|
| `README.md` | 4ファイルのパス表記修正（`project-definition` → `docs/project-definition.md`、`project-context.md` → `.opencode/project-context.md`） |
| `opencode/README.md` | 「前提条件」セクションを新設（Bun・git） |
| `opencode/snippets/.opencode/plugins/README.md` | JS/TS テストコマンド表記を `${fp}.test.*` / `.spec.*` から `${targetFp}` に修正（コード上の実装と一致） |
| `docs/` | **削除**: 空で git 管理されていないディレクトリ |

### Key design decisions

1. **Bun は opencode/README.md に記載する**: plugins/README.md（プラグイン開発者向け）ではなく、ハーネス利用者向けの opencode/README.md に「前提条件」として明記。ただし plugins/README.md の `bun install` 案内は維持（二重記載で問題なし）。
2. **プラグインのカバレッジ表はコード上の実装に合わせる**: `${fp}.test.*`（glob 的表現）はコードの実際の動作（拡張子置換による特定パス構築）と異なるため、`${targetFp}`（特定ファイルパス）に統一。コード上の変数名 `targetTestFp` ではなく、テスト自動実行セクションと揃えて `targetFp` を採用。

### 未実施
- （なし）
