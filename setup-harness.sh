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
#   1. docs/project-definition.md をAIと対話しながら記入する
#   2. ARCHITECTURE.md をAIと対話しながら記入する
#   3. AGENTS.md をAIと対話しながら記入する
#
# opencode.json はこのスクリプトが自動設定します。

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

# .opencode/ ディレクトリ作成
mkdir -p .opencode/{rules,skills,agents,plugins,usage}

# docs/ ディレクトリ作成
mkdir -p docs

# decisions/ ディレクトリ作成（ADR・技術選定・スキル化候補の記録先）
mkdir -p decisions
if [ ! -f "decisions/skill-candidates.md" ]; then
  cp "$DEV_STANDARDS_PATH/decisions/skill-candidates.md" decisions/skill-candidates.md
  echo "✅ decisions/skill-candidates.md をコピーしました"
fi

# ===== AGENTS.md のコピー =====
if [ ! -f "AGENTS.md" ]; then
  cp "$SNIPPETS/agents/AGENTS.md" AGENTS.md

  echo "✅ AGENTS.md をコピーしました"
else
  echo "ℹ️  AGENTS.md は既に存在します（上書き保護）"
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
read -r -p "このプロジェクトにWebフロントエンドのUIがありますか？ [y/N]: " HAS_UI
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
  HAS_UI_FLAG=true
else
  echo "ℹ️  DESIGN.md はスキップしました（UIなしプロジェクト）"
  HAS_UI_FLAG=false
fi

# ===== Open Design のセットアップ（UIありプロジェクトのみ・任意）=====
HAS_OPEN_DESIGN=false
if [ "$HAS_UI_FLAG" = true ]; then
  echo ""
  read -r -p "Open Design を使いますか？（https://github.com/nexu-io/open-design） [y/N]: " USE_OPEN_DESIGN
  if [[ "$USE_OPEN_DESIGN" =~ ^[Yy]$ ]]; then
    HAS_OPEN_DESIGN=true
    echo "ℹ️  Open Design のセットアップ手順："
    echo ""
    echo "   1. Open Design をプロジェクトに追加:"
    echo "      git submodule add https://github.com/nexu-io/open-design.git tools/open-design"
    echo "      または npm でインストール（パッケージが公開されている場合）:"
    echo "      npm install -D @nexu-io/open-design"
    echo ""
    echo "   2. デーモンを起動:"
    echo "      cd tools/open-design && pnpm install && pnpm tools-dev"
    echo ""
    echo "   3. DESIGN.md の「10. Design Tool Integration」を参照して設定を完了する"
    echo ""
    echo "   詳細は Open Design のドキュメントを参照してください。"
    echo "   この案内は .opencode/standards/principles/design-contract.md の「Open Design との関係」セクションにも記載されています。"
    echo ""
    echo "✅ Open Design のセットアップ案内を表示しました（後から .opencode/standards/principles/design-contract.md を参照）"
  else
    echo "ℹ️  Open Design はスキップしました"
  fi
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

# rules テンプレート
# rules/ 以下の全ファイルを再帰的にコピー（上書き保護あり）
# 含まれるルール：security.md / security/*.md / stack-setup.md / stack-setup/*.md / network-resilience.md / network-resilience/*.md / _shared/*.md
while IFS= read -r -d '' RULE_FILE; do
  REL_PATH="${RULE_FILE#$SNIPPETS/.opencode/rules/}"
  REL_PATH="${REL_PATH#/}"
  TARGET=".opencode/rules/$REL_PATH"
  if [ ! -f "$TARGET" ]; then
    mkdir -p "$(dirname "$TARGET")"
    cp "$RULE_FILE" "$TARGET"
    echo "✅ .opencode/rules/$REL_PATH をコピーしました"
  fi
done < <(find "$SNIPPETS/.opencode/rules/" -name "*.md" -type f -print0)

