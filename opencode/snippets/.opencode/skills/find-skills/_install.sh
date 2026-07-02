#!/bin/bash
# find-skills/_install.sh
# 初回使用時に find-skills スキルをダウンロードする
# setup-harness.sh の代わりに、AI エージェントが自律判断して実行する
set -e

SKILL_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO="https://github.com/vercel-labs/skills.git"
SOURCE_PATH="skills/find-skills"

echo "📦 find-skills をダウンロードしています..."

TMP=$(mktemp -d)
if ! git clone --depth 1 "$REPO" "$TMP" 2>/dev/null; then
  echo "❌ find-skills のダウンロードに失敗しました"
  echo "   ネットワーク環境を確認してください"
  rm -rf "$TMP"
  exit 1
fi

if [ ! -d "$TMP/$SOURCE_PATH" ]; then
  echo "❌ リポジトリ構造が想定と異なります: $SOURCE_PATH が見つかりません"
  rm -rf "$TMP"
  exit 1
fi

cp -r "$TMP/$SOURCE_PATH"/* "$SKILL_DIR/"
rm -rf "$TMP"
rm "$SKILL_DIR/_install.sh"

echo "✅ find-skills をインストールしました"
