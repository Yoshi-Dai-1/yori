#!/bin/bash
# setup-harness.sh
# yori のハーネステンプレートを新プロジェクトにコピーする
#
# 使い方：
#   curl 方式（推奨）:
#     bash <(curl -s https://raw.githubusercontent.com/Yoshi-Dai-1/yori/main/opencode/setup-harness.sh)
#
#   npm 方式:
#     npx @yoshi-dai/yori
#
#   git clone 方式:
#     git clone https://github.com/Yoshi-Dai-1/yori.git
#     cd ターゲットプロジェクト && bash ../yori/opencode/setup-harness.sh
#
# 実行後に必要な作業（人間が行う）：
#   1. docs/project-definition.md をAIと対話しながら記入する
#   2. ARCHITECTURE.md をAIと対話しながら記入する
#   3. AGENTS.md をAIと対話しながら記入する
#
# opencode.json はこのスクリプトが自動設定します。

# ===== Non-interactive pre-flight check =====
# AIエージェントが対話なしで実行するのを防ぐ。
# 端末（stdin が TTY）でない場合、3つの環境変数が全て設定されていることを要求する。
if [ ! -t 0 ]; then
  _MISSING=()
  [ -z "$YORI_HAS_UI" ] && _MISSING+=("YORI_HAS_UI")
  [ -z "$YORI_QUALITY_STRATEGY_CHOICE" ] && _MISSING+=("YORI_QUALITY_STRATEGY_CHOICE")
  [ -z "$YORI_USAGE_GIT_CHOICE" ] && _MISSING+=("YORI_USAGE_GIT_CHOICE")
  if [ ${#_MISSING[@]} -gt 0 ]; then
    echo ""
    echo "=============================================="
    echo " yori setup requires interactive input"
    echo "=============================================="
    echo ""
    echo "Non-interactive environment detected."
    echo "Ask the user for the following decisions, then re-run:"
    echo ""
    for _VAR in "${_MISSING[@]}"; do
      echo "  $_VAR=<value>"
    done
    echo ""
    echo "Details:"
    echo "  YORI_HAS_UI                  : y/n (Web frontend UI?)"
    echo "  YORI_QUALITY_STRATEGY_CHOICE : 1/2/3 (quality diagnosis strategy)"
    echo "  YORI_USAGE_GIT_CHOICE        : 1/2 (usage/ gitignore?)"
    echo ""
    echo "Example (all defaults):"
    echo "  YORI_HAS_UI=n YORI_QUALITY_STRATEGY_CHOICE=1 YORI_USAGE_GIT_CHOICE=1 bash setup-harness.sh"
    echo ""
    exit 1
  fi
  unset _MISSING _VAR
fi

set -e

# ========== yori のパスを解決 ==========
# 優先順位:
#   1. YORI_PATH 環境変数（明示指定）
#   2. このスクリプトからの相対パス（git clone / npm 方式）
#   3. 自動クローン（curl 方式）
SCRIPT_DIR=""
if [ -n "$0" ] && [ "$0" != "bash" ]; then
  SCRIPT_DIR="$(cd "$(dirname "$0")" 2>/dev/null && pwd)" || SCRIPT_DIR=""
fi

if [ -n "$YORI_PATH" ]; then
  YORI_SRC="$YORI_PATH"
elif [ -n "$SCRIPT_DIR" ] && [ -f "$SCRIPT_DIR/snippets/agents/AGENTS.md" ]; then
  YORI_SRC="$SCRIPT_DIR"
else
  YORI_TMP=$(mktemp -d)
  echo "📦 yori をダウンロードしています..."
  git clone --depth 1 https://github.com/Yoshi-Dai-1/yori.git "$YORI_TMP" 2>/dev/null || {
    echo "❌ yori のダウンロードに失敗しました"
    echo "   YORI_PATH 環境変数でパスを指定してください"
    exit 1
  }
  YORI_SRC="$YORI_TMP/opencode"
fi
# ======================================

echo "🔧 ハーネスのセットアップを開始します..."
echo "   yori: $YORI_SRC"
echo ""

# 配布元の存在確認
if [ ! -d "$YORI_SRC" ]; then
  echo "❌ yori が見つかりません: $YORI_SRC"
  echo "   YORI_PATH 環境変数でパスを指定してください"
  exit 1
fi

SNIPPETS="$YORI_SRC/snippets"

# Git リポジトリの初期化（未初期化の場合のみ自動実行）
if [ ! -d ".git" ]; then
  git init
  echo "✅ Git リポジトリを初期化しました / Git repository initialized"
fi

# .opencode/ ディレクトリ作成
mkdir -p .opencode/{instructions,skills,agents,plugins,usage}

# docs/ ディレクトリ作成
mkdir -p docs

# decisions/ ディレクトリ作成（ADR・技術選定の記録先）
mkdir -p decisions

# ===== ADR テンプレートのコピー（常に最新版を反映） =====
cp "$SNIPPETS/docs/adr-template.md" decisions/000-template.md
echo "✅ decisions/000-template.md をコピーしました（ADR作成用テンプレート）"

# ===== AGENTS.md のコピー =====
if [ ! -f "AGENTS.md" ]; then
  cp "$SNIPPETS/agents/AGENTS.md" AGENTS.md

  echo "✅ AGENTS.md をコピーしました"
else
  echo "ℹ️  AGENTS.md は既に存在します（上書き保護）"
fi

# ===== AGENTS.md 記入ガイドのコピー（常に最新版を反映） =====
if [ -f "$SNIPPETS/.opencode/instructions/_fill-guide.md" ]; then
  mkdir -p .opencode/instructions
  cp "$SNIPPETS/.opencode/instructions/_fill-guide.md" .opencode/instructions/agents-fill-guide.md
  echo "✅ .opencode/instructions/agents-fill-guide.md をコピーしました（AGENTS.md 記入時にAIが参照）"
fi

# ===== ARCHITECTURE.md のコピー =====
if [ ! -f "ARCHITECTURE.md" ]; then
  cp "$SNIPPETS/ARCHITECTURE.md.template" ARCHITECTURE.md
  echo "✅ ARCHITECTURE.md をコピーしました"
else
  echo "ℹ️  ARCHITECTURE.md は既に存在します（上書き保護）"
fi

# ===== DESIGN.md のコピー（UIを持つプロジェクトのみ）=====
echo ""
if [ -t 0 ]; then
  read -r -p "このプロジェクトにWebフロントエンドのUIがありますか？ / Does this project have a web frontend UI? [y/N]: " HAS_UI
  HAS_UI="${HAS_UI:-n}"
else
  HAS_UI="${YORI_HAS_UI:-n}"
fi
if [[ "$HAS_UI" =~ ^[Yy]$ ]]; then
  if [ ! -f "DESIGN.md" ]; then
    cp "$SNIPPETS/DESIGN.md.template" DESIGN.md
    echo "✅ DESIGN.md をコピーしました"
  else
    echo "ℹ️  DESIGN.md は既に存在します（上書き保護）"
  fi
  mkdir -p design
  if [ ! -f "design/INTAKE.md" ]; then
    cp "$SNIPPETS/design/INTAKE.md.template" design/INTAKE.md
    echo "✅ design/INTAKE.md をコピーしました"
  else
    echo "ℹ️  design/INTAKE.md は既に存在します（上書き保護）"
  fi
  for DESIGN_TEMPLATE in "$SNIPPETS/design/token-ssot.json.template" "$SNIPPETS/design/component-map.json.template"; do
    if [ -f "$DESIGN_TEMPLATE" ]; then
      TARGET_NAME=$(basename "$DESIGN_TEMPLATE")
      if [ ! -f "design/$TARGET_NAME" ]; then
        cp "$DESIGN_TEMPLATE" "design/$TARGET_NAME"
        echo "✅ design/$TARGET_NAME をコピーしました"
      fi
    fi
  done
  HAS_UI_FLAG=true
else
  echo "ℹ️  DESIGN.md はスキップしました（UIなしプロジェクト）"
  HAS_UI_FLAG=false
fi


# ===== .opencode/ 内のファイルをコピー =====
# coding-conventions
if [ ! -f ".opencode/coding-conventions.md" ]; then
  cp "$SNIPPETS/.opencode/coding-conventions.md.template" .opencode/coding-conventions.md
  echo "✅ .opencode/coding-conventions.md をコピーしました"
else
  echo "ℹ️  .opencode/coding-conventions.md は既に存在します（上書き保護）"
fi

# project-context
if [ ! -f ".opencode/project-context.md" ]; then
  cp "$SNIPPETS/.opencode/project-context.md.template" .opencode/project-context.md
  echo "✅ .opencode/project-context.md をコピーしました"
else
  echo "ℹ️  .opencode/project-context.md は既に存在します（上書き保護）"
fi

# instructions テンプレート（常に最新版を反映）
# 含まれるルール：cli-first.md / code-quality.md / code-review.md / design-contract.md / directory-structure.md / naming-conventions.md / network-resilience.md / network-resilience/*.md / requirements-change.md / security.md / security/*.md / stack-setup.md / stack-setup/*.md / tdd-cycle.md / _shared/*.md / _template.md
# 除外：_fill-guide.md（AGENTS.md 記入ガイドは別のコピー処理で agents-fill-guide.md にリネームして配置）
while IFS= read -r -d '' RULE_FILE; do
  BASENAME=$(basename "$RULE_FILE")
  [[ "$BASENAME" == "_fill-guide.md" ]] && continue
  REL_PATH="${RULE_FILE#"$SNIPPETS"/.opencode/instructions/}"
  REL_PATH="${REL_PATH#/}"
  TARGET=".opencode/instructions/$REL_PATH"
  mkdir -p "$(dirname "$TARGET")"
  cp "$RULE_FILE" "$TARGET"
  echo "✅ .opencode/instructions/$REL_PATH をコピーしました"
done < <(find "$SNIPPETS/.opencode/instructions/" -name "*.md" -type f -print0)

# 全Skillsをコピー
# - 機能スキル（handoff / live-operation / playwright-setup / release-prep）: 常に最新版を反映
# - スタブスキル（find-skills / skill-creator）: 外部インストール保護のため上書き禁止
for SKILL_DIR in "$SNIPPETS/.opencode/skills/"/*/; do
  SKILL_NAME=$(basename "$SKILL_DIR")
  case "$SKILL_NAME" in
    find-skills|skill-creator)
      if [ ! -d ".opencode/skills/$SKILL_NAME" ]; then
        cp -r "$SKILL_DIR" ".opencode/skills/$SKILL_NAME/"
      fi
      ;;
    *)
      cp -r "$SKILL_DIR" ".opencode/skills/$SKILL_NAME/"
      ;;
  esac
done
echo "✅ .opencode/skills/ に組み込みSkillsをコピーしました（release-prep / live-operation / handoff / playwright-setup / find-skills + skill-creator は保護）"

# サブエージェント定義をコピー（常に最新版を反映）
for AGENT_FILE in "$SNIPPETS/agents/subagents/"*.md; do
  if [ -f "$AGENT_FILE" ]; then
    cp "$AGENT_FILE" .opencode/agents/
  fi
done
echo "✅ .opencode/agents/ にサブエージェント定義をコピーしました"
echo "   （planner / evaluator / code-reviewer / security-designer / security-auditor / test-generator / codebase-investigator / resilience-checker / code-quality-auditor）"

# サブエージェント共有ファイル（_shared/）をコピー（常に最新版を反映）
mkdir -p .opencode/agents/_shared
for SHARED_FILE in "$SNIPPETS/agents/_shared/"*.md; do
  if [ -f "$SHARED_FILE" ]; then
    SHARED_NAME=$(basename "$SHARED_FILE")
    cp "$SHARED_FILE" ".opencode/agents/_shared/$SHARED_NAME"
    echo "✅ .opencode/agents/_shared/$SHARED_NAME をコピーしました"
  fi
done
echo "✅ .opencode/agents/_shared/ に共有ファイルをコピーしました"

# standards をコピー（principles/ architectures/）
# .opencode/standards/ に配置することで、AIがアクセス制限なく参照できる
# P1-5 修正：マージ戦略を導入。既存ファイルは上書きせず、差分があれば警告。
#           プロジェクト固有の上書きは .local/ ディレクトリで対応。
mkdir -p .opencode/standards/principles .opencode/standards/architectures
mkdir -p .opencode/standards/principles/.local
mkdir -p .opencode/standards/architectures/.local

# .local/ ディレクトリの説明ファイル
if [ ! -f ".opencode/standards/principles/.local/README.md" ]; then
  cat > ".opencode/standards/principles/.local/README.md" << 'LOCALREADME'
# プロジェクト固有の上書き（principles/）

このディレクトリに置かれたファイルは、同名の yori ファイルより優先されます。
yori 側の同名ファイルが更新されても上書きされません。

使い方：
1. `.opencode/standards/principles/<file>.md` を編集
2. 同じファイル名で `.opencode/standards/principles/.local/<file>.md` に保存
3. 編集後にこのディレクトリの同名ファイルを参照するようにする

例：yori の `security-requirements.md` をプロジェクト固有の
リスクプロファイルに合わせて上書きしたい場合
1. `.opencode/standards/principles/.local/security-requirements.md` を作成
2. 内容をカスタマイズ
3. プロジェクト内の他のファイルからこの .local 版を参照する

注意：yori 側の更新内容を取り込みたい場合は手動マージが必要です。
LOCALREADME
  echo "ℹ️  .opencode/standards/principles/.local/README.md を作成しました（プロジェクト固有の上書き機構）"
fi

if [ ! -f ".opencode/standards/architectures/.local/README.md" ]; then
  cat > ".opencode/standards/architectures/.local/README.md" << 'LOCALREADME'
# プロジェクト固有の上書き（architectures/）

このディレクトリに置かれたファイルは、同名の yori ファイルより優先されます。
詳細は `.opencode/standards/principles/.local/README.md` を参照。
LOCALREADME
fi

# principles/ のマージコピー（差分はログファイルに記録、画面には件数のみ表示）
SETUP_DIFF_LOG=".opencode/.setup-diff.log"
echo "# yori setup differences $(date)" > "$SETUP_DIFF_LOG"
DIFF_COUNT=0
NEW_COUNT=0
for SRC_FILE in "$YORI_SRC/principles/"*.md; do
  [ -f "$SRC_FILE" ] || continue
  FNAME=$(basename "$SRC_FILE")
  TARGET=".opencode/standards/principles/$FNAME"

  if [ ! -f "$TARGET" ]; then
    cp "$SRC_FILE" "$TARGET"
    NEW_COUNT=$((NEW_COUNT + 1))
  elif ! diff -q "$SRC_FILE" "$TARGET" > /dev/null 2>&1; then
    DIFF_COUNT=$((DIFF_COUNT + 1))
    echo "--- principles/$FNAME ---" >> "$SETUP_DIFF_LOG"
    diff "$SRC_FILE" "$TARGET" >> "$SETUP_DIFF_LOG" 2>&1
    echo "" >> "$SETUP_DIFF_LOG"
  fi
done

# architectures/ のマージコピー
for SRC_FILE in "$YORI_SRC/architectures/"*.md; do
  [ -f "$SRC_FILE" ] || continue
  FNAME=$(basename "$SRC_FILE")
  TARGET=".opencode/standards/architectures/$FNAME"

  if [ ! -f "$TARGET" ]; then
    cp "$SRC_FILE" "$TARGET"
    NEW_COUNT=$((NEW_COUNT + 1))
  elif ! diff -q "$SRC_FILE" "$TARGET" > /dev/null 2>&1; then
    DIFF_COUNT=$((DIFF_COUNT + 1))
    echo "--- architectures/$FNAME ---" >> "$SETUP_DIFF_LOG"
    diff "$SRC_FILE" "$TARGET" >> "$SETUP_DIFF_LOG" 2>&1
    echo "" >> "$SETUP_DIFF_LOG"
  fi
done

if [ "$DIFF_COUNT" -gt 0 ]; then
  echo "ℹ️  principles/architectures/ に ${DIFF_COUNT} ファイルの差分があります / ${DIFF_COUNT} file(s) differ（${SETUP_DIFF_LOG} に記録 / logged）"
fi
echo "✅ standards/ をマージコピーしました（新規 ${NEW_COUNT} / 差分保持 ${DIFF_COUNT}）"

VALIDATION_FAILED=0

# security-requirements.md の存在を明示確認
if [ ! -f ".opencode/standards/principles/security-requirements.md" ]; then
  echo "❌ security-requirements.md のコピーに失敗しました"
  VALIDATION_FAILED=1
fi

# 参照パスはコピー元で既に .opencode/standards/ 形式に統一済み（2026-06 修正）。
# 旧形式の混在による書き換えは P0-1 として解消済み。
# 検証：コピー後の .opencode/standards/ 配下の .md ファイルに
#      「.opencode/standards/principles/」「.opencode/standards/architectures/」以外の
#      相互参照（principles/xxx.md / architectures/xxx.md）が残っていないか確認
STALE_REF=$(grep -rE "(^|[^/])principles/[a-z_-]+\.md" .opencode/standards/ 2>/dev/null | grep -v ".opencode/standards/principles/" | wc -l | tr -d ' ')
STALE_REF_ARCH=$(grep -rE "(^|[^/])architectures/[a-z_-]+\.md" .opencode/standards/ 2>/dev/null | grep -v ".opencode/standards/architectures/" | wc -l | tr -d ' ')
if [ "$STALE_REF" -gt 0 ] || [ "$STALE_REF_ARCH" -gt 0 ]; then
  echo "⚠️  旧形式の相互参照が ${STALE_REF} 件（principles）+ ${STALE_REF_ARCH} 件（architectures）残っています"
  echo "    yori 側で修正してから再実行してください"
fi
echo "✅ .opencode/standards/ をコピーしました"
echo "   （principles/ 全ファイル・architectures/ 全ファイル）"
echo "   ℹ️  チームで共有する場合のみ .gitignore から .opencode/standards/ を外してください"

# TS Plugin ファイルと README をコピー（常に最新版を反映）
for PLUGIN_FILE in "$SNIPPETS/.opencode/plugins/"*.ts "$SNIPPETS/.opencode/plugins/README.md"; do
  if [ -f "$PLUGIN_FILE" ]; then
    PLUGIN_NAME=$(basename "$PLUGIN_FILE")
    cp "$PLUGIN_FILE" ".opencode/plugins/$PLUGIN_NAME"
  fi
done
echo "✅ .opencode/plugins/ に Plugin をコピーしました"

# SSoT ファイル（.opencode/config/）をコピー
# P1-1 修正：secret-patterns.json を SSoT として配置
# P1-4 修正：skills.lock.yaml もここに配置
mkdir -p .opencode/config
for CONFIG_FILE in "$SNIPPETS/.opencode/config/"*.json "$SNIPPETS/.opencode/config/"*.yaml "$SNIPPETS/.opencode/config/"*.yml; do
  if [ -f "$CONFIG_FILE" ]; then
    CONFIG_NAME=$(basename "$CONFIG_FILE")
    if [ ! -f ".opencode/config/$CONFIG_NAME" ]; then
      cp "$CONFIG_FILE" ".opencode/config/$CONFIG_NAME"
    fi
  fi
done
echo "✅ .opencode/config/ に SSoT ファイルをコピーしました"

# yori バージョンを skills.lock.yaml に自動記入
# 優先順位: package.json > git describe > "dev"
YORI_REPO_DIR=$(cd "$YORI_SRC/.." 2>/dev/null && pwd)
YORI_VERSION="dev"

# 1) package.json を最優先（npx/npm/git clone/curl すべてで同梱される）
if [ -f "$YORI_REPO_DIR/package.json" ]; then
  PKG_VER=$(grep '"version"' "$YORI_REPO_DIR/package.json" | head -1 | sed 's/.*"version": *"\([^"]*\)".*/\1/')
  if [ -n "$PKG_VER" ]; then
    YORI_VERSION="v$PKG_VER"
  fi
fi

# 2) package.json がない場合のみ git describe にフォールバック
if [ "$YORI_VERSION" = "dev" ] && [ -d "$YORI_REPO_DIR/.git" ] 2>/dev/null; then
  YORI_VERSION=$(git -C "$YORI_REPO_DIR" describe --tags --always 2>/dev/null || git -C "$YORI_REPO_DIR" rev-parse --short HEAD 2>/dev/null || echo "dev")
fi
if [ -f ".opencode/config/skills.lock.yaml" ]; then
  if grep -q "^yori_version:" ".opencode/config/skills.lock.yaml"; then
    if sed --version 2>/dev/null | grep -q "GNU"; then
      sed -i "s/^yori_version:.*/yori_version: \"$YORI_VERSION\"/" ".opencode/config/skills.lock.yaml"
    else
      sed -i "" "s/^yori_version:.*/yori_version: \"$YORI_VERSION\"/" ".opencode/config/skills.lock.yaml"
    fi
  else
    # yori_version フィールドがない場合は先頭行に追加
    YORI_TEMP=$(mktemp)
    echo "yori_version: \"$YORI_VERSION\"" > "$YORI_TEMP"
    cat ".opencode/config/skills.lock.yaml" >> "$YORI_TEMP"
    mv "$YORI_TEMP" ".opencode/config/skills.lock.yaml"
  fi
  echo "   → yori_version $YORI_VERSION を skills.lock.yaml に記録しました"
fi

# Plugin 開発時の型定義（@opencode-ai/plugin）を .opencode/ に配置
# なくても yori の動作に影響しないが、あると IDE での Plugin 編集時に型補完が効く
if [ -f "$SNIPPETS/.opencode/package.json" ]; then
  cp "$SNIPPETS/.opencode/package.json" .opencode/package.json
  if command -v bun &>/dev/null; then
    (cd .opencode && bun install) > /dev/null 2>&1 || true
  fi
  echo "✅ Plugin 型定義をセットアップしました"
fi

# ===== opencode.json のセットアップ =====
# OpenCode は opencode.json を設定ファイルとして使用する
# opencode.json.template をルートにコピーして、ユーザーが編集できるようにする
if [ ! -f "opencode.json" ]; then
  if [ -f "$SNIPPETS/opencode.json.template" ]; then
    cp "$SNIPPETS/opencode.json.template" opencode.json
    echo "✅ opencode.json をコピーしました（編集してプロジェクト設定を反映してください）"
  else
    echo "⚠️  opencode.json.template が見つかりません。スキップします"
  fi
else
  echo "ℹ️  opencode.json は既に存在します（上書き保護）"
fi

# Plugin は配置するだけで自動有効化（opencode.json への登録不要）
# OpenCode は .opencode/plugins/ 配下の .ts ファイルを起動時に自動読み込みする

# ===== 品質診断戦略の選択 / Quality diagnosis strategy =====
echo ""
echo "📊 品質診断の方式を選択してください： / Select quality diagnosis strategy:"
echo ""
echo "   [1] Reactive（推奨・デフォルト / Recommended, default）"
echo "       「月次診断して」と依頼したときだけ診断します。"
echo "       Diagnoses only when you say \"run monthly diagnosis\"."
echo "       向いているケース：個人開発・週数回のプログラミング"
echo "       Suitable for: solo development, occasional coding"
echo ""
echo "   [2] Scheduled（スケジュール / Schedule）"
echo "       CI/CD で週次・日次に自動診断します（GitHub Actions 等の設定が別途必要）。"
echo "       Automatically diagnoses weekly/daily via CI/CD (requires GitHub Actions setup)."
echo "       向いているケース：チーム開発・毎日コードを書くプロジェクト"
echo "       Suitable for: team development, daily coding"
echo ""
echo "   [3] Continuous（継続的 / Continuous）"
echo "       PR 作成・コミットのたびに自動チェックします（CI/CD 設定が別途必要）。"
echo "       Auto-checks on every PR and commit (requires CI/CD setup)."
echo "       向いているケース：バックグラウンドエージェント・並列開発"
echo "       Suitable for: background agents, parallel development"
echo ""
echo "   迷う場合は 1 を選んでください。後から ARCHITECTURE.md で変更できます。"
echo "   If unsure, choose 1. Can be changed later in ARCHITECTURE.md."
echo ""
if [ -t 0 ]; then
  read -r -p "選択 / Select [1/2/3] (default: 1): " QUALITY_STRATEGY_CHOICE
  QUALITY_STRATEGY_CHOICE="${QUALITY_STRATEGY_CHOICE:-1}"
else
  QUALITY_STRATEGY_CHOICE="${YORI_QUALITY_STRATEGY_CHOICE:-1}"
fi

case "$QUALITY_STRATEGY_CHOICE" in
  2) QUALITY_STRATEGY="Scheduled" ;;
  3) QUALITY_STRATEGY="Continuous" ;;
  *) QUALITY_STRATEGY="Reactive" ;;
