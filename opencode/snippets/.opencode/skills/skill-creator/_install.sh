#!/bin/bash
# skill-creator/_install.sh
# 初回使用時に skill-creator スキルをダウンロードする
# setup-harness.sh の代わりに、AI エージェントが自律判断して実行する
set -e

SKILL_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO="https://github.com/anthropics/skills.git"
SOURCE_PATH="skills/skill-creator"

echo "📦 skill-creator をダウンロードしています..."

TMP=$(mktemp -d)
if ! git clone --depth 1 "$REPO" "$TMP" 2>/dev/null; then
  echo "❌ skill-creator のダウンロードに失敗しました"
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

echo "✅ skill-creator をインストールしました"