# 全Skillsを外部から取得（release-prep / live-operation / handoff / find-skills / skill-creator）
for SKILL_DIR in "$SNIPPETS/.opencode/skills/"/*/; do
  SKILL_NAME=$(basename "$SKILL_DIR")
  cp -r "$SKILL_DIR" ".opencode/skills/$SKILL_NAME/"
done
echo "✅ .opencode/skills/ に組み込みSkillsをコピーしました（release-prep / live-operation / handoff）"

# 外部スキルをダウンロード（find-skills / skill-creator）
# P1-4 修正：.opencode/config/skills.lock.yaml からコミットハッシュを読み込んで固定
echo ""
echo "📦 外部スキルをダウンロードしています..."
if command -v git &>/dev/null; then
  SKILL_TMP=$(mktemp -d)
  SKILLS_LOCK=".opencode/config/skills.lock.yaml"

  # lock ファイルから commit を読み取る（yq が無ければ grep でフォールバック）
  if [ -f "$SKILLS_LOCK" ]; then
    if command -v yq &>/dev/null; then
      FIND_SKILLS_COMMIT=$(yq -r '.external_skills.find-skills.commit' "$SKILLS_LOCK")
      SKILL_CREATOR_COMMIT=$(yq -r '.external_skills.skill-creator.commit' "$SKILLS_LOCK")
    else
      # yq がない場合は sed/awk でフォールバック
      FIND_SKILLS_COMMIT=$(awk '/^  find-skills:/,/^  skill-creator:/' "$SKILLS_LOCK" | grep "commit:" | head -1 | sed 's/.*commit: *//' | tr -d '"')
      SKILL_CREATOR_COMMIT=$(awk '/^  skill-creator:/,/^[^ ]/' "$SKILLS_LOCK" | grep "commit:" | head -1 | sed 's/.*commit: *//' | tr -d '"')
    fi
  else
    FIND_SKILLS_COMMIT=""
    SKILL_CREATOR_COMMIT=""
  fi

  # find-skills
  echo "  → find-skills（vercel-labs/skills）..."
  if [ -n "$FIND_SKILLS_COMMIT" ] && [ "$FIND_SKILLS_COMMIT" != "null" ]; then
    echo "    ロックされたコミット: ${FIND_SKILLS_COMMIT:0:10}"
    git clone https://github.com/vercel-labs/skills.git "$SKILL_TMP/vercel-labs-skills" 2>/dev/null && \
      (cd "$SKILL_TMP/vercel-labs-skills" && git checkout "$FIND_SKILLS_COMMIT" 2>/dev/null) && \
      cp -r "$SKILL_TMP/vercel-labs-skills/find-skills" ".opencode/skills/" && \
      echo "  ✅ find-skills をダウンロードしました（固定コミット）" || \
      echo "  ⚠️  find-skills のダウンロードに失敗しました"
  else
    echo "    ⚠️  skills.lock.yaml にコミットハッシュが未設定です"
    echo "    P1-4 推奨：動作確認済みのコミットハッシュを $SKILLS_LOCK に記入してください"
    echo "    今回は main ブランチから取得しますが、再現性は保証されません"
    git clone --depth 1 https://github.com/vercel-labs/skills.git "$SKILL_TMP/vercel-labs-skills" 2>/dev/null && \
      cp -r "$SKILL_TMP/vercel-labs-skills/find-skills" ".opencode/skills/" && \
      echo "  ✅ find-skills をダウンロードしました（main・非固定）" || \
      echo "  ⚠️  find-skills のダウンロードに失敗しました"
  fi

  # skill-creator
  echo "  → skill-creator（anthropics/skills）..."
  if [ -n "$SKILL_CREATOR_COMMIT" ] && [ "$SKILL_CREATOR_COMMIT" != "null" ]; then
    echo "    ロックされたコミット: ${SKILL_CREATOR_COMMIT:0:10}"
    git clone https://github.com/anthropics/skills.git "$SKILL_TMP/anthropics-skills" 2>/dev/null && \
      (cd "$SKILL_TMP/anthropics-skills" && git checkout "$SKILL_CREATOR_COMMIT" 2>/dev/null) && \
      cp -r "$SKILL_TMP/anthropics-skills/skill-creator" ".opencode/skills/" && \
      echo "  ✅ skill-creator をダウンロードしました（固定コミット）" || \
      echo "  ⚠️  skill-creator のダウンロードに失敗しました"
  else
    echo "    ⚠️  skills.lock.yaml にコミットハッシュが未設定です"
    echo "    P1-4 推奨：動作確認済みのコミットハッシュを $SKILLS_LOCK に記入してください"
    git clone --depth 1 https://github.com/anthropics/skills.git "$SKILL_TMP/anthropics-skills" 2>/dev/null && \
      cp -r "$SKILL_TMP/anthropics-skills/skill-creator" ".opencode/skills/" && \
      echo "  ✅ skill-creator をダウンロードしました（main・非固定）" || \
      echo "  ⚠️  skill-creator のダウンロードに失敗しました"
  fi

  rm -rf "$SKILL_TMP"
  echo "✅ 外部スキルのダウンロードが完了しました"
