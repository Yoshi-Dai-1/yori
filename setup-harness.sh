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
# Hooks と settings.json はこのスクリプトが自動設定します。

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
  HAS_UI_FLAG=true
else
  echo "ℹ️  DESIGN.md はスキップしました（UIなしプロジェクト）"
  HAS_UI_FLAG=false
fi

# ===== .claude/ 内のファイルをコピー =====
# coding-conventions
if [ ! -f ".claude/coding-conventions.md" ]; then
  cp "$SNIPPETS/.claude/coding-conventions.md.template" .claude/coding-conventions.md
  echo "✅ .claude/coding-conventions.md をコピーしました"
else
  echo "ℹ️  .claude/coding-conventions.md は既に存在します（上書き保護）"
fi

# project-context
if [ ! -f ".claude/project-context.md" ]; then
  cp "$SNIPPETS/.claude/project-context.md.template" .claude/project-context.md
  echo "✅ .claude/project-context.md をコピーしました"
else
  echo "ℹ️  .claude/project-context.md は既に存在します（上書き保護）"
fi

# rules テンプレート
# rules/ 以下の全ファイルをコピー（上書き保護あり）
for RULE_FILE in "$SNIPPETS/.claude/rules/"*.md; do
  RULE_NAME=$(basename "$RULE_FILE")
  if [ ! -f ".claude/rules/$RULE_NAME" ]; then
    cp "$RULE_FILE" ".claude/rules/$RULE_NAME"
    echo "✅ .claude/rules/$RULE_NAME をコピーしました"
  fi
done

