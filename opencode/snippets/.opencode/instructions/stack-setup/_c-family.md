#### C/C++ が含まれる場合

ビルドシステム・コンパイラ設定がプロジェクト固有のため自動作成しない。

**インストールを実行する（OS別）：**
```bash
# macOS
brew install clang-format

# Linux (Debian/Ubuntu)
sudo apt install clang-format

# Linux (RHEL/Fedora)
sudo dnf install clang-format

# Windows（上から順に試す）
choco install llvm
scoop install llvm
winget install LLVM.LLVM
```
> **注：** clang-tidy は lint-and-typecheck.ts では実行しません（遅すぎるため）。
> CI パイプラインでのみ実行することを推奨します。

ユーザーに以下を案内する：
> ビルド設定ファイル（CMakeLists.txt / Makefile）をプロジェクトに合わせて作成してください。
> フォーマット: clang-format、lint: clang-tidy を推奨します。
> `clang-format --style=LLVM -i [ファイル]` でフォーマットできます。

---

#### C# が含まれる場合

プロジェクト固有の情報が必要なため自動作成しない。

**バージョン管理：** `global.json` で .NET SDK バージョンを固定する。
ARCHITECTURE.md に記録された .NET バージョンから以下のテンプレートで作成する：
```json
{
  "sdk": {
    "version": "8.0.0"
  }
}
```
（バージョンは ARCHITECTURE.md に記録されたバージョンを優先する。未記録の場合はインストール済み SDK の最新安定版を使う）

**インストール（全OS対応）：** .NET SDK に `dotnet format` が標準で含まれているため、追加インストール不要。
.NET SDK 未インストールの場合は `https://dotnet.microsoft.com/download` から各OS向けにインストールする。

ユーザーに以下を案内する：
> `dotnet new [テンプレート名]` でプロジェクトを作成してください。
> （例: `dotnet new webapi` / `dotnet new console` / `dotnet new classlib`）
> lint・フォーマット: `dotnet format` を推奨します。