else
  echo "⚠️  git が見つかりません。手動でスキルをインストールしてください："
  echo "     git clone https://github.com/vercel-labs/skills.git"
  echo "     cd skills && git checkout <skills.lock.yaml のコミットハッシュ>"
  echo "     cp -r find-skills /path/to/project/.opencode/skills/"
fi

# サブエージェント定義をコピー
for AGENT_FILE in "$SNIPPETS/agents/subagents/"*.md; do
  if [ -f "$AGENT_FILE" ]; then
    AGENT_NAME=$(basename "$AGENT_FILE")
    if [ ! -f ".opencode/agents/$AGENT_NAME" ]; then
      cp "$AGENT_FILE" .opencode/agents/
    fi
  fi
done
echo "✅ .opencode/agents/ にサブエージェント定義をコピーしました"
echo "   （planner / evaluator / code-reviewer / security-auditor / test-generator / codebase-investigator / resilience-checker / code-quality-auditor）"

# standards をコピー（principles/ architectures/ tech-decision テンプレート）
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

このディレクトリに置かれたファイルは、同名の dev-standards ファイルより優先されます。
dev-standards 側の同名ファイルが更新されても上書きされません。

使い方：
1. `.opencode/standards/principles/<file>.md` を編集
2. 同じファイル名で `.opencode/standards/principles/.local/<file>.md` に保存
3. 編集後にこのディレクトリの同名ファイルを参照するようにする

例：dev-standards の `security-requirements.md` をプロジェクト固有の
リスクプロファイルに合わせて上書きしたい場合
1. `.opencode/standards/principles/.local/security-requirements.md` を作成
2. 内容をカスタマイズ
3. プロジェクト内の他のファイルからこの .local 版を参照する

注意：dev-standards 側の更新内容を取り込みたい場合は手動マージが必要です。
LOCALREADME
  echo "ℹ️  .opencode/standards/principles/.local/README.md を作成しました（プロジェクト固有の上書き機構）"
fi

if [ ! -f ".opencode/standards/architectures/.local/README.md" ]; then
  cat > ".opencode/standards/architectures/.local/README.md" << 'LOCALREADME'
# プロジェクト固有の上書き（architectures/）

このディレクトリに置かれたファイルは、同名の dev-standards ファイルより優先されます。
詳細は `.opencode/standards/principles/.local/README.md` を参照。
LOCALREADME
fi

# principles/ のマージコピー
DIFF_COUNT=0
NEW_COUNT=0
for SRC_FILE in "$DEV_STANDARDS_PATH/principles/"*.md; do
  [ -f "$SRC_FILE" ] || continue
  FNAME=$(basename "$SRC_FILE")
  TARGET=".opencode/standards/principles/$FNAME"

  if [ ! -f "$TARGET" ]; then
    cp "$SRC_FILE" "$TARGET"
    NEW_COUNT=$((NEW_COUNT + 1))
  elif ! diff -q "$SRC_FILE" "$TARGET" > /dev/null 2>&1; then
    # 差分あり：上書きせず警告
    DIFF_COUNT=$((DIFF_COUNT + 1))
    if [ "$DIFF_COUNT" -le 5 ]; then
      echo "  ⚠️  principles/$FNAME に差分あり（上書き保護・.local/ への移動を検討）"
    elif [ "$DIFF_COUNT" -eq 6 ]; then
      echo "  ⚠️  他にも差分があります（以降は省略）"
    fi
  fi
done

