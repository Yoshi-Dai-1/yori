# Session Context

<!-- セッション終了時に上書き更新する（追記しない）。
     前回の履歴は git log で参照可能。 -->

## 今回の変更（2026-06-07）

block-on-first-write 方式への移行 + 非コードファイルギャップ修正 + 全ファイル整合性監査と修正。

### Changed files

| ファイル | 内容 |
|---------|------|
| `snippets/.opencode/plugins/rule-injector.ts` | **全面書き換え**: block-on-first-write + CSS(.css/.scss) を CODE_FILE_PATTERN に追加 + 非コードファイルギャップ(go.mod/pom.xml/build.gradle)修正 + COMMON_CODE_RULES 削除 |
| `snippets/.opencode/plugins/README.md` | rule-injector セクション全面更新（作用フロー・BLOCK/注入テーブル） |
| `.design-notes/session-context.md` | このファイル（上書き） |

### 🔴 Issues found and fixed

| # | ファイル | 問題 | 修正 |
|---|---------|------|------|
| 1 | `snippets/agents/AGENTS.md:99` | bare path `tdd-with-ai.md` — target project で解決不能 | → `.opencode/standards/principles/tdd-with-ai.md` |
| 2 | `docs/build-log.md` | 4ファイルで参照されているが template なし・setup-harness.sh 未作成 | → `snippets/docs/build-log.md.template` 作成 + setup-harness.sh に作成ステップ追加 |
| 3 | `README.md:317` | "11つの TS Plugin" → 実際は13 | → "13つの" |
| 4 | `README.md:312` | ".opencode/instructions/*.md を自動ロードする設定" → 現在は Plugin 駆動 | → Plugin 注入の説明に修正 |
| 5 | `setup-harness.sh:136` | instructions コピーコメントに6ファイル欠落 | → 全ファイル明示 |
| 6 | `stack-setup.md:76-78` | Step 3.6 と Step 4 が同一ファイル _step-36-arch.md を重複参照 | 低優先度・機能的に正しいため未修正 |

### Verifications

- **paths: vs filePattern**: 113/113 エントリ全件一致 ✅
- **孤立ファイル**: 全 instruction ファイルが RULES または CONVENTION_FILES に所属 ✅
- **plugins ファイル参照**: 全13 Plugin のパスが相対パスで正しい ✅
- **principles 相互参照**: 全 `.opencode/standards/principles/` プレフィックス ✅
- **旧 rules/ パス**: 全滅（0件）✅
- **opencode.json.template**: `["AGENTS.md"]` ✅

### Key design decisions

1. **block-on-first-write**: 初回コードファイル書き込みを `throw new Error()` で BLOCK。AI に規約ファイルを読ませてから再試行させる。`tool.execute.before` のエラーは AI の tool result に返り人間には表示されない。

2. **規約ファイル3本でブロック**: `naming-conventions.md`, `directory-structure.md`, `coding-conventions.md`。この3つは「最初の1行」で決定される構造（ファイル名・階層・コードパターン）に影響し、後からの修正コストが高い。

3. **COMMON_CODE_RULES 削除**: 規約は block-on-first-write で処理。グループ注入は不要になった。

4. **非コードファイルギャップ修正**:
   - `security`: `docs/project-definition.md`, `AGENTS.md`, `package.json`, `requirements*.txt`, `*.toml`, `Gemfile`, `composer.json`, `pubspec.yaml`, `*.csproj`, `packages.config` を filePattern に追加
   - `network-resilience`: `ARCHITECTURE.md`, `docs/project-definition.md` を filePattern に追加
   - `design-contract`: `design/*.json` を filePattern に追加

5. **conventionsRead は事前読了を尊重**: AI が初回書き込みより前に規約ファイルを自発的に読んでいた場合、ブロックは発生しない（`conventionsRead.size` がセットされているため）。

6. **コンパクション耐性**: セッションコンパクションでメモリ状態は消失するが、最悪1回の再ブロックで回復。AI は会話履歴から規約内容を把握しており即座に再試行する。

### Current RULES (Plugin-injected, noReply)

- `code-quality`: コードファイル編集時（ファイルサイズ制限、単一責任）
- `security`: コードファイル + 非コードファイル編集時 + 内容キーワード検出（login/auth/token/stripe/payment 等）
- `network-resilience`: コードファイル + ARCHITECTURE.md + docs/project-definition.md 編集時 + 内容キーワード検出（fetch/axios/retry/timeout 等）
- `design-contract`: UIファイル(.tsx/.jsx/.css/.scss) + DESIGN.md + design/*.json 編集時
- `stack-setup`: ARCHITECTURE.md 編集時

## 残タスク

- rule-injector.ts の実機動作未検証（OpenCode Plugin ランタイム依存）
- compaction-context.ts との連携（conventionsOffered 状態の保存）は未実装（将来対応）
- 他プロジェクト実機テスト（setup-harness.sh 実行後）
