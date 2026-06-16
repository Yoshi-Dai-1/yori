# Session Context

## 今回の変更（2026-06-17）

ランタイムバージョン管理の統一 + Python venv-first 化 + プラグインのプロジェクトローカルツール優先

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