esac

echo "✅ 品質診断戦略：$QUALITY_STRATEGY を選択しました"

# ARCHITECTURE.md に品質診断戦略を記録する（プレースホルダーを置換）
if [ -f "ARCHITECTURE.md" ]; then
  if grep -q "\[Reactive / Scheduled / Continuous\]" ARCHITECTURE.md; then
    if sed --version 2>/dev/null | grep -q "GNU"; then
      sed -i "s|\[Reactive / Scheduled / Continuous\]|$QUALITY_STRATEGY|g" ARCHITECTURE.md
    else
      sed -i "" "s|\[Reactive / Scheduled / Continuous\]|$QUALITY_STRATEGY|g" ARCHITECTURE.md
    fi
    echo "   → ARCHITECTURE.md に記録しました"
  fi
fi

# 使用履歴ファイルをコピー
for USAGE_FILE in "$SNIPPETS/.opencode/usage/"*; do
  USAGE_NAME=$(basename "$USAGE_FILE")
  if [ ! -f ".opencode/usage/$USAGE_NAME" ]; then
    cp "$USAGE_FILE" ".opencode/usage/$USAGE_NAME"
  fi
done
echo "✅ .opencode/usage/ に使用履歴ファイルをコピーしました（既存ファイルは保護）"

# handoff-artifact の雛形を作成
if [ ! -f ".opencode/handoff-artifact.md" ]; then
cat > .opencode/handoff-artifact.md << 'EOF'
# Handoff Artifact
# 更新日時: （handoff スキルが自動生成）
# このファイルは次のセッション開始時に AGENTS.md の Session Protocol が自動で読み込む

