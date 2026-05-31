# アーキテクチャ：CLIツール・配布スクリプト

**向いている場面**：ターミナルから実行するコマンドラインツール・npm / pip パッケージとして配布するツール
**言語**：TypeScript / JavaScript（Node.js）/ Python / Go / Rust / Shell

`data-pipeline.md` との違い：CLIツールは「他者に配布・インストールしてもらうことを前提とした設計」である。
個人・チーム内での自動化スクリプトは `data-pipeline.md` を参照する。

---

## このファイルの使い方

具体的な言語・パッケージマネージャーが確定したら、`stack-setup.md` の Step 3.5 ブロックB（必須ファイルの確認・記録）が
必須ファイルを自律検索して補完する。
このファイルは「共通の設計思想」を提供し、言語固有の詳細は自律検索で調達する。

---

## ディレクトリ構成（Node.js / TypeScript の場合）

```
project-root/
  src/
    index.ts                  エントリポイント（`bin` に登録するファイル）
    commands/                 サブコマンド定義（1コマンド = 1ファイル）
      init.ts
      build.ts
    core/                     ビジネスロジック（コマンドから分離）
    utils/                    純粋関数ユーティリティ
    types/                    型定義

  tests/
  dist/                       ビルド成果物（gitignore）

  package.json                必須（bin フィールドにエントリポイントを登録する）
  tsconfig.json
  .npmignore                  npm公開時に除外するファイルを指定する
  README.md                   インストール方法・使い方を必ず記載する
  CHANGELOG.md                バージョン変更履歴（配布ツールでは必須）
```

## ディレクトリ構成（Python の場合）

```
project-root/
  src/
    [package_name]/
      __init__.py
      __main__.py             `python -m [package_name]` で実行されるエントリポイント
      cli.py                  CLIエントリポイント（Click / Typer / argparse）
      commands/               サブコマンド定義
      core/                   ビジネスロジック
      utils/

  tests/
  pyproject.toml              必須（[project.scripts] にエントリポイントを登録する）
  README.md
  CHANGELOG.md
```

## ディレクトリ構成（Go の場合）

```
project-root/
  cmd/
    [tool-name]/
      main.go                 エントリポイント
  internal/                   外部パッケージから参照不可のロジック
    [domain]/
  pkg/                        外部パッケージに公開するロジック（必要な場合のみ）

  go.mod                      必須
  go.sum                      必須
  README.md
  CHANGELOG.md
```

---

## CLIツール固有の設計原則

**エントリポイントの登録**

配布ツールとして機能させるには、パッケージマネージャーにエントリポイントを登録する。
登録方法は言語・ツールによって異なるため、`stack-setup.md` の Step 3.5 ブロックB（必須ファイルの確認・記録）が自律検索する。

**バージョン管理**

```
CLIツールではバージョン管理が必須：
  - セマンティックバージョニング（MAJOR.MINOR.PATCH）に従う
  - CHANGELOG.md に変更内容を記録する
  - 破壊的変更（MAJOR）は README.md で移行手順を示す
```

**エラーメッセージの設計**

```
良いエラーメッセージの3要素：
  1. 何が起きたか（What）
  2. なぜ起きたか（Why）
  3. どうすればよいか（How）

# 悪い例
Error: failed

# 良い例
Error: 設定ファイルが見つかりません（.opencode/config.json）
  → `init` コマンドを実行して設定ファイルを生成してください
  → 詳細: https://[ドキュメントURL]
```

**終了コード**

```
0   正常終了
1   一般エラー（ユーザーの操作ミス）
2   使い方のエラー（引数・フラグの間違い）
126 実行権限なし
127 コマンドが見つからない
```

**標準出力と標準エラー出力の分離**

```
stdout（標準出力）：処理結果・ユーザーに渡すデータ
stderr（標準エラー出力）：エラーメッセージ・進捗表示・デバッグ情報
→ パイプ（|）を使ったときに余分な出力がデータを汚染しないようにする
```

---

## 配布チャネル

CLIツールは複数の配布チャネルを持つことで、異なるOS・環境のユーザーに届けやすくなる。
各チャネルの最新の登録手順は年々変わるため、採用時にブロックC（フレームワーク固有設計の深掘り）が自律検索する。

| 配布チャネル | 対象OS・環境 | 検索クエリ |
|-------------|------------|-----------|
| npm（`npm install -g`） | Node.jsがあればどのOSでも利用可 | `npm publish cli package [現在年]` |
| pip（`pip install`） | Pythonがあればどのおsでも利用可 | `pypi publish package [現在年]` |
| Homebrew | macOS・Linux（最も普及しているパッケージマネージャー）| `Homebrew formula tap submit [現在年]` |
| winget | Windows（Microsoft公式パッケージマネージャー）| `winget manifest submit [現在年]` |
| Scoop | Windows（開発者向け）| `Scoop manifest submit [現在年]` |
| Chocolatey | Windows（企業向け）| `Chocolatey package submit [現在年]` |
| Cargo（`cargo install`）| Rustがあればどのosでも利用可 | `crates.io publish [現在年]` |
| 単一バイナリ配布（GitHub Releases）| すべてのOSに対応。インストール不要 | `[言語名] cross-compile binary release [現在年]` |

**最低限の配布チャネル（推奨）：**
- ユーザーが npm / pip を使う環境なら → npm または pip
- 広くmacOS・Linuxユーザーに届けたい → Homebrew
- Windowsユーザーも対象に含めたい → winget + Homebrew
- インストール環境を問わず届けたい → 単一バイナリ配布（GitHub Releases）

---

## 配布・公開の必須ファイル

| ファイル | 役割 | 備考 |
|---------|------|------|
| `README.md` | インストール方法・使い方・サンプル | 必須 |
| `CHANGELOG.md` | バージョンごとの変更履歴 | 必須 |
| `LICENSE` | ライセンス表記 | 公開配布では必須 |
| `.npmignore` / `.gitignore` | 配布に含めないファイルの除外 | |

言語固有の必須ファイル（`package.json` の `bin` フィールド・`pyproject.toml` の `[project.scripts]` 等）は
`stack-setup.md` の Step 3.5 ブロックB（必須ファイルの確認・記録）が自律検索して記録する。

---

## 参照ドキュメント

- `.opencode/standards/principles/naming-conventions.md`（CLIコマンド名は kebab-case）
- `.opencode/standards/principles/security-requirements.md`（ユーザー入力のバリデーション）
- `.opencode/standards/principles/production-readiness.md`（リリース前チェックリスト）
