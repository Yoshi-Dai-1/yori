# セッションコンテキスト（dev-standards 設計記録）

<!-- このファイルは dev-standards 固有の設計メモ。
     setup-harness.sh で他プロジェクトにコピーされない。
     セッション開始時に AGENTS.md Session Protocol Step 1 で自動参照される。 -->

## ハーネスエンジニアリングの5原則

1. **SSOT（Single Source of Truth）**: 判断基準は1ファイルに集約。参照元はSSOTを指す
2. **Why/Howの階層分離**: rules=Why（判断基準）、principles=How（手順詳細）
3. **コンテキスト消失対策**: AGENTS.md（セッション開始時）+ rules（編集時自動リロード）+ hooks（コード強制）
4. **段階的開示（Progressive Disclosure）**: 詳細は必要時のみ読む。AGENTS.mdに書かない
5. **普遍性**: 特定の言語・フレームワークに依存しない横断的設計

## 重要な設計判断一覧

### P0: 破壊的バグ（修正済み）
- `setup-harness.sh`の`.env.example`コピーで全値がコメント化 → `.env`を空ファイルで作成しAIが初期値記入
- 脅威モデリングの未実施判定に具体ロジックが欠如 → 判定条件を明文化

### P1: 論理矛盾（修正済み）
- チームサイズ定義の分裂 → 統一: 個人=1人、小規模=2〜5人、中規模以上=6人以上
- セキュリティスコープの重複 → code-reviewerはCRITICALのみ、@security-auditorが詳細担当
- GraphQLセクションのフォーマット崩壊 → 修正済み

### P2: 構造問題（修正済み）
- Java/Kotlin/C/C++/C#のテンプレート欠落 → stack-setup.mdに案内セクション追加
- tsconfig.base.jsonの孤立ファイル → 削除しインラインテンプレートに統合
- `.env.example.template`の孤立ファイル → 削除（`.env.example`がSSOT）
- `handoff/SKILL.md`と`on-stop Hook`の競合 → HANDOFF_FILLEDマーカーで制御

### P3: 不整合（修正済み）
- READMEのインデントずれ → 修正
- `quality-scorecard.md.template`の記載漏れ → READMEに追加
- Hook一覧の記載漏れ（2件）→ READMEに追加

### P4: 改善提案（却下または保留）
- security.md行数削減（283行）→ 却下（すべてAI自律判断に必須）
- stack-setup.md行数削減（597行）→ 却下（半分はテンプレート、削ると機能不全）
- network-resilience.mdのGraphQLブロック削除 → 却下（外部通信検知に必要）
- READMEディレクトリ構造図の自動生成 → 却下（静的ドキュメントが適切）

## ファイル間依存関係（重要）

```
AGENTS.md → rules/*.md（常駐ルール）
  ├→ .claude/standards/principles/（詳細ドキュメント）
  └→ snippets/.claude/hooks/（コード強制）

rules/security.md → security-requirements.md（SSOT）
rules/network-resilience.md → principles/network-resilience.md（SSOT）
rules/stack-setup.md → プロジェクト固有の自動展開（3レベル）

setup-harness.sh → snippets/配下のテンプレートをコピー
  → コピー対象: principles/ architectures/ decisions/ snippets/
  → コピー対象外: AGENTS.md（ルート） .design-notes/
```

## 未解決の課題

1. P4-1: security.mdが283行で長すぎるが、削るとAIが判断不能
2. P4-2: stack-setup.mdが597行で長すぎるが、半分はテンプレート
3. 外部スキル（find-skills/skill-creator）のインストール自動化
4. hooksのテスト手法が未確立（Claude Code依存）

## AIが判断に迷うパターン集（禁止表現）

以下の書き方はAIに誤解や確認を招く。修正例を守る。