# 組み込みSkillsをコピー（release-prep / live-operation / handoff）
# ※ find-skills・skill-creator は ~/.claude/skills/ にインストールされるため含まない
for SKILL_DIR in "$SNIPPETS/.claude/skills/"/*/; do
  SKILL_NAME=$(basename "$SKILL_DIR")
  cp -r "$SKILL_DIR" ".claude/skills/$SKILL_NAME/"
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
    AGENT_NAME=$(basename "$AGENT_FILE")
    if [ ! -f ".claude/agents/$AGENT_NAME" ]; then
      cp "$AGENT_FILE" .claude/agents/
    fi
  fi
done
echo "✅ .claude/agents/ にサブエージェント定義をコピーしました"
echo "   （planner / evaluator / code-reviewer / security-auditor / test-generator / codebase-investigator / resilience-checker / code-quality-auditor）"

# standards をコピー（principles/ architectures/ tech-decision テンプレート）
# .claude/standards/ に配置することで、AIがアクセス制限なく参照できる
mkdir -p .claude/standards/principles .claude/standards/architectures
cp "$DEV_STANDARDS_PATH/principles/"*.md .claude/standards/principles/
cp "$DEV_STANDARDS_PATH/architectures/"*.md .claude/standards/architectures/
cp "$DEV_STANDARDS_PATH/snippets/tech-decision.md.template" .claude/standards/tech-decision.md.template

# コピーしたファイル内の相互参照パスを .claude/standards/ 用に書き換える
# （コピー元の principles/ や architectures/ はプロジェクト内に存在しないため）
if sed --version 2>/dev/null | grep -q "GNU"; then
  find .claude/standards -name "*.md" | while read f; do
    sed -i '/\.claude\/standards/! s|principles/\([a-z_-]*\.md\)|.claude/standards/principles/\1|g' "$f"
    sed -i '/\.claude\/standards/! s|architectures/\([a-z_-]*\.md\)|.claude/standards/architectures/\1|g' "$f"
  done
else
  find .claude/standards -name "*.md" | while read f; do
    sed -i '' '/\.claude\/standards/! s|principles/\([a-z_-]*\.md\)|.claude/standards/principles/\1|g' "$f"
    sed -i '' '/\.claude\/standards/! s|architectures/\([a-z_-]*\.md\)|.claude/standards/architectures/\1|g' "$f"
  done
fi
echo "✅ .claude/standards/ をコピーしました"
echo "   （principles/ 全ファイル・architectures/ 全ファイル・tech-decision テンプレート）"
echo "   ℹ️  チームで共有する場合のみ .gitignore から .claude/standards/ を外してください"

# Hooks サンプルをコピー・有効化
for HOOK_FILE in "$SNIPPETS/.claude/hooks/"*; do
  HOOK_NAME=$(basename "$HOOK_FILE")
  if [ ! -f ".claude/hooks/$HOOK_NAME" ]; then
    cp "$HOOK_FILE" ".claude/hooks/$HOOK_NAME"
  fi
done
echo "✅ .claude/hooks/ にHooksサンプルをコピーしました（既存ファイルは保護）"

# ===== Hooks の自動有効化 =====
# .example を外して実行権限を付与する（既に有効化済みのものはスキップ）
echo ""
echo "🔧 Claude Code Hooks を有効化しています..."

HOOKS_ACTIVATED=0
for EXAMPLE_HOOK in .claude/hooks/*.sh.example; do
  [ -f "$EXAMPLE_HOOK" ] || continue
  ACTIVE_HOOK="${EXAMPLE_HOOK%.example}"
  if [ ! -f "$ACTIVE_HOOK" ]; then
    cp "$EXAMPLE_HOOK" "$ACTIVE_HOOK"
    chmod +x "$ACTIVE_HOOK"
    HOOKS_ACTIVATED=$((HOOKS_ACTIVATED + 1))
    echo "   ✅ $(basename "$ACTIVE_HOOK") を有効化しました"
  fi
done

if [ $HOOKS_ACTIVATED -eq 0 ]; then
  echo "   ℹ️  すべての Hook はすでに有効化されています"
fi

# ===== settings.json の自動生成・マージ =====
# .claude/settings.json に hooks の登録を自動で行う
# 既存の settings.json がある場合は hooks エントリのみ安全にマージする

SETTINGS_FILE=".claude/settings.json"

# 登録するフック定義（JSONで書く）
HOOK_ENTRIES=$(cat << 'HOOKS_JSON'
{
  "PostToolUse": [
    {
      "matcher": "Write|Edit|MultiEdit",
      "hooks": [{ "type": "command", "command": ".claude/hooks/on-post-tool-use.lint-and-typecheck.sh" }]
    },
    {
      "matcher": "Write|Edit|MultiEdit",
      "hooks": [{ "type": "command", "command": ".claude/hooks/on-post-tool-use.check-doc-links.sh" }]
    },
    {
      "matcher": "Write|Edit|MultiEdit",
      "hooks": [{ "type": "command", "command": ".claude/hooks/on-post-tool-use.architecture-skill-check.sh" }]
    },
    {
      "matcher": "Skill",
      "hooks": [{ "type": "command", "command": ".claude/hooks/on-post-tool-use.record-skill-usage.sh" }]
    }
  ],
  "PreToolUse": [
    {
      "matcher": "Bash",
      "hooks": [{ "type": "command", "command": ".claude/hooks/on-pre-tool-use.check-secrets.sh" }]
    }
  ],
  "Stop": [
    {
      "hooks": [{ "type": "command", "command": ".claude/hooks/on-stop.generate-handoff.sh" }]
    }
  ]
}
HOOKS_JSON
)

echo ""
echo "⚙️  Claude Code の自動実行設定（.claude/settings.json）について"
echo ""
echo "   Hookを有効にすると、ファイルを保存するたびに以下が自動で動きます："
echo "   ✅ コードの書き方チェック（lint・フォーマット）"
echo "   ✅ 機密情報の誤コミット防止"
echo "   ✅ セッション終了時の引き継ぎファイル自動生成"
echo "   ✅ ドキュメントのリンク切れ検出"
echo ""
echo "   設定ファイル（.claude/settings.json）にこれらの登録を自動で書き込みます。"
echo "   既存の設定がある場合は、そちらを保持したまま追記します。"
echo ""
read -r -p "   自動設定を行いますか？ [Y/n]: " SETTINGS_AUTO
SETTINGS_AUTO="${SETTINGS_AUTO:-Y}"

if [[ "$SETTINGS_AUTO" =~ ^[Yy]$ ]]; then
  DO_SETTINGS=true
  echo "   → 自動設定を行います"
else
  DO_SETTINGS=false
  echo "   → スキップしました。後から設定する場合は .claude/hooks/README.md を参照してください"
fi
echo ""

if [ "$DO_SETTINGS" = true ] && command -v python3 &>/dev/null; then
  python3 << PYEOF
import json, os

settings_file = "$SETTINGS_FILE"
hook_entries_str = r"""$HOOK_ENTRIES"""

new_hooks = json.loads(hook_entries_str)

# 既存の settings.json を読み込む（存在しない場合は空オブジェクト）
if os.path.exists(settings_file):
    try:
        with open(settings_file, 'r', encoding='utf-8') as f:
            existing = json.load(f)
    except (json.JSONDecodeError, IOError):
        existing = {}
else:
    existing = {}

# hooks キーが存在しない場合は新規作成
if 'hooks' not in existing:
    existing['hooks'] = {}

# 各イベントタイプ（PostToolUse / PreToolUse / Stop）を安全にマージ
# 既存の hooks リストに同じコマンドが存在しない場合のみ追加する
for event_type, new_event_hooks in new_hooks.items():
    if event_type not in existing['hooks']:
        existing['hooks'][event_type] = []

    for new_entry in new_event_hooks:
        # コマンドパスを取り出す
        new_cmd = new_entry.get('hooks', [{}])[0].get('command', '') if event_type != 'Stop' else                   new_entry.get('hooks', [{}])[0].get('command', '')

        # 既存エントリと重複しないか確認
        already_exists = any(
            existing_entry.get('hooks', [{}])[0].get('command', '') == new_cmd
            for existing_entry in existing['hooks'][event_type]
        )

        if not already_exists:
            existing['hooks'][event_type].append(new_entry)

with open(settings_file, 'w', encoding='utf-8') as f:
    json.dump(existing, f, ensure_ascii=False, indent=2)
    f.write('
')

print("OK")
PYEOF

  if [ $? -eq 0 ]; then
    echo "✅ .claude/settings.json に Hooks を登録しました（既存設定は保持）"
  else
    echo "⚠️  settings.json の自動生成に失敗しました"
    echo "   後から設定する場合は .claude/hooks/README.md を参照してください"
  fi
elif [ "$DO_SETTINGS" = true ]; then
  echo "⚠️  python3 が見つかりません。settings.json の自動生成をスキップしました"
  echo "   後から設定する場合は .claude/hooks/README.md を参照してください"
fi

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
for USAGE_FILE in "$SNIPPETS/.claude/usage/"*; do
  USAGE_NAME=$(basename "$USAGE_FILE")
  if [ ! -f ".claude/usage/$USAGE_NAME" ]; then
    cp "$USAGE_FILE" ".claude/usage/$USAGE_NAME"
  fi
done
echo "✅ .claude/usage/ に使用履歴ファイルをコピーしました（既存ファイルは保護）"

# handoff-artifact の雛形を作成
if [ ! -f ".claude/handoff-artifact.md" ]; then
cat > .claude/handoff-artifact.md << 'EOF'
# Handoff Artifact
# 更新日時: （セッション終了時に on-stop Hook が自動生成・handoff スキルが内容を記入）
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
  echo "✅ .claude/handoff-artifact.md の雛形を作成しました"
else
  echo "ℹ️  .claude/handoff-artifact.md は既に存在します（上書き保護）"
fi

# .env.example / .editorconfig をコピー（上書き保護あり）
if [ ! -f ".env.example" ]; then
  cp "$SNIPPETS/.env.example" .env.example
  echo "✅ .env.example をコピーしました（チームで共有・値は .env に記入）"
else
  echo "ℹ️  .env.example は既に存在します（上書き保護）"
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
<!-- 対話プロンプトは .claude/standards/principles/project-definition.md を参照 -->

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
<!-- 詳細は .claude/standards/principles/resilience.md を参照 -->

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
    echo ".claude/handoff-artifact.md" >> .gitignore

  fi

  # .claude/standards/ の追記（handoff 処理とは独立して確実に設定する）
  if ! grep -q "\.claude/standards/" .gitignore; then
    echo ".claude/standards/" >> .gitignore
    echo "✅ .gitignore に .claude/standards/ を追記しました"
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

  # .claude/usage/ の管理方法（全シナリオで選択できるよう独立ブロックに）
  if ! grep -q "\.claude/usage/" .gitignore; then
    echo ""
    echo "📋 .claude/usage/ の管理方法を選択してください："
    echo "   .claude/usage/skill-usage.md はスキルの使用履歴ログです。"
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
      echo ".claude/usage/" >> .gitignore
      echo "✅ .gitignore に .claude/usage/ を追記しました"
    else
      echo "ℹ️  .claude/usage/ は git 管理します"
    fi
  fi
fi

echo ""
# .git/hooks/pre-commit を作成（人間のgit commitも保護する）
# このファイルは .git/ 内にあるため git 管理対象外だが、setup-harness.sh が毎回作成する
if [ -d ".git" ]; then
  cat > .git/hooks/pre-commit << 'HOOKEOF'
#!/bin/bash
# pre-commit hook: 機密情報・秘密鍵・env ファイルのコミットを防ぐ
# setup-harness.sh が自動生成。再セットアップで再作成される。

echo "[Security] コミット前セキュリティチェック..."

FAILED=0

# ── 危険なファイル名のチェック ─────────────────────────────────────
# .env 系
ENV_FILES=$(git diff --cached --name-only | grep -E '(^|/)\.env$|(^|/)\.env\.' | grep -v '\.example$')
if [ -n "$ENV_FILES" ]; then
  echo "[ERROR] .env ファイルがコミットに含まれています:" >&2
  echo "$ENV_FILES" >&2
  echo "  git restore --staged <file> で除外してください。" >&2
  FAILED=1
fi

# 秘密鍵・証明書ファイル
KEY_FILES=$(git diff --cached --name-only | grep -E '\.(pem|key|p12|pfx|crt|cer|der)$|^id_rsa$|^id_ed25519$|^id_dsa$|^id_ecdsa$')
if [ -n "$KEY_FILES" ]; then
  echo "[ERROR] 秘密鍵・証明書ファイルがコミットに含まれています:" >&2
  echo "$KEY_FILES" >&2
  FAILED=1
fi

# 認証情報ファイル
CRED_FILES=$(git diff --cached --name-only | grep -E '(credentials|service.?account).*\.json$|\.npmrc$|\.netrc$|\.sqlite$|\.sqlite3$|\.db$')
if [ -n "$CRED_FILES" ]; then
  echo "[WARN] 認証情報ファイルの可能性があります:" >&2
  echo "$CRED_FILES" >&2
  echo "  機密情報が含まれていないか確認してください。" >&2
  FAILED=1
fi

# ── 危険なコンテンツパターンのチェック ──────────────────────────────
CONTENT_PATTERNS=(
  "API_KEY[[:space:]]*="
  "API_SECRET[[:space:]]*="
  "SECRET_KEY[[:space:]]*="
  "PASSWORD[[:space:]]*="
  "PRIVATE_KEY"
  "ACCESS_TOKEN[[:space:]]*="
  "DATABASE_URL[[:space:]]*="
  "aws_access_key_id"
  "aws_secret_access_key"
  "GOOGLE_APPLICATION_CREDENTIALS"
  "STRIPE_SECRET_KEY"
  "SENDGRID_API_KEY"
  "Bearer [A-Za-z0-9+/]"
  "sk-[a-zA-Z0-9]{20}"
  "ghp_[a-zA-Z0-9]"
  "-----BEGIN.*PRIVATE KEY-----"
)

for PATTERN in "${CONTENT_PATTERNS[@]}"; do
  MATCHES=$(git diff --cached --name-only \
    | xargs grep -l -E "$PATTERN" 2>/dev/null \
    | grep -v "\.env" \
    | grep -v "\.example" \
    | grep -v "pre-commit" \
    | grep -v "setup-harness")
  if [ -n "$MATCHES" ]; then
    echo "[WARN] 機密情報パターン「$PATTERN」を検出:" >&2
    echo "$MATCHES" >&2
    FAILED=1
  fi
done

if [ $FAILED -eq 1 ]; then
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
  echo "✅ .git/hooks/pre-commit を設定しました（人間のコミットも機密情報から保護）"
else
  echo "ℹ️  .git ディレクトリが見つかりません。git init 後に setup-harness.sh を再実行してください。"
fi

echo "🔍 セットアップの検証中..."
VALIDATION_FAILED=0

# .claude/standards/ が正しくコピーされているか確認
# 基本ファイルの存在確認
for FILE in AGENTS.md ARCHITECTURE.md .env.example .editorconfig \
            .claude/coding-conventions.md .claude/project-context.md; do
  if [ ! -f "$FILE" ]; then
    echo "❌ $FILE が作成されていません"
    VALIDATION_FAILED=1
  fi
done

# .claude/standards/ が正しくコピーされているか確認
if [ ! -d ".claude/standards/principles" ] ||    [ -z "$(ls -A .claude/standards/principles/ 2>/dev/null)" ]; then
  echo "❌ .claude/standards/principles/ が作成されていません"
  VALIDATION_FAILED=1
fi
if [ ! -d ".claude/standards/architectures" ] ||    [ -z "$(ls -A .claude/standards/architectures/ 2>/dev/null)" ]; then
  echo "❌ .claude/standards/architectures/ が作成されていません"
  VALIDATION_FAILED=1
fi

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
echo "    → .claude/standards/principles/project-definition.md にある対話プロンプトを使う"
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
echo "  Step 4：Hooks・settings.json は setup-harness.sh で自動設定済みです"
echo "    → lint・フォーマット・secrets チェック・handoff 生成が有効になっています"
echo "    → 設定の確認・調整は .claude/hooks/README.md を参照してください"
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
echo "    → Claude Code を起動してプロジェクトフォルダを開く"
echo "    → AGENTS.md の Session Protocol に従い自動的に作業が始まります"
echo "       （AGENTS.md は Claude Code がプロジェクト開始時に自動で読み込みます）"
echo ""
echo "参考ドキュメント（プロジェクト内 .claude/standards/ に配置済み）："
echo "  .claude/standards/principles/harness-engineering.md"
echo "  .claude/standards/principles/security-implementation.md  ← 認証・セキュリティ実装時"
echo "  .claude/standards/principles/code-quality.md             ← コード品質基準"
echo "  .claude/standards/principles/risk-based-approach.md      ← 投資優先度の判断"
echo "  .claude/standards/principles/resilience.md               ← 障害・復旧設計時"
