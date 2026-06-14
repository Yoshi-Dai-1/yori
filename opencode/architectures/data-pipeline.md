# アーキテクチャ：データ処理・分析・スクリプト群

**向いている場面**：データパイプライン・バッチ処理・分析スクリプト・自動化ツール集
**言語**：Python中心（Node.jsにも応用可能）

---

## ディレクトリ構成

```
project-root/
  src/                          ソースコード
    commands/                   実行エントリポイント（CLIコマンド・バッチ）
      fetch_earnings.py         1コマンド = 1ファイル
      summarize_reports.py
      update_stock_list.py
    core/                       ビジネスロジック（コマンドから呼ばれる）
      earnings_processor.py
      report_summarizer.py
    adapters/                   外部ツール・API連携
      edinet_client.py
      database_client.py
      llm_client.py
    utils/                      純粋関数（副作用なし）
      formatters.py
      validators.py
      date_utils.py
    config/                     設定の読み込み
      settings.py               環境変数を型安全に読み込む

  data/                         データファイル（gitignoreするものが多い）
    raw/                        取得した生データ（コミットしない）
      .gitkeep
    processed/                  加工済みデータ（コミットしない）
      .gitkeep
    fixtures/                   テスト用固定データ（コミットする）
      sample_earnings.json

  notebooks/                    Jupyter Notebook（探索・実験用）
    exploration/                探索・試行（コミットしなくてよい）
    reports/                    共有する分析レポート

  tests/
    unit/
      test_earnings_processor.py
    integration/
      test_edinet_client.py

  outputs/                      生成物（コミットしない）
    .gitkeep

  scripts/                      開発補助スクリプト
    setup.sh
    run_all.sh

  requirements.txt              本番依存
  requirements-dev.txt          開発依存（pytest・mypy等）
  .env.example
  README.md
```

---

## スクリプトファイルのサイズ指針

| 種別 | 目安 |
|------|------|
| コマンドファイル（commands/） | 50行以内。引数解析とcore呼び出しのみ |
| coreファイル | 200行以内。1クラスまたは1機能 |
| utilsファイル | 100行以内。純粋関数のみ |

---

## 1コマンド = 1ファイルの原則

```python
# commands/fetch_earnings.py
# このファイルがやること：1つだけ
# - EDINET APIから決算データを取得してDBに保存する

from src.core.earnings_processor import EarningsProcessor
from src.adapters.edinet_client import EdinetClient
from src.config.settings import settings
import argparse

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--date', required=True)
    args = parser.parse_args()

    client = EdinetClient(api_key=settings.EDINET_API_KEY)
    processor = EarningsProcessor(client)
    processor.fetch_and_store(date=args.date)

if __name__ == '__main__':
    main()
```

---

## .gitignoreの設定

```
# data/（生データ・加工データはコミットしない）
data/raw/
data/processed/
outputs/

# Notebookのチェックポイント
notebooks/.ipynb_checkpoints/

# 環境
.env
__pycache__/
*.pyc
.venv/
```

---

## settings.py（型安全な環境変数読み込み）

```python
# src/config/settings.py
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    EDINET_API_KEY: str
    DATABASE_URL: str
    LOG_LEVEL: str = 'INFO'

    class Config:
        env_file = '.env'

settings = Settings()
# 以降は settings.EDINET_API_KEY のように型安全にアクセス
# 環境変数が不足していれば起動時にエラー
```

---

## Notebookの扱い

Notebookはコードとデータが混在し、gitでの差分管理が困難。

- `notebooks/exploration/` → 実験・探索用。gitignoreしてよい
- `notebooks/reports/` → 共有する分析結果。コミットする（nbstripout で出力をクリアしてから）
- 再利用可能なロジックはNotebookから `src/core/` に移す