| 禁止表現 | 理由 | 修正例 |
|---------|------|--------|
| 「AIは」 | 「どのAIか」を聞き返す | 「AIエージェントは」 |
| 「必要に応じて」 | 条件が不明。AIが推測する | 「.envが存在しない場合」「200文字を超える場合」 |
| 「適切な値を設定する」 | 具体的な値が不明 | 「NODE_ENV=development、PORT=3000」 |
| 「場合により」 | 分岐条件が不明 | 「商用プロジェクトの場合」「Lv.3以上の場合」 |
| 「検討する」 | 何を検討するか不明 | 「threat-modeling.mdのSTRIDEモデルで検討する」 |
| 「推奨される」 | 誰が推奨するか不明 | 「OWASP Top 10で推奨される」 |
| 「このファイル」 | コンテキスト消失後に不明 | 「.claude/rules/security.md」 |
| 「前述の」 | コンテキスト消失後に不明 | 「security-requirements.mdのStep 3」 |
| 「必要に応じて省略」 | AIが省略判断を誤る | 「認証が不要なプロジェクトでは削除する」 |

### 判断に迷わせない書き方の原則

1. **条件は具体値で書く**: 「小規模」→「2〜5人（security-requirements.md:74）」
2. **参照は絶対パスで書く**: 「このルール」→「.claude/rules/security.md」
3. **判断基準はSSOTを指す**: 「適切な値」→「security-requirements.mdのLv.X表」
4. **除外条件は明文化**: 「〜しない」→「〜しない（ただし〜の場合は除く）」

---

## rules/ と AGENTS.md の「意図的な重複」について

rules/*.md には AGENTS.md と重複する記述が存在する。これは**削除してはいけない**。

### 理由: コンテキスト消失対策の3層防御

```
Layer 1: AGENTS.md           → セッション開始時に一度だけ読み込まれる
Layer 2: rules/*.md          → ファイル編集のたびに自動リロードされる
Layer 3: hooks/*.sh          → AIの意思に関わらず必ず実行される
```

**例: network-resilience.md のタイムアウト設定**

```
AGENTS.md:116-118  「外部API通信 → タイムアウト両方設定」
rules/network-resilience.md:88-90  「外部通信にタイムアウトを設定せずにコードを書かない」
```

同じ内容だが、AGENTS.mdのコンテキストが消失してもrules/がガードレールとして機能する。
**「冗長だから削除しよう」と判断しない。**

### 意図的な重複の例

| AGENTS.md | rules/ | 重複の理由 |
|-----------|--------|-----------|
| Security Boundaries | rules/security.md | セキュリティ判断の二重保護 |
| ネットワーク設計指針 | rules/network-resilience.md | 通信コード編集時に自動チェック |
| コミット実行設定 | AGENTS.md内の独自セクション | セッション開始時に確認 |

---

## セッション終了時の更新手順（具体フォーマット）

`.design-notes/session-context.md` の「セッション終了時更新事項」セクションに追記する。

### 追記フォーマット

```markdown
### [YYYY-MM-DD] [セッションのタイトル]
- 変更ファイル数：Nファイル
- 主な変更内容：[1文]
- 削除ファイル：[あれば]
- 追加ファイル：[あれば]
- 未解決課題：[あれば]
- 次回セッションでやること：[具体的な1タスク]
```

### 注意

- **追記のみ**。既存セクションを上書きしない
- 日付は `YYYY-MM-DD` 形式
- 変更内容は1文で簡潔に（詳細はgit logで確認可能）
- 次回セッションで必ず着手するタスクを1つだけ書く（複数書くと優先度が不明になる）

---

## セッション終了時更新事項

<!-- 各セッション終了時に追記 -->

### [2026-05-28] P0〜P4修正完了 + セッション文脈復元機構の追加
- 36ファイル変更、+565行/-200行
- 孤立ファイル2件削除（tsconfig.base.json、.env.example.template）
- .envの矛盾解消（setup-harness.shは空ファイル作成 → AIが初期値記入）
- 全104のクロスリファレンス検証済み、リンク切れなし
- AGENTS.mdと.design-notes/を作成し、セッション間の文脈復元を実現
