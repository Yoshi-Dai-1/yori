---
name: playwright-setup
description: |
  playwright-cli のセットアップ確認・インストールを行うスキル。
  @evaluator が評価を始める前に必ず呼び出す。
  Make sure to use this skill whenever the user mentions 「テスト」「E2E」「ブラウザテスト」
  「ビジュアルリグレッション」「スナップショットテスト」「playwright」— even if the user
  only wants to run a single test or check if tests are configured.
  Do NOT use for unit tests or API tests (those don't need a browser).
---

<!-- template-version: 1.0.0, template-status: active -->

# playwright-cli セットアップ

評価を始める前に必ずこの手順を実行する。

## Step 1：インストール確認

```bash
playwright-cli --version
```

**インストール済み → Step 2 へ進む。**

**未インストール → 人間に以下を確認する：**

```
playwright-cli がインストールされていません。
インストール方法を選んでください：

  1. グローバル（推奨）
     すべてのプロジェクトで共有されます。
     実行コマンド: npm install -g @playwright/cli@latest

  2. ローカル（企業環境・権限制限がある場合）
     このプロジェクト内にのみインストールされます。
     実行コマンド: npm install --save-dev @playwright/cli@latest

  3. スキップ
     コードレビューベースで評価します（ビジュアル品質・安定性の判定精度が下がります）。

1 / 2 / 3 のいずれかを教えてください。
```

人間の回答に応じて以下を実行する：

- **1（グローバル）を選択**：
  ```bash
  npm install -g @playwright/cli@latest
  playwright-cli install-browser
  ```
  完了後、Step 2 へ進む。

- **2（ローカル）を選択**：
  ```bash
  npm install --save-dev @playwright/cli@latest
  npx playwright-cli install-browser
  ```
  完了後、以降のすべての `playwright-cli` コマンドを `npx playwright-cli` に読み替えて Step 2 へ進む。

- **3（スキップ）を選択**：
  フォールバックモードで評価を継続する（後述）。

## Step 2：スキルの確認

```bash
ls .playwright-cli/SKILL.md 2>/dev/null && echo "スキルあり" || echo "スキルなし"
```

**スキルなしの場合 → 人間に以下を確認する：**

```
playwright-cli のスキル（コマンドリファレンス）がこのプロジェクトに
インストールされていません。
インストールするとAIがコマンドを正確に把握でき、誤操作のリスクが下がります。

インストールしますか？（推奨: yes）
yes / no
```

- **yes**：`playwright-cli install --skills`（ローカル選択時は `npx playwright-cli install --skills`）を実行する。
- **no**：スキルなしで続行する（`playwright-cli --help` でコマンドを都度確認しながら進める）。

## フォールバックモード

playwright-cli をスキップした場合、コードレビューベースで評価する。
スナップショット・スクリーンショットによる視覚的確認は行わず、
コードの読み取りと分析のみで判定する。

判定精度が下るため、以下の点に注意する：
- ビジュアル品質（Design Quality）は「コード上の実装」から推定する
- エラーハンドリングはコードを読んで確認する
- ユーザーフローはコードの遷移図から確認する
