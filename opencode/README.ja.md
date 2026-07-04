# yori

[English](README.md) | [日本語](README.ja.md)

AI とともに開発するためのハーネスエンジニアリングのナレッジベース。
あらゆるプロジェクト種別に横断的に適用できる設計思想・テンプレート・原則を集積する。

```
yori（このリポジトリ）
  = ハーネスの設計図・テンプレート集

各プロジェクトの .opencode/
  = 実際に機能するハーネス本体

yori をプロジェクトに「配置」しても機能しない。
setup-harness.sh でテンプレートをコピーして、
プロジェクト固有の情報を記入することで初めて機能する。
```

---

## クイックスタート

### 方式 A：curl（Node.js 不要・推奨）

```bash
# ターゲットプロジェクトのルートで実行
bash <(curl -s https://raw.githubusercontent.com/Yoshi-Dai-1/yori/main/opencode/setup-harness.sh)
```

スクリプトが自動的に yori リポジトリを一時クローンし、テンプレートを展開します。

> **Windows での実行について**：
> 上記 `bash` コマンドは WSL2（Windows Subsystem for Linux）または Git Bash が必要です。
>
> **WSL2 を使用する場合（推奨）**：
> ```
> wsl --install            # 初回のみ（管理者 PowerShell）
> ```
> その後、WSL 内の bash で curl/npm/git clone の各方式を実行してください。
>
> **Git Bash を使用する場合**：
> Git for Windows をインストール後、Git Bash ターミナルで curl/npm/git clone の各方式を実行してください。
>
> **npm 方式の場合**：`npx @yoshi-dai/yori` は、Windows では自動的に `setup-harness.ps1`（WSL2 ラッパー）を起動します。

### 方式 B：npm

```bash
npx @yoshi-dai/yori
```

### 方式 C：git clone

```bash
git clone https://github.com/Yoshi-Dai-1/yori.git
cd ターゲットプロジェクト
bash ../yori/opencode/setup-harness.sh
```

---

## 新プロジェクト開始時の手順

### Step 0：ターゲットプロジェクトでセットアップスクリプトを実行する

上記いずれかの方式で `opencode/setup-harness.sh` を実行します。
実行後、以下のファイルが作成/コピーされます：

- `AGENTS.md`：プロジェクトのエントリポイント（60〜200行）
- `docs/`：プロジェクト定義・運用手順書・各種テンプレート
- `.opencode/`：ハーネス本体（instructions/ / skills/ / plugins/ / agents/）
- `.opencode/standards/`：yori の参照ドキュメント（principles/ / architectures/）
- `opencode.json`：OpenCode 設定ファイル
- `.env`, `.env.example`, `.editorconfig`
- `.git/hooks/pre-commit`：機密情報コミット防止フック

**再実行は安全です**：プロジェクト固有ファイルは上書きされません。
`.opencode/standards/` は常に最新の yori に更新されます。

### Step 1：プロジェクトを OpenCode で開く

ターゲットプロジェクトのフォルダを OpenCode で開き、AI にセッションを開始するよう伝えてください。

### Step 2：AI の案内に従う

AI が自動的にプロジェクト定義・アーキテクチャ・設計のセットアップを案内します。AI の質問に答えていくと、`docs/project-definition.md`、`ARCHITECTURE.md`、`AGENTS.md`、`.opencode/project-context.md` が自動的に記入されます。

---

## ディレクトリ構成

```
yori/
  opencode/
    setup-harness.sh       セットアップスクリプト
    README.md              セットアップ手順（英語）
    README.ja.md           セットアップ手順（日本語）
    principles/            汎用原則（harness-engineering, security, code-quality 等）
    architectures/          プロジェクト種別ごとの構成パターン
    decisions/              判断の記録・ADR
    snippets/               テンプレート集
      agents/               AGENTS.md テンプレート・サブエージェント定義
      .opencode/            ハーネス雛形（instructions/ / skills/ / plugins/）
      design/               デザイントークン雛形
      docs/                 ドキュメント雛形
      opencode.json         OpenCode 設定テンプレート
      .editorconfig         エディタ間コードスタイル統一
      .env.example          環境変数テンプレート
```

---

## セットアップ後のプロジェクト構成

```
ターゲットプロジェクト/
  AGENTS.md                 エントリポイント（60〜200行）
  ARCHITECTURE.md           アーキテクチャ定義
  opencode.json             OpenCode 設定
  docs/
    project-definition.md   プロジェクト定義
    operations.md           運用手順書
    quality-scorecard.md    品質スコアカード
    build-log.md            ビルドログ
    working/                作業ディレクトリ
  .opencode/
    instructions/           ルールファイル（イベント駆動で注入）
    plugins/                TypeScript Plugin（自動ガードレール）
    skills/                 プロジェクトスコープのスキル
    agents/                 サブエージェント定義
    config/                 SSoT ファイル（secret-patterns.json / skills.lock.yaml）
    standards/              yori のコピー（principles/ / architectures/）
      principles/.local/    プロジェクト固有の上書き用
      architectures/.local/ プロジェクト固有の上書き用
    adr-index.md            ADR インデックス（月次診断時に自動更新）
    handoff-artifact.md     セッション間引き継ぎ
    project-context.md      プロジェクト文脈
    coding-conventions.md   コーディング規約
  .env                      環境変数（値は人間のみ入力）
  .env.example              環境変数テンプレート（コミット対象）
  .editorconfig             エディタ間コードスタイル統一
  .git/hooks/pre-commit     機密情報コミット防止フック
```

---

## 前提条件

- **Bun**: `.opencode/plugins/` の TypeScript プラグインを実行するために必要。
  未インストールの場合は [bun.sh](https://bun.sh) の手順に従ってインストールする。
- **git**: セットアップスクリプトの実行と pre-commit フックの設定に必要。

## 最低限のセットアップ

yori のセットアップが完了したら、プロジェクトを OpenCode で開いてセッションを開始してください。AI が自動的に以下のセットアップを案内します：

1. `docs/project-definition.md` — プロジェクトの目的・要件・制約
2. `ARCHITECTURE.md` — 技術スタック・層のルール
3. `AGENTS.md` — プロジェクト名・コマンド・禁止事項
4. `.opencode/project-context.md` — 軽量な文脈補完

これらが完了して初めてハーネスとして機能し始めます。

---

## ハーネスの育て方

- **instructions/**: AI から同じ指摘を 2回受けたら追加
- **skills/**: 同じ作業が 3回以上発生したらスキル化
- **月次診断**: 「月次診断して」と伝えるだけで自動実行
- **本番リリース**: 「本番に出したい」と伝えるだけで準備を案内

詳細は `.opencode/standards/principles/harness-engineering.md` を参照。

---

## 更新ルール

- `opencode/principles/` を変更した場合は各プロジェクトの `.opencode/standards/` を再コピーする
- `opencode/architectures/` はプロジェクト経験に基づいて随時更新する
- `opencode/decisions/` は削除しない
- `opencode/snippets/` の設定ファイルは動作確認したものだけを入れる
