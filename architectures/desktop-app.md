# アーキテクチャ：デスクトップアプリ

**向いている場面**：OS上で動くネイティブアプリ・Electronアプリ・クロスプラットフォームデスクトップツール
**言語**：TypeScript（Electron / Tauri）/ Python（Tkinter / PyQt6 / wxPython）/ C#（.NET MAUI / WPF）/ Swift（macOS）/ Kotlin（JVM Desktop）

---

## このファイルの使い方

具体的なフレームワークが確定したら、`stack-setup.md` の Step 3.5 ブロックC が
フレームワーク公式ドキュメントから固有の必須ファイル・ディレクトリ構成を自律検索して補完する。
このファイルは「共通の設計思想」を提供し、フレームワーク固有の詳細は自律検索で調達する。

---

## 技術選定の判断基準

フレームワークが未定の場合、以下の基準で選択する：

| 要件 | 推奨フレームワーク |
|------|-----------------|
| Web技術（HTML/CSS/JS）でUIを作りたい・クロスプラットフォーム必須 | Electron（Node.js）/ Tauri（Rust）|
| パフォーマンス重視・バイナリサイズを小さくしたい | Tauri（Rust） |
| Pythonで完結させたい | PyQt6 / PySide6（商用はライセンス確認）/ Tkinter（標準・シンプル用途）|
| Windows専用・.NETエコシステム | .NET MAUI（クロスプラットフォーム・新規推奨）/ WPF（Windows専用・デスクトップのみ）|
| macOS専用・ネイティブ品質 | SwiftUI / AppKit（Swift）|
| クロスプラットフォーム・JVMエコシステム | Compose Multiplatform（Kotlin）|
| Linux専用、またはLinuxを含む環境でのネイティブ品質 | GTK（Python: PyGObject / C）/ Qt（Python: PyQt6・PySide6 / C++）|

**Linux専用デスクトップアプリの技術選定について：**
Linux専用の技術（GTK / Qt等）はエコシステムの変化が速く、ウィンドウマネージャー（GNOME / KDE等）への対応状況も変わる。
ブロックCが以下のクエリで最新情報を自律検索して補完する：
`Linux desktop app [選択ツール名] best practices [現在年]`

選択後、以下を検索してフレームワーク固有の必須ファイルと構成を確認する：
`[フレームワーク名] project structure required files [現在年]`

---

## ディレクトリ構成（Electron / Tauri の場合）

```
project-root/
  src/
    main/                     メインプロセス（Node.js / Rust）
      index.ts                エントリポイント
      window.ts               ウィンドウ管理
      ipc/                    IPC通信ハンドラ
        handlers.ts
    renderer/                 レンダラープロセス（UI）
      components/
      pages/
      styles/
    shared/                   メイン・レンダラー共通の型定義
      types.ts
      constants.ts

  assets/                     アイコン・画像
  dist/                       ビルド成果物（gitignore）
  release/                    パッケージング成果物（gitignore）

  electron-builder.yml        パッケージング設定（Electron）
  tauri.conf.json             Tauri設定ファイル（Tauri）
  package.json
  tsconfig.json
  .env.example
```

## ディレクトリ構成（Python GUIの場合）

```
project-root/
  src/
    [package_name]/
      __init__.py
      main.py                 エントリポイント
      ui/                     UIコンポーネント・ウィンドウ定義
        main_window.py
        dialogs/
      core/                   ビジネスロジック（UI非依存）
        [domain].py
      adapters/               外部サービス・ファイルシステム連携
      config/
        settings.py

  assets/
  tests/
  pyproject.toml              必須（パッケージ定義・依存管理）
  .env.example
```

---

## デスクトップアプリ固有の設計原則

**プロセス分離（Electron / Tauri）**

メインプロセスとレンダラープロセスを明確に分離する。
UIロジックをメインプロセスに書かない。ビジネスロジックをレンダラーに書かない。
IPC（プロセス間通信）を経由してのみ通信する。

**セキュリティ（Electron固有）**

```
必須設定（Electron）：
  contextIsolation: true      レンダラーからNode.jsへの直接アクセスを禁止
  nodeIntegration: false      レンダラーでのNode.js使用を禁止
  sandbox: true               レンダラーをサンドボックス化
```

セキュリティ設定の最新状況を確認する：
`Electron security best practices [現在年]`

**自動アップデート**

デスクトップアプリは自動アップデートの仕組みを設計初期に決める。
後付けは困難なため、リリース前に以下を決定する：
- アップデートサーバーの方式（electron-updater / Tauri updater 等）
- 署名証明書の取得と管理方法（配布プラットフォームの要件を確認する）

**配布プラットフォームの要件**

各プラットフォームの公式ドキュメントを確認する：

| プラットフォーム | 確認すべき内容 | 検索クエリ |
|----------------|-------------|-----------|
| macOS App Store | 公証（Notarization）・サンドボックス要件 | `macOS notarization requirements [現在年]` |
| macOS 直接配布（.dmg）| 公証（Notarization）・コード署名（Developer ID）| `macOS Developer ID signing [現在年]` |
| Windows Microsoft Store | MSIX パッケージング・コード署名 | `Windows MSIX packaging requirements [現在年]` |
| Windows 直接配布（.exe / .msi）| コード署名証明書（EV証明書推奨）| `Windows code signing EV certificate [現在年]` |
| Windows パッケージマネージャー経由 | winget / Chocolatey / Scoop への登録手順 | `winget submit package [現在年]` |
| Linux Snap / Flatpak | パッケージング要件・ストア審査 | `Flatpak packaging requirements [現在年]` |
| Linux AppImage | インストール不要の単一バイナリ配布 | `AppImage packaging [現在年]` |
| Linux Homebrew（Linuxbrew）| Formula 作成・審査 | `Homebrew formula submission [現在年]` |

---

## 必須ファイル（共通）

| ファイル | 役割 | 備考 |
|---------|------|------|
| `README.md` | インストール手順・使い方 | ダウンロードURLを含める |
| `.env.example` | 環境変数テンプレート | |
| `.gitignore` | dist/ release/ を除外 | |

フレームワーク固有の必須ファイルは `stack-setup.md` の Step 3.5 ブロックB が自律検索して記録する。

---

## 参照ドキュメント

- `.claude/standards/principles/security-requirements.md`（セキュリティ対応レベル）
- `.claude/standards/principles/non-functional-requirements.md`（パフォーマンス・UX要件）
- `.claude/standards/principles/production-readiness.md`（リリース前チェックリスト）