# architectures/ のマージコピー
for SRC_FILE in "$DEV_STANDARDS_PATH/architectures/"*.md; do
  [ -f "$SRC_FILE" ] || continue
  FNAME=$(basename "$SRC_FILE")
  TARGET=".opencode/standards/architectures/$FNAME"

  if [ ! -f "$TARGET" ]; then
    cp "$SRC_FILE" "$TARGET"
    NEW_COUNT=$((NEW_COUNT + 1))
  elif ! diff -q "$SRC_FILE" "$TARGET" > /dev/null 2>&1; then
    DIFF_COUNT=$((DIFF_COUNT + 1))
    if [ "$DIFF_COUNT" -le 10 ]; then
      echo "  ⚠️  architectures/$FNAME に差分あり（上書き保護・.local/ への移動を検討）"
    fi
  fi
done

# tech-decision テンプレートは強制コピー（テンプレートは編集対象外）
if [ ! -f ".opencode/standards/tech-decision.md.template" ]; then
  cp "$DEV_STANDARDS_PATH/snippets/tech-decision.md.template" .opencode/standards/tech-decision.md.template
fi

if [ "$DIFF_COUNT" -gt 0 ]; then
  echo "ℹ️  差分があるファイルは上書きされませんでした。"
  echo "   反映方法："
  echo "   A) 差分を確認してプロジェクトに取り込む：diff \$DEV_STANDARDS_PATH/principles/X.md .opencode/standards/principles/X.md"
  echo "   B) プロジェクト固有の差分を保持：.opencode/standards/principles/.local/X.md にコピー"
  echo "   C) dev-standards の最新版で強制上書き：rm .opencode/standards/principles/X.md && setup-harness.sh 再実行"
  echo "   合計 ${DIFF_COUNT} ファイルに差分があります"
fi
echo "✅ standards/ をマージコピーしました（新規 ${NEW_COUNT} / 差分保持 ${DIFF_COUNT}）"

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
  echo "    dev-standards 側で修正してから再実行してください"
fi
echo "✅ .opencode/standards/ をコピーしました"
echo "   （principles/ 全ファイル・architectures/ 全ファイル・tech-decision テンプレート）"
echo "   ℹ️  チームで共有する場合のみ .gitignore から .opencode/standards/ を外してください"

# TS Plugin ファイルと README をコピー
for PLUGIN_FILE in "$SNIPPETS/.opencode/plugins/"*.ts "$SNIPPETS/.opencode/plugins/README.md"; do
  if [ -f "$PLUGIN_FILE" ]; then
    PLUGIN_NAME=$(basename "$PLUGIN_FILE")
    if [ ! -f ".opencode/plugins/$PLUGIN_NAME" ]; then
      cp "$PLUGIN_FILE" ".opencode/plugins/$PLUGIN_NAME"
    fi
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

# Plugin 依存関係（package.json）を .opencode/ 直下にコピー
if [ -f "$SNIPPETS/.opencode/package.json" ] && [ ! -f ".opencode/package.json" ]; then
  cp "$SNIPPETS/.opencode/package.json" .opencode/package.json
  echo "✅ .opencode/package.json をコピーしました（@opencode-ai/plugin 型定義）"
fi

# Plugin 依存関係のインストール（@opencode-ai/plugin の型定義）
if [ -f ".opencode/package.json" ] && command -v bun &>/dev/null; then
  echo ""
  echo "📦 Plugin 依存関係をインストールしています..."
  cd .opencode && bun install && cd ..
  echo "✅ Plugin 依存関係をインストールしました"
elif ! command -v bun &>/dev/null; then
  echo "⚠️  bun が見つかりません。Plugin の型チェックには bun のインストールが必要です"
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

# ===== 品質診断戦略の選択 =====
echo ""
echo "📊 品質診断の方式を選択してください："
echo ""
echo "   [1] Reactive（推奨・デフォルト）"
echo "       「月次診断して」と依頼したときだけ診断します。"
echo "       向いているケース：個人開発・週数回のプログラミング"
echo ""
echo "   [2] Scheduled（スケジュール）"
echo "       CI/CD で週次・日次に自動診断します（GitHub Actions 等の設定が別途必要）。"
echo "       向いているケース：チーム開発・毎日コードを書くプロジェクト"
echo ""
echo "   [3] Continuous（継続的）"
echo "       PR 作成・コミットのたびに自動チェックします（CI/CD 設定が別途必要）。"
echo "       向いているケース：バックグラウンドエージェント・並列開発"
echo ""
echo "   迷う場合は 1 を選んでください。後から ARCHITECTURE.md で変更できます。"
echo ""
read -r -p "選択 [1/2/3] (デフォルト: 1): " QUALITY_STRATEGY_CHOICE
QUALITY_STRATEGY_CHOICE="${QUALITY_STRATEGY_CHOICE:-1}"

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
# 更新日時: （セッション終了時に handoff.ts Plugin が自動生成・handoff スキルが内容を記入）
# このファイルは次のセッション開始時に AGENTS.md の Session Protocol が自動で読み込む