## 前のセッションの状態

取り組んでいた機能:
完了した部分:
途中で止まっている部分:
次にやるべきこと:

## 重要な決定事項


## 未解決の問題


## 変更したファイル


## Security Status

前回の診断日: （初回）
未解決の懸念:

EOF
  echo "✅ .opencode/handoff-artifact.md の雛形を作成しました"
else
  echo "ℹ️  .opencode/handoff-artifact.md は既に存在します（上書き保護）"
fi

# .env.example / .editorconfig をコピー（上書き保護あり）
if [ ! -f ".env.example" ]; then
  cp "$SNIPPETS/.env.example" .env.example
  echo "✅ .env.example をコピーしました（チームで共有・値は .env に記入）"
else
  echo "ℹ️  .env.example は既に存在します（上書き保護）"
fi

# .env を作成（.env.example が存在し .env が存在しない場合）
# ※ P0-4 修正：.env の値推測は AI が行わない方針に変更。
#    空ファイルを作成する。AGENTS.md Session Protocol の
#    `.env` 確認手順で人間に値入力を促す。
#    AI は .env.example のキー一覧を空値でコピーする処理を行うが、
#    値そのものは人間のみが入力する。
if [ -f ".env.example" ] && [ ! -f ".env" ]; then
  touch .env
  echo "✅ .env を作成しました（Session Protocol で AI がキー構造を補完し、値は人間が入力）"
  echo "⚠️  .env は絶対にコミットしないでください（.gitignoreで除外済み）"
