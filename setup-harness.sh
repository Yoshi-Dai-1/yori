#!/bin/bash
# setup-harness.sh
# dev-standardsのテンプレートを新プロジェクトにコピーする
#
# 使い方：
#   1. このスクリプトを新プロジェクトのルートに配置する
#   2. dev-standardsのパスを設定する（DEV_STANDARDS_PATH）
#   3. ./setup-harness.sh を実行する
#
# 実行後に必要な作業（人間が行う）：
#   1. AGENTS.md にプロジェクト固有の情報を記入する
#   2. ARCHITECTURE.md に設計情報を記入する
#   3. .claude/hooks/ の on-[イベント名].[目的].sh.example から
#      使いたいHookの .example を外してプロジェクトに合わせて修正する

set -e

# ========== 設定 ==========
DEV_STANDARDS_PATH="${DEV_STANDARDS_PATH:-../dev-standards}"
# ==========================

echo "🔧 ハーネスのセットアップを開始します..."
echo "   dev-standards: $DEV_STANDARDS_PATH"
echo ""

# dev-standardsの存在確認
if [ ! -d "$DEV_STANDARDS_PATH" ]; then
  echo "❌ dev-standards が見つかりません: $DEV_STANDARDS_PATH"
  echo "   DEV_STANDARDS_PATH 環境変数でパスを指定してください"
  exit 1
fi

SNIPPETS="$DEV_STANDARDS_PATH/snippets"

# .claude/ ディレクトリ作成
mkdir -p .claude/{rules,skills,agents,hooks,usage}

# docs/ ディレクトリ作成
mkdir -p docs

# decisions/ ディレクトリ作成（ADR・技術選定・スキル化候補の記録先）
mkdir -p decisions
cp "$DEV_STANDARDS_PATH/decisions/skill-candidates.md" decisions/skill-candidates.md
echo "✅ decisions/skill-candidates.md をコピーしました"

# ===== AGENTS.md のコピー =====
cp "$SNIPPETS/agents/AGENTS.md" AGENTS.md

# [DEV_STANDARDS_PATH] プレースホルダーを実際のパスに置換する
DEV_STANDARDS_ABS=$(cd "$DEV_STANDARDS_PATH" && pwd)
if sed --version 2>/dev/null | grep -q "GNU"; then
  sed -i "s|\[DEV_STANDARDS_PATH\]|$DEV_STANDARDS_ABS|g" AGENTS.md
else
  sed -i '' "s|\[DEV_STANDARDS_PATH\]|$DEV_STANDARDS_ABS|g" AGENTS.md
fi
echo "✅ AGENTS.md をコピーしました"

# ===== ARCHITECTURE.md のコピー =====
cp "$SNIPPETS/ARCHITECTURE.md.template" ARCHITECTURE.md
if sed --version 2>/dev/null | grep -q "GNU"; then
  sed -i "s|\[DEV_STANDARDS_PATH\]|$DEV_STANDARDS_ABS|g" ARCHITECTURE.md
else
  sed -i '' "s|\[DEV_STANDARDS_PATH\]|$DEV_STANDARDS_ABS|g" ARCHITECTURE.md
fi
echo "✅ ARCHITECTURE.md をコピーしました"

# ===== DESIGN.md のコピー（UIを持つプロジェクトのみ）=====
echo ""
read -r -p "このプロジェクトにWebフロントエンドのUIがありますか？ [y/N]: " HAS_UI
if [[ "$HAS_UI" =~ ^[Yy]$ ]]; then
  cp "$SNIPPETS/DESIGN.md.template" DESIGN.md
  echo "✅ DESIGN.md をコピーしました"
  HAS_UI_FLAG=true
else
  echo "ℹ️  DESIGN.md はスキップしました（UIなしプロジェクト）"
  HAS_UI_FLAG=false
fi

# ===== .claude/ 内のファイルをコピー =====
# coding-conventions
cp "$SNIPPETS/.claude/coding-conventions.md.template" .claude/coding-conventions.md
if sed --version 2>/dev/null | grep -q "GNU"; then
  sed -i "s|\[DEV_STANDARDS_PATH\]|$DEV_STANDARDS_ABS|g" .claude/coding-conventions.md
