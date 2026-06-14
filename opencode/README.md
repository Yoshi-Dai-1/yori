# yori

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
bash <(curl -s https://raw.githubusercontent.com/yoshi-dai/yori/main/opencode/setup-harness.sh)
```

スクリプトが自動的に yori リポジトリを一時クローンし、テンプレートを展開します。

### 方式 B：npm

```bash
npx @yoshi-dai/yori
```

### 方式 C：git clone

```bash
git clone https://github.com/yoshi-dai/yori.git
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

### Step 1：`docs/project-definition.md` を記入する

AI と対話しながら記入します。.opencode/standards/principles/project-definition-guide.md の対話プロンプトを AI に渡してください。

### Step 2：`ARCHITECTURE.md` を記入する

### Step 3：`AGENTS.md` を記入する

### Step 4：`opencode.json` の設定を確認する

詳細は `opencode/setup-harness.sh` 実行後の案内を参照してください。

---

## ディレクトリ構成

```
yori/
  opencode/
    setup-harness.sh       セットアップスクリプト
    README.md              このファイル
    principles/            汎用原則（harness-engineering, security, code-quality 等）
    architectures/          プロジェクト種別ごとの構成パターン
    decisions/              判断の記録・ADR
    snippets/               テンプレート集
      agents/               AGENTS.md テンプレート・サブエージェント定義
      .opencode/            ハーネス雛形（instructions/ / skills/ / plugins/）
      docs/                 ドキュメント雛形
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
    config/                 SSoT ファイル（secret-patterns, skills.lock）
    standards/              yori のコピー（principles/ / architectures/）
      principles/.local/    プロジェクト固有の上書き用
      architectures/.local/ プロジェクト固有の上書き用
    handoff-artifact.md     セッション間引き継ぎ
    project-context.md      プロジェクト文脈
    coding-conventions.md   コーディング規約
  .env                      環境変数（値は人間のみ入力）
  .env.example              環境変数テンプレート（コミット対象）
  .editorconfig             エディタ間コードスタイル統一
  .git/hooks/pre-commit     機密情報コミット防止フック
```

---

## 最低限のセットアップ

yori のセットアップが完了したら、以下の 4ファイルを AI と対話しながら記入します：

1. `docs/project-definition.md` — プロジェクトの目的・要件・制約
2. `ARCHITECTURE.md` — 技術スタック・層のルール
3. `AGENTS.md` — プロジェクト名・コマンド・禁止事項
4. `.opencode/project-context.md` — 軽量な文脈補完

この 4ステップが完了して初めてハーネスとして機能し始めます。

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
