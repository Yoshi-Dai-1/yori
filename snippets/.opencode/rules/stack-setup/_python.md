#### Python が含まれる場合

```
requirements.txt      → 下記テンプレートで作成
requirements-dev.txt  → 下記テンプレートで作成
.python-version       → 下記テンプレートで作成
pyproject.toml        → 下記テンプレートで作成（Ruff・mypy の設定を含む）
```

**インストールを実行する（全OS対応）：**
```bash
pip install ruff mypy
```
（mypy は `requirements-dev.txt` に含まれているが、グローバルにもインストール推奨）
`pip` 未インストールの場合は以下の優先順位でインストールする：
1. `python -m ensurepip --upgrade` を試す
2. 失敗した場合は OS 標準のパッケージマネージャー（apt / dnf / brew / choco）で `python3-pip` または `python-pip` をインストールする

**`requirements.txt` テンプレート：**
```
# 本番環境の依存パッケージ
# pip install -r requirements.txt でインストール
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

**`.python-version` テンプレート：**
```
3.12
```
（バージョンは ARCHITECTURE.md に記載がある場合はそちらを優先する）

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
> `pyproject.toml` に追加設定が必要な場合は「pyproject.toml を編集して」と伝えてください。
