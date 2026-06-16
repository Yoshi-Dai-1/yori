#### Python が含まれる場合

```
.python-version       → 下記テンプレートで作成（ARCHITECTURE.md のバージョンを優先）
pyproject.toml        → 下記テンプレートで作成（Ruff・mypy の設定を含む）
requirements.txt      → 下記テンプレートで作成
requirements-dev.txt  → 下記テンプレートで作成
```

**`.python-version` テンプレート：**
```
3.12
```
（バージョンは ARCHITECTURE.md に記録されたバージョンを優先する。
未記録の場合は上記デフォルト値を使い、後で変更できると案内する）

**仮想環境の作成（pip インストールより前に実行する）：**
```
自動展開：  python3 -m venv .venv  を実行する（確認なし）
確認付き展開：「python3 -m venv .venv を作成しますか？」と確認し、承認後に実行する
展開なし：  コマンドを提示するのみ（実行しない）
```
- 仮想環境作成後、`env-check.ts` Plugin が `python3` / `pip` コマンドを自動的に `.venv/bin/` 配下に書き換える
- `source .venv/bin/activate` は不要（Plugin がパス解決するため）
- OS 別の python3 存在確認は `_install-protocol.md` の共通プロトコルに従う

**開発ツールのインストール（`requirements-dev.txt` を SSOT として使用）：**
```bash
# 仮想環境内にインストール（グローバルにはインストールしない）
.venv/bin/pip install -r requirements-dev.txt
```
`pip` 未インストールの場合は以下の優先順位でインストールする：
1. `python3 -m ensurepip --upgrade` を試す
2. 失敗した場合は OS 標準のパッケージマネージャーで `python3-pip` をインストールする

**依存パッケージ追加時のルール（開発中の全フェーズで適用）：**
```bash
# 1. 仮想環境内にインストール
.venv/bin/pip install <package>

# 2. バージョンを requirements.txt に固定（追記）
.venv/bin/pip freeze | grep -i "<package>" >> requirements.txt
```
- `pip install` のたびに `pip freeze | grep` でバージョン行を `requirements.txt` に追記する
- 既存行と重複した場合は手動で整理する（AI が判断）

**依存バージョンの更新時：**
```bash
# 1. requirements.txt のバージョン番号を直接編集する
# 2. 反映
.venv/bin/pip install -r requirements.txt
```
- `pip install --upgrade` は使わない（ロックが外れるため）
- 更新後は `pip freeze` でバージョンが意図通り変わったか確認する

**`requirements.txt` テンプレート：**
```
# 本番環境の依存パッケージ
# 追加時: .venv/bin/pip freeze | grep <package> >> requirements.txt
# 更新時: バージョン番号を直接書き換えてから .venv/bin/pip install -r requirements.txt
```

**`requirements-dev.txt` テンプレート：**
```
# 開発環境のみの依存パッケージ
# pip install -r requirements-dev.txt でインストール
-r requirements.txt
pytest
pytest-cov
ruff
mypy
```

**`pyproject.toml` テンプレート（Ruff 設定）：**
```toml
[tool.ruff]
line-length = 100
target-version = "py312"

[tool.ruff.lint]
select = ["E", "F", "I", "N", "W", "UP"]
ignore = []

[tool.ruff.format]
quote-style = "double"
indent-style = "space"

[tool.mypy]
strict = true
```

展開後、ユーザーに以下を案内する：
> Python プロジェクト用の設定ファイルを作成しました。
> lint・フォーマットの自動チェックには `.opencode/plugins/lint-and-typecheck.ts` が有効です（`.opencode/plugins/README.md` 参照）。
> `pyproject.toml` に追加設定が必要な場合は指示してください。