elif [ -f ".env" ]; then
  echo "ℹ️  .env は既に存在します（上書き保護）"
fi

if [ ! -f ".editorconfig" ]; then
  cp "$SNIPPETS/.editorconfig" .editorconfig
  echo "✅ .editorconfig をコピーしました（エディタスタイル統一）"
else
  echo "ℹ️  .editorconfig は既に存在します（上書き保護）"
fi

# docs/ の雛形ファイルを作成
if [ ! -f "docs/project-definition.md" ]; then
  cat > docs/project-definition.md << 'DOCEOF'
# プロジェクト定義

<!-- このファイルをAIと対話しながら記入する -->
<!-- 記入方法は .opencode/standards/principles/project-definition-guide.md を参照 -->

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
<!-- 詳細は .opencode/standards/principles/resilience.md を参照 -->

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

if [ ! -f "docs/quality-scorecard.md" ]; then
  cp "$SNIPPETS/docs/quality-scorecard.md.template" docs/quality-scorecard.md
  echo "✅ docs/quality-scorecard.md の雛形を作成しました（月次診断後に @code-quality-auditor の結果を転記する）"
fi

if [ ! -f "docs/security-audit-log.md" ]; then
  cp "$SNIPPETS/docs/security-audit-log.md.template" docs/security-audit-log.md
  echo "✅ docs/security-audit-log.md の雛形を作成しました（監査後に @security-auditor の結果を転記する）"
