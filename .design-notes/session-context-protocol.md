# Session Context 更新プロトコル

<!--
  このファイルは .design-notes/session-context.md の更新ルールに関する設計判断の記録。
  session-context.md 自体の更新履歴ではない（session-context.md は上書きされるため、
  設計判断の永続的な記録をこのファイルに残す）。
-->

## 背景

AGENTS.md:82 で session-context.md は「更新する（overwrite）」と規定されている。
しかし以下の問題が発生した：

1. AIが session-context.md を読み、既存のパターン（第N部の羅列）を踏襲
2. AGENTS.md の「更新する」より、ファイル自体の構造パターンの影響が強く働いた
3. 結果として追記（append）が発生。AGENTS.md の規定に反する

## 1次対応（2026-06-01）

session-context.md 冒頭に以下のコメントを追加：

```markdown
<!-- セッション終了時に上書き更新する（追記しない）。
     前回の履歴は git log で参照可能。 -->
```

## 決定

**新たな仕組み（script / plugin）は追加しない。**
現状の冒頭コメントで抑制できるか検証する。

### 検証方法

次セッション終了時に session-context.md が追記形式か更新形式かを確認する。

- **✅ 更新（overwrite）されている** → 問題なし。追加措置不要
- **❌ 追記（append）されている** → コメントだけでは不十分と判断

### フェイルオーバー

再発確認時の対応（優先順）：

| 優先度 | 案 | 方法 |
|--------|----|------|
| 1 | 更新script（案B） | `.design-notes/update-context.sh` を作成。AIはscript経由でのみ更新。ファイル直接編集を禁止 |
| 2 | Plugin新設（案C） | `.opencode/plugins/session-context.ts` を新設。`session.idle` で発火。handoff.ts とのイベント競合に注意 |
