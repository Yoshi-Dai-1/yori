# yori

[English](README.md) | [日本語](README.ja.md)

[![MIT License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![npm version](https://img.shields.io/npm/v/@yoshi-dai/yori)](https://www.npmjs.com/package/@yoshi-dai/yori)
[![GitHub Stars](https://img.shields.io/github/stars/Yoshi-Dai-1/yori?style=flat)](https://github.com/Yoshi-Dai-1/yori)

AI エージェントとともに開発するためのハーネスエンジニアリングのナレッジベース。

**ハーネス**とは、AI エージェントの行動をガイドする外部構造（ルール・プラグイン・判断記録の総称）。AI に指示を書くのではなく、AI が自律的に判断・推論できる設計をプロジェクトに組み込む。

`yori`（このリポジトリ）自体がハーネスの設計図・テンプレート集。`opencode/setup-harness.sh` を実行することで各プロジェクトに実際のハーネスが展開される。

## Why yori

- AI の出力品質がセッションごとにばらつく
- AI に都度同じ指示を繰り返す
- AI が過去の判断を忘れる
- コンテキスト満杯時に AI が手を抜く（context anxiety）
- AI が機密情報をコミットしてしまう
- プロジェクトの知識が人間の頭の中だけにある

## Quick Start

```bash
# ターゲットプロジェクトのルートで実行（推奨）
bash <(curl -s https://raw.githubusercontent.com/Yoshi-Dai-1/yori/main/opencode/setup-harness.sh)
```

他のセットアップ方法（npm / git clone）は [opencode/README.ja.md](opencode/README.ja.md) を参照。

セットアップ後、プロジェクトを OpenCode で開いてセッションを開始すると、AI が自動的にプロジェクト定義・アーキテクチャ・設計のセットアップを案内する。

## Features

| カテゴリ | 数量 | 説明 |
|---|---|---|
| Principles | 23 | ハーネス工学・セキュリティ・コード品質・テスト戦略などの汎用原則 |
| Architectures | 13 | プロジェクト種別ごとの構成パターン（Web API / CLI / library 等） |
| Plugins | 18 | TypeScript によるイベント駆動ガードレール（秘密情報防止・診断・環境チェック・lint・スキル自動記録 等） |
| Instructions | 9 | セッションイベントに応じて注入されるルールファイル |
| Subagents | 9 | 特定タスクに特化したエージェント定義 |
| ADRs | 3 | アーキテクチャ判断の記録（Architecture Decision Records） |

## プロジェクト構造

```
yori/
  opencode/                 ハーネス設計図・テンプレート集（setup-harness.sh で配布）
    principles/             汎用原則
    architectures/          構成パターン
    decisions/              判断の記録（ADR）
    snippets/               テンプレート集（配布物）
    setup-harness.sh        セットアップスクリプト
    README.md               ハーネスのセットアップ手順（英語）
    README.ja.md            ハーネスのセットアップ手順（日本語）
  AGENTS.md                 yori 開発用エージェント定義
  README.md                 プロジェクト概要（英語）
  README.ja.md              プロジェクト概要（日本語）
  package.json              npm パッケージ定義
  cli.js                    npm 公開用エントリポイント
  setup-harness.ps1         Windows (WSL2) ラッパー
  .releaserc.json           semantic-release 設定
  .github/                  GitHub Actions ワークフロー
  .design-notes/            設計メモ（yori 開発用・コピー対象外）
```

## 関連リンク

- [opencode/README.ja.md](opencode/README.ja.md) — ハーネスのセットアップ手順・新プロジェクト開始手順
- [AGENTS.md](AGENTS.md) — yori 開発用のエージェント定義
- [LICENSE](LICENSE) — MIT License

## License

MIT