fi

if [ ! -f ".opencode/adr-index.md" ]; then
  cp "$SNIPPETS/docs/adr-index.md.template" .opencode/adr-index.md
  echo "✅ .opencode/adr-index.md の雛形を作成しました（月次診断時に自動更新される）"
fi

if [ ! -f "docs/build-log.md" ]; then
  cp "$SNIPPETS/docs/build-log.md.template" docs/build-log.md
  echo "✅ docs/build-log.md の雛形を作成しました（handoff スキル / evaluator が自動追記）"
fi

# 仕様書・Sprint Contract・tasks.json テンプレートをコピー（常に最新版を反映）
for TEMPLATE_FILE in "$SNIPPETS/docs/spec-structure.md" "$SNIPPETS/docs/sprint-contract-template.md" "$SNIPPETS/docs/tasks-json-template.json"; do
  if [ -f "$TEMPLATE_FILE" ]; then
    TEMPLATE_NAME=$(basename "$TEMPLATE_FILE")
    cp "$TEMPLATE_FILE" "docs/$TEMPLATE_NAME"
    echo "✅ docs/$TEMPLATE_NAME をコピーしました"
  fi
done

# 作業ディレクトリのテンプレートをコピー（常に最新版を反映）
mkdir -p docs/working
for TEMPLATE_FILE in "$SNIPPETS/docs/working/"*.template; do
  if [ -f "$TEMPLATE_FILE" ]; then
    TEMPLATE_NAME=$(basename "$TEMPLATE_FILE" .template)
    cp "$TEMPLATE_FILE" "docs/working/$TEMPLATE_NAME"
    echo "✅ docs/working/$TEMPLATE_NAME のテンプレートをコピーしました"
  fi