## 前のセッションの状態

取り組んでいた機能:
完了した部分:
途中で止まっている部分:
次にやるべきこと:

## 重要な決定事項


## 未解決の問題


## 変更したファイル

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
#    空ファイルを作成し、AGENTS.md Session Protocol Step 4 で
#    人間に「.env の値を入力してください」と促す。
#    AI は .env.example のキー一覧を空値でコピーする処理を行うが、
#    値そのものは人間のみが入力する。
if [ -f ".env.example" ] && [ ! -f ".env" ]; then
  touch .env
  echo "✅ .env を作成しました（Session Protocol Step 4 で AI がキー構造を補完し、値は人間が入力）"
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
<!-- 対話プロンプトは .opencode/standards/principles/project-definition-guide.md を参照 -->

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

# 仕様書・Sprint Contract・tasks.json テンプレートをコピー
for TEMPLATE_FILE in "$SNIPPETS/docs/spec-structure.md" "$SNIPPETS/docs/sprint-contract-template.md" "$SNIPPETS/docs/tasks-json-template.json"; do
  if [ -f "$TEMPLATE_FILE" ]; then
    TEMPLATE_NAME=$(basename "$TEMPLATE_FILE")
    if [ ! -f "docs/$TEMPLATE_NAME" ]; then
      cp "$TEMPLATE_FILE" "docs/$TEMPLATE_NAME"
      echo "✅ docs/$TEMPLATE_NAME をコピーしました"
    fi
  fi
done

# 作業ディレクトリのテンプレートをコピー
mkdir -p docs/working
for TEMPLATE_FILE in "$SNIPPETS/docs/working/"*.template; do
  if [ -f "$TEMPLATE_FILE" ]; then
    TEMPLATE_NAME=$(basename "$TEMPLATE_FILE" .template)
    if [ ! -f "docs/working/$TEMPLATE_NAME" ]; then
      cp "$TEMPLATE_FILE" "docs/working/$TEMPLATE_NAME"
      echo "✅ docs/working/$TEMPLATE_NAME のテンプレートをコピーしました"
    fi
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
    # standards/: dev-standards のコピー（チームで共有する場合は .gitignore から外す）
    echo "" >> .gitignore
    echo "# ハーネス（セッション固有・自動生成）" >> .gitignore
    echo ".opencode/handoff-artifact.md" >> .gitignore

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
    echo "📋 .opencode/usage/ の管理方法を選択してください："
    echo "   .opencode/usage/skill-usage.md はスキルの使用履歴ログです。"
    echo ""
    echo "   [1] gitignoreに追加する（推奨：個人開発 / 作業ログをチームと共有しない）"
    echo "       → 各自のローカルに蓄積。チーム間で共有されない。"
    echo ""
    echo "   [2] gitignoreに追加しない（チーム開発 / スキル使用状況をチームで共有する）"
    echo "       → 全員の使用履歴がgitに記録される。月次GCの判断精度が上がる。"
    echo ""
    read -r -p "選択 [1/2] (デフォルト: 1): " USAGE_GIT_CHOICE
    USAGE_GIT_CHOICE="${USAGE_GIT_CHOICE:-1}"
    if [ "$USAGE_GIT_CHOICE" = "1" ]; then
      echo ".opencode/usage/" >> .gitignore
      echo "✅ .gitignore に .opencode/usage/ を追記しました"
    else
      echo "ℹ️  .opencode/usage/ は git 管理します"
    fi
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
  if command -v jq &>/dev/null; then
    FILE_PATTERNS_BASH=$(jq -r '.filePatterns[]' "$PATTERNS_JSON" | awk '{print "  \x27" $0 "\x27"}')
    CONTENT_PATTERNS_BASH=$(jq -r '.contentPatterns[].pattern' "$PATTERNS_JSON" | awk '{print "  \x27" $0 "\x27"}')
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
# パターンは $PATTERNS_JSON の contentPatterns から読み込み
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
  echo "✅ .git/hooks/pre-commit を設定しました（$PATTERNS_JSON から動的生成）"
  echo "   人間のコミットも機密情報から保護。パターン更新は同 JSON を編集して setup-harness.sh 再実行"
