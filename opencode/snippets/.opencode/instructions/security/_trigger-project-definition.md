### project-definition.md が作成・更新されたとき

1. `.opencode/standards/principles/project-definition-guide.md` を読む
2. ガイド内のプロンプトに従い、人間と対話しながら各セクションを埋める
3. `.opencode/standards/principles/security-requirements.md` を読む
4. project-definition.md の内容からセキュリティ対応レベル（Lv.1〜4）を判定する
5. AGENTS.md の `## Security Boundaries` にプロジェクト固有の制約を追記する
6. 依存ライブラリの自動監視（Dependabot（GitHub）または Renovate（汎用））と CI/CD スキャン（言語別コマンドは `.opencode/instructions/security/_web-search.md` の対応表に従う）がそれぞれ未設定の場合、未設定の項目に対応する設定ファイルの作成を提案する（ファイルパスは使用プラットフォームに応じて決定する。GitHub の場合：`.github/dependabot.yml` および `.github/workflows/security-audit.yml`）
7. 判断結果のサマリーを人間に報告する