done

# .gitignore に追加
# .gitignore がない場合は新規作成してから追記する
if [ ! -f ".gitignore" ]; then
  cp "$SNIPPETS/.gitignore.template" .gitignore
  echo "✅ .gitignore を作成しました"
fi
if [ -f ".gitignore" ]; then
  if ! grep -q "handoff-artifact.md" .gitignore; then
    # handoff-artifact と standards/ は必ずgitignore
    # handoff-artifact: セッション固有・個人の引き継ぎ情報
    # standards/: yori のコピー（チームで共有する場合は .gitignore から外す）
    echo "" >> .gitignore
    echo "# ハーネス（セッション固有・自動生成）" >> .gitignore
    echo ".opencode/handoff-artifact.md" >> .gitignore
    echo ".opencode/.setup-diff.log" >> .gitignore


  fi

  # .opencode/standards/ の追記（handoff 処理とは独立して確実に設定する）
  if ! grep -q "\.opencode/standards/" .gitignore; then
    echo ".opencode/standards/" >> .gitignore
    echo "✅ .gitignore に .opencode/standards/ を追記しました"
  fi

  # .env 系の追記（handoff 処理とは独立して、既存 .gitignore でも確実に設定する）
  if ! grep -qx "\.env" .gitignore; then
    echo "" >> .gitignore
    echo "# 環境変数・機密情報（絶対にコミットしない）" >> .gitignore
    echo ".env" >> .gitignore
    echo ".env.local" >> .gitignore
    echo ".env.*.local" >> .gitignore
    echo "# .env.example はコミットする（変数名だけ記載・値は空）" >> .gitignore
    echo "✅ .gitignore に .env 系を追記しました"
  fi

  # .opencode/usage/ の管理方法（全シナリオで選択できるよう独立ブロックに）
  if ! grep -q "\.opencode/usage/" .gitignore; then
    echo ""
    echo "📋 .opencode/usage/ の管理方法を選択してください： / Select how to manage .opencode/usage/:"
    echo "   .opencode/usage/skill-usage.md はスキルの使用履歴ログです。"
    echo "   This file logs skill usage history."
    echo ""
    echo "   [1] gitignoreに追加する（推奨：個人開発 / Recommended: solo dev）"
    echo "       各自のローカルに蓄積。チーム間で共有されない。"
    echo "       Logs stay local to each machine. Not shared across the team."
    echo ""
    echo "   [2] gitignoreに追加しない（チーム開発 / Team dev）"
    echo "       全員の使用履歴がgitに記録される。月次GCの判断精度が上がる。"
    echo "       All usage history is recorded in git. Improves monthly GC accuracy."
    echo ""
    if [ -t 0 ]; then
      read -r -p "選択 / Select [1/2] (default: 1): " USAGE_GIT_CHOICE
      USAGE_GIT_CHOICE="${USAGE_GIT_CHOICE:-1}"
    else
      USAGE_GIT_CHOICE="${YORI_USAGE_GIT_CHOICE:-1}"
    fi
    if [ "$USAGE_GIT_CHOICE" = "1" ]; then
      echo ".opencode/usage/" >> .gitignore
      echo "✅ .gitignore に .opencode/usage/ を追記しました"
    else
      echo "ℹ️  .opencode/usage/ は git 管理します"
    fi
  fi

  # docs/working/ の追記（作業メモ・計画・レビューチェックリストは git 管理しない）
  if ! grep -q "docs/working/" .gitignore; then
    echo "" >> .gitignore
    echo "# 作業ドキュメント（セッションごとの一時メモ・計画・チェックリスト）" >> .gitignore
    echo "docs/working/" >> .gitignore
    echo "✅ .gitignore に docs/working/ を追記しました"
  fi