else
  echo "ℹ️  .git ディレクトリが見つかりません。git init 後に setup-harness.sh を再実行してください。"
fi

echo "🔍 セットアップの検証中..."
VALIDATION_FAILED=0

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
  echo "   再実行: DEV_STANDARDS_PATH=$DEV_STANDARDS_PATH bash $DEV_STANDARDS_PATH/setup-harness.sh"
fi

echo ""
echo "🎉 セットアップ完了！"
echo ""
echo "次に行うこと："
echo ""
echo "  Step 1：project-definition.md を作成する（AIと対話）"
echo "    → .opencode/standards/principles/project-definition-guide.md にある対話プロンプトを使う"
echo "    → 完成したら docs/project-definition.md として保存する"
echo ""
echo "  Step 2：ARCHITECTURE.md を記入する（AIと対話）"
echo "    → ARCHITECTURE.md の冒頭にある対話プロンプトをAIに渡す"
echo "    → project-definition.md を参照しながらAIが一緒に埋めてくれる"
echo "    → UIプロジェクトの場合、Step 2.5 で DESIGN.md 作成の要否を確認される"
echo ""
if [ "$HAS_UI_FLAG" = true ]; then
  echo "  Step 2.5：DESIGN.md を記入する（AIと対話）"
  echo "    → DESIGN.md と design/INTAKE.md を読み、手順に従って進めるようAIに依頼する"
  echo "    → ARCHITECTURE.md の内容をもとにAIが一緒に埋めてくれる"
  echo ""
fi
if [ "$HAS_OPEN_DESIGN" = true ]; then
  echo "  Step 2.5a：Open Design のセットアップを完了する"
  echo "    → 上記の案内に従い Open Design をインストールする"
  echo "    → 完了後、DESIGN.md の「10. Design Tool Integration」を参照"
  echo ""
fi
echo "  Step 3：AGENTS.md を記入する（AIと対話）"
echo "    → AGENTS.md の Project Overview のコメント内にある対話プロンプトを使う"
echo "    → ARCHITECTURE.md の内容をもとにAIが一緒に埋めてくれる"
echo ""
echo "  Step 4：opencode.json の設定を確認する"
echo "    → opencode.json にプロジェクト固有の設定（ルール・スキルパス等）を記入します"
echo "    → Plugin は .opencode/plugins/ に配置済みです（opencode.json への登録は不要）"
echo "    → 品質診断戦略は ARCHITECTURE.md の「コード品質」セクションに記録済みです"
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
echo "    → OpenCode を起動してプロジェクトフォルダを開く"
echo "    → AGENTS.md の Session Protocol に従い自動的に作業が始まります"
echo "       （AGENTS.md は OpenCode がプロジェクト開始時に自動で読み込みます）"
echo ""
echo "  ★ セキュリティ要件は自動で設定されます"
echo "    → ARCHITECTURE.md の Step 3（非機能要件の定義）で AI が自律的に実行します："
echo "       - プロジェクト性質から対応レベル（Lv.1〜4）を判定"
echo "       - 適用される法令・標準（GDPR / PCI DSS 等）を特定"
echo "       - AGENTS.md の Security Boundaries を自動更新"
echo "       - 依存ライブラリの自動監視設定ファイルの作成を提案"
echo "    → 人間がAIに別途指示する必要はありません"
echo ""
echo "参考ドキュメント（プロジェクト内 .opencode/standards/ に配置済み）："
echo "  .opencode/standards/principles/harness-engineering.md"
echo "  .opencode/standards/principles/security-requirements.md    ← セキュリティ対応レベルの自律判断"
echo "  .opencode/standards/principles/security-implementation.md  ← 認証・セキュリティ実装時"
echo "  .opencode/standards/principles/code-quality.md             ← コード品質基準"
echo "  .opencode/standards/principles/risk-based-approach.md      ← 投資優先度の判断"
echo "  .opencode/standards/principles/resilience.md               ← 障害・復旧設計時"