else
  sed -i '' "s|\[DEV_STANDARDS_PATH\]|$DEV_STANDARDS_ABS|g" .claude/coding-conventions.md
fi
echo "✅ .claude/coding-conventions.md をコピーしました"

# project-context
cp "$SNIPPETS/.claude/project-context.md.template" .claude/project-context.md
echo "✅ .claude/project-context.md をコピーしました"

# rules テンプレート
cp "$SNIPPETS/.claude/rules/_template.md" .claude/rules/_template.md
echo "✅ .claude/rules/_template.md をコピーしました"

# 組み込みSkillsをコピー（release-prep / live-operation / handoff）
# ※ find-skills・skill-creator は ~/.claude/skills/ にインストールされるため含まない
for SKILL_DIR in "$SNIPPETS/.claude/skills/"/*/; do
  SKILL_NAME=$(basename "$SKILL_DIR")
  cp -r "$SKILL_DIR" ".claude/skills/$SKILL_NAME/"
  # [DEV_STANDARDS_PATH] プレースホルダーを置換
  if sed --version 2>/dev/null | grep -q "GNU"; then
    sed -i "s|\[DEV_STANDARDS_PATH\]|$DEV_STANDARDS_ABS|g" ".claude/skills/$SKILL_NAME/SKILL.md"
  else
    sed -i '' "s|\[DEV_STANDARDS_PATH\]|$DEV_STANDARDS_ABS|g" ".claude/skills/$SKILL_NAME/SKILL.md"
  fi
done
echo "✅ .claude/skills/ に組み込みSkillsをコピーしました（release-prep / live-operation / handoff）"

# find-skills をインストール（外部スキル発見・インストールの自律判断を担う）
echo ""
echo "📦 find-skills をインストールしています..."
if command -v npx &>/dev/null; then
  npx skills add vercel-labs/skills --skill find-skills -a claude-code -y 2>/dev/null && \
    echo "✅ find-skills をインストールしました" || \
    echo "⚠️  find-skills のインストールをスキップしました（後で手動実行：npx skills add vercel-labs/skills --skill find-skills）"

  echo ""
  echo "📦 skill-creator をインストールしています..."
  npx skills add anthropics/skills --skill skill-creator -a claude-code -y 2>/dev/null && \
    echo "✅ skill-creator をインストールしました" || \
    echo "⚠️  skill-creator のインストールをスキップしました（後で手動実行：npx skills add anthropics/skills --skill skill-creator）"
else
  echo "⚠️  npx が見つかりません。Node.js をインストール後に手動実行してください："
  echo "     npx skills add vercel-labs/skills --skill find-skills"
  echo "     npx skills add anthropics/skills --skill skill-creator"
fi

# サブエージェント定義をコピー
for AGENT_FILE in "$SNIPPETS/agents/subagents/"*.md; do
  if [ -f "$AGENT_FILE" ]; then
    cp "$AGENT_FILE" .claude/agents/
  fi
done
echo "✅ .claude/agents/ にサブエージェント定義をコピーしました"
echo "   （planner / evaluator / code-reviewer / security-auditor / test-generator / codebase-investigator / resilience-checker / code-quality-auditor）"

# Hooks サンプルをコピー
cp "$SNIPPETS/.claude/hooks/"* .claude/hooks/
echo "✅ .claude/hooks/ にHooksサンプルをコピーしました"

# 使用履歴ファイルをコピー
cp "$SNIPPETS/.claude/usage/"* .claude/usage/
echo "✅ .claude/usage/ に使用履歴ファイルをコピーしました"

# handoff-artifact の雛形を作成
cat > .claude/handoff-artifact.md << 'EOF'
# Handoff Artifact
# 更新日時: （セッション終了時にAIが記入）
# このファイルは次のセッション開始時にコンテキストとして渡す
# 内容が空欄の場合は次のセッション開始時に「handoff-artifact.mdを更新して」と依頼する

## 前のセッションの状態

取り組んでいた機能:
完了した部分:
途中で止まっている部分:
次にやるべきこと:

## 重要な決定事項


## 未解決の問題


## 変更したファイル

EOF
echo "✅ .claude/handoff-artifact.md を作成しました"

# docs/ の雛形ファイルを作成
if [ ! -f "docs/project-definition.md" ]; then
  cat > docs/project-definition.md << 'DOCEOF'
# プロジェクト定義

<!-- このファイルをAIと対話しながら記入する -->
<!-- 対話プロンプトは dev-standards の principles/project-definition.md を参照 -->

## 目的（Why）


## 対象ユーザー（Who）

- 主なユーザー：
- 技術レベル：
- 主な使用環境：
- 利用頻度：

## 機能要件（What）

### Must（これがなければ成立しない）
-

### Should（重要だが必須ではない）
-

### Could（あれば良い）
-

### Won't（今回はやらない・明示的な除外）
-

## 技術制約（Constraint）

- 言語：
- デプロイ先：
- コスト上限：
- ライセンス：

## セキュリティ要件（Security Constraint）

- プロジェクト種別：
- 守るべき資産：
- 認証：

## リスク評価（Risk Assessment）

### 即死系リスク
-

### 緩慢死系リスク
-

## 成功基準（Definition of Done）

- [ ] Must要件がすべて動作する
- [ ]
DOCEOF
  echo "✅ docs/project-definition.md の雛形を作成しました"
fi

if [ ! -f "docs/operations.md" ]; then
  cat > docs/operations.md << 'OPSEOF'
# 運用手順書

<!-- 本番移行時にこのファイルを記入する -->
<!-- 詳細は dev-standards の principles/resilience.md を参照 -->

## 日常的な運用

### デプロイ方法


### ロールバック方法


### DBバックアップの確認方法


### バックアップからのリストア手順（月1回実施）

最終実施日：（未実施）

## 障害対応

### サービスがダウンしたとき

1.
2.

### データが壊れたとき

1.
2.

### セキュリティインシデントが発生したとき

1.
2.
3.

## 月次チェックリスト

- [ ] バックアップからのリストアテスト実施
- [ ] npm audit / pip-audit 実行・脆弱性対応
- [ ] 依存ライブラリの更新確認
- [ ] @resilience-checker を実行して診断
- [ ] モニタリング・アラートが正常に動作しているか確認
OPSEOF
  echo "✅ docs/operations.md の雛形を作成しました"
fi

# .gitignore に追加
if [ -f ".gitignore" ]; then
  if ! grep -q "handoff-artifact.md" .gitignore; then
    # handoff-artifact は必ずgitignore（セッション固有・個人の引き継ぎ情報）
    echo "" >> .gitignore
    echo "# ハーネス（セッション固有）" >> .gitignore
    echo ".claude/handoff-artifact.md" >> .gitignore

    # .claude/usage/ のgitignoreはプロジェクト性質による
    echo ""
    echo "📋 .claude/usage/ の管理方法を選択してください："
    echo "   .claude/usage/skill-usage.md はスキルの使用履歴ログです。"
    echo ""
    echo "   [1] gitignoreに追加する（推奨：個人開発 / 作業ログをチームと共有しない）"
    echo "       → 各自のローカルに蓄積。チーム間で共有されない。"
    echo "       → Hookの差分がgitに混入しない。"
    echo ""
    echo "   [2] gitignoreに追加しない（チーム開発 / スキル使用状況をチームで共有する）"
    echo "       → 全員の使用履歴がgitに記録される。月次GCの判断精度が上がる。"
    echo "       → Hookが毎セッション追記するため、コミット前に差分を確認する運用が必要。"
    echo ""
    read -r -p "選択 [1/2] (デフォルト: 1): " USAGE_GIT_CHOICE
    USAGE_GIT_CHOICE="${USAGE_GIT_CHOICE:-1}"

    if [ "$USAGE_GIT_CHOICE" = "1" ]; then
      echo ".claude/usage/" >> .gitignore
      echo "✅ .gitignore を更新しました（handoff-artifact.md・usage/ を追加）"
    else
      echo "✅ .gitignore を更新しました（handoff-artifact.md のみ追加。usage/ はgit管理）"
    fi
  fi
fi

echo ""
echo "🔍 セットアップの検証中..."
VALIDATION_FAILED=0

# プレースホルダーが残っていないか確認
for FILE in AGENTS.md ARCHITECTURE.md .claude/coding-conventions.md; do
  if [ -f "$FILE" ] && grep -q "\[DEV_STANDARDS_PATH\]" "$FILE" 2>/dev/null; then
    echo "❌ $FILE に [DEV_STANDARDS_PATH] プレースホルダーが残っています"
    VALIDATION_FAILED=1
  fi
done

# 必須ファイルの存在確認
for FILE in AGENTS.md ARCHITECTURE.md .claude/project-context.md \
            .claude/coding-conventions.md .claude/handoff-artifact.md; do
  if [ ! -f "$FILE" ]; then
    echo "❌ $FILE が作成されていません"
    VALIDATION_FAILED=1
  fi
done

# DESIGN.md の存在確認（UIありプロジェクトのみ）
if [ "$HAS_UI_FLAG" = true ] && [ ! -f "DESIGN.md" ]; then
  echo "❌ DESIGN.md が作成されていません"
  VALIDATION_FAILED=1
fi

if [ $VALIDATION_FAILED -eq 0 ]; then
  echo "✅ 検証通過：すべてのファイルが正常に配置されました"
else
  echo ""
  echo "⚠️  上記の問題を修正してから次のステップに進んでください"
  echo "   再実行: DEV_STANDARDS_PATH=$DEV_STANDARDS_PATH bash $DEV_STANDARDS_PATH/setup-harness.sh"
fi

echo ""
echo "🎉 セットアップ完了！"
echo ""
echo "次に行うこと："
echo ""
echo "  Step 1：project-definition.md を作成する（AIと対話）"
echo "    → dev-standards の principles/project-definition.md にある対話プロンプトを使う"
echo "    → 完成したら docs/project-definition.md として保存する"
echo ""
echo "  Step 2：ARCHITECTURE.md を記入する（AIと対話）"
echo "    → ARCHITECTURE.md の冒頭にある対話プロンプトをAIに渡す"
echo "    → project-definition.md を参照しながらAIが一緒に埋めてくれる"
echo "    → UIプロジェクトの場合、Step 2.5 で DESIGN.md 作成の要否を確認される"
echo ""
if [ "$HAS_UI_FLAG" = true ]; then
  echo "  Step 2.5：DESIGN.md を記入する（AIと対話）"
  echo "    → DESIGN.md の冒頭にある対話プロンプトをAIに渡す"
  echo "    → ARCHITECTURE.md の内容をもとにAIが一緒に埋めてくれる"
  echo ""
fi
echo "  Step 3：AGENTS.md を記入する（AIと対話）"
echo "    → AGENTS.md の Project Overview のコメント内にある対話プロンプトを使う"
echo "    → ARCHITECTURE.md の内容をもとにAIが一緒に埋めてくれる"
echo ""
echo "  Step 4：（任意）Hooksを有効にする"
echo "    → .claude/hooks/ の on-[イベント名].[目的].sh.example を参照"
echo "    → 使いたいHookの .example を外してプロジェクトに合わせて修正"
echo "    → chmod +x .claude/hooks/on-*.sh"
echo ""
echo "  Step 4.5：（任意）playwright-cli を設定する（@evaluator を使う場合）"
echo "    → CLIとブラウザ（全プロジェクト共有・マシンに1回のみ）："
echo "       npm install -g @playwright/cli@latest"
echo "       playwright-cli install-browser"
echo "    → スキル（このプロジェクト内に配置・プロジェクトごとに1回）："
echo "       playwright-cli install --skills"
echo "    → .playwright-cli/ を .gitignore に追加することを推奨"
echo ""
echo "  Step 5：AIとの最初のセッションを開始する"
echo "    → 以下をAIに渡してセッションを開始する："
echo "       AGENTS.md（このプロジェクトの作業指示）"
echo "       docs/project-definition.md（プロジェクトの目的・制約）"
echo ""
echo "参考ドキュメント："
echo "  $DEV_STANDARDS_PATH/principles/harness-engineering.md"
echo "  $DEV_STANDARDS_PATH/principles/security-implementation.md  ← 認証・セキュリティ実装時"
echo "  $DEV_STANDARDS_PATH/principles/code-quality.md             ← コード品質基準"
echo "  $DEV_STANDARDS_PATH/principles/risk-based-approach.md      ← 投資優先度の判断"
echo "  $DEV_STANDARDS_PATH/principles/resilience.md               ← 障害・復旧設計時"