fi

echo ""
# .git/hooks/pre-commit を作成（人間のgit commitも保護する）
# このファイルは .git/ 内にあるため git 管理対象外だが、setup-harness.sh が毎回作成する
# P1-1 修正：.opencode/config/secret-patterns.json からパターンを読み込んで動的生成
if [ -d ".git" ]; then
  PATTERNS_JSON=".opencode/config/secret-patterns.json"
  if [ ! -f "$PATTERNS_JSON" ]; then
    echo "❌ $PATTERNS_JSON が見つかりません。SSoT ファイルがコピーされていません" >&2
    exit 1
  fi

  if ! command -v jq &>/dev/null; then
    echo "⚠️  jq がインストールされていません。pre-commit フックにフォールバック版を生成します" >&2
    echo "   本来の動作には jq のインストールを推奨します（apt install jq / brew install jq）" >&2
  fi

  # jq でパターンを読み込んで bash 配列に変換
  # severity が "block" または未設定のパターンのみ pre-commit でチェック（"warn" は除外）
  if command -v jq &>/dev/null; then
    FILE_PATTERNS_BASH=$(jq -r '.filePatterns | @sh' "$PATTERNS_JSON")
    CONTENT_PATTERNS_BASH=$(jq -r '[.contentPatterns[] | select(.severity == "block" or (has("severity") | not)) | .pattern] | @sh' "$PATTERNS_JSON")
  else
    # フォールバック：最低限のパターン（.env 系のみ）
    FILE_PATTERNS_BASH="  '\\.env\\.local$'"
    CONTENT_PATTERNS_BASH=""
  fi

  # 動的生成した pre-commit フック
  cat > .git/hooks/pre-commit <<HOOKEOF
#!/bin/bash
# pre-commit hook: 機密情報・秘密鍵・env ファイルのコミットを防ぐ
# 自動生成元：$PATTERNS_JSON
# 再生成するには setup-harness.sh を再実行してください。

echo "[Security] コミット前セキュリティチェック..."

FAILED=0

# ── 危険なファイル名のチェック ─────────────────────────────────────
# パターンは $PATTERNS_JSON の filePatterns から読み込み
FILE_PATTERNS=(
${FILE_PATTERNS_BASH}
)

for PATTERN in "\${FILE_PATTERNS[@]}"; do
  MATCHES=\$(git diff --cached --name-only | grep -E "\$PATTERN" | grep -v '\.example\$')
  if [ -n "\$MATCHES" ]; then
    echo "[ERROR] 機密ファイル（\$PATTERN）がコミットに含まれています:" >&2
    echo "\$MATCHES" >&2
    FAILED=1
  fi
done

# ── 危険なコンテンツパターンのチェック ──────────────────────────────
# パターンは $PATTERNS_JSON の contentPatterns から読み込み（severity: "block" のみ）
CONTENT_PATTERNS=(
${CONTENT_PATTERNS_BASH}
)

for PATTERN in "\${CONTENT_PATTERNS[@]}"; do
  MATCHES=\$(git diff --cached --name-only \
    | xargs grep -l -E "\$PATTERN" 2>/dev/null \
    | grep -v "\.env" \
    | grep -v "\.example" \
    | grep -v "pre-commit" \
    | grep -v "setup-harness" \
    | grep -v "secret-patterns.json")
  if [ -n "\$MATCHES" ]; then
    echo "[WARN] 機密情報パターン「\$PATTERN」を検出:" >&2
    echo "\$MATCHES" >&2
    FAILED=1
  fi
done

if [ \$FAILED -eq 1 ]; then
  echo "" >&2
  echo "[ERROR] コミットを中止しました。" >&2
  echo "  問題のファイルを確認し、git restore --staged <file> で除外してください。" >&2
  echo "  意図したコミットの場合: git commit --no-verify（慎重に使用）" >&2
  exit 1
fi

echo "[OK] セキュリティチェック通過"
exit 0
HOOKEOF
  chmod +x .git/hooks/pre-commit
  git update-index --chmod=+x .git/hooks/pre-commit 2>/dev/null || true
  echo "✅ .git/hooks/pre-commit を設定しました（$PATTERNS_JSON から動的生成）"
  echo "   人間のコミットも機密情報から保護。パターン更新は同 JSON を編集して setup-harness.sh 再実行"
fi

echo "🔍 セットアップの検証中..."

# .opencode/standards/ が正しくコピーされているか確認
# 基本ファイルの存在確認
for FILE in AGENTS.md ARCHITECTURE.md .env.example .editorconfig \
            .opencode/coding-conventions.md .opencode/project-context.md; do
  if [ ! -f "$FILE" ]; then
    echo "❌ $FILE が作成されていません"
    VALIDATION_FAILED=1
  fi
done

# .opencode/standards/ が正しくコピーされているか確認
if [ ! -d ".opencode/standards/principles" ] ||    [ -z "$(ls -A .opencode/standards/principles/ 2>/dev/null)" ]; then
  echo "❌ .opencode/standards/principles/ が作成されていません"
  VALIDATION_FAILED=1
fi
if [ ! -d ".opencode/standards/architectures" ] ||    [ -z "$(ls -A .opencode/standards/architectures/ 2>/dev/null)" ]; then
  echo "❌ .opencode/standards/architectures/ が作成されていません"
  VALIDATION_FAILED=1
fi

# DESIGN.md の存在確認（UIありプロジェクトのみ）
if [ "$HAS_UI_FLAG" = true ] && [ ! -f "DESIGN.md" ]; then
  echo "❌ DESIGN.md が作成されていません"
  VALIDATION_FAILED=1
fi

# INTAKE.md の存在確認（UIありプロジェクトのみ）
if [ "$HAS_UI_FLAG" = true ] && [ ! -f "design/INTAKE.md" ]; then
  echo "❌ design/INTAKE.md が作成されていません"
  VALIDATION_FAILED=1
fi

if [ $VALIDATION_FAILED -eq 0 ]; then
  echo "✅ 検証通過：すべてのファイルが正常に配置されました"
else
  echo ""
  echo "⚠️  上記の問題を修正してから次のステップに進んでください"
  echo "   再実行: YORI_PATH=$YORI_SRC bash $YORI_SRC/setup-harness.sh"
fi

echo ""
echo "🎉 セットアップ完了！"
echo ""
echo "▶ これから始める方へ："
echo "  OpenCode でこのプロジェクトフォルダを開き、セッションを開始する旨をAIに伝えてください。"
echo "  AI が自動的にプロジェクト定義・アーキテクチャ・設計のセットアップを案内します。"
echo ""
echo "▶ 参考：セットアップされたファイル"
echo "  テンプレートとして以下のファイルが配置されています。"
echo "  詳細は opencode/README.ja.md を参照してください。"
echo ""
echo "  中核ファイル（AIとの対話で記入）："
echo "    AGENTS.md                  — エージェントの行動規範"
echo "    ARCHITECTURE.md            — アーキテクチャ定義"
echo "    docs/project-definition.md — プロジェクト定義"
if [ "$HAS_UI_FLAG" = true ]; then
  echo "    DESIGN.md                  — デザイン定義"
fi
echo ""
echo "  ドキュメント・ツール："
echo "    .opencode/standards/       — yori ナレッジベース（principles/ / architectures/）"
echo "    decisions/                 — 技術選定・ADRの記録先"
echo "    docs/operations.md         — 運用手順書（本番移行時に記入）"
echo ""
