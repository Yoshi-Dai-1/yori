# setup-harness.ps1
# yori のハーネステンプレートを新プロジェクトにコピーする（Windows PowerShell 版）
# このスクリプトは WSL2 経由で bash 版を呼び出します。

Write-Host "🔧 yori ハーネスセットアップ（PowerShell）" -ForegroundColor Cyan

# WSL の存在確認
$wslExists = Get-Command wsl -ErrorAction SilentlyContinue
if (-not $wslExists) {
    Write-Host "❌ WSL が見つかりません。" -ForegroundColor Red
    Write-Host ""
    Write-Host "yori のセットアップには WSL2（Windows Subsystem for Linux）が必要です。" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "インストール手順：" -ForegroundColor Yellow
    Write-Host "  1. PowerShell を管理者として開く" -ForegroundColor White
    Write-Host "  2. wsl --install を実行" -ForegroundColor White
    Write-Host "  3. PC を再起動" -ForegroundColor White
    Write-Host "  4. Ubuntu ターミナルでユーザー名・パスワードを設定" -ForegroundColor White
    Write-Host ""
    Write-Host "または、Git Bash（Git for Windows）を使って setup-harness.sh を直接実行してください。" -ForegroundColor Yellow
    exit 1
}

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$driveLetter = (Get-Item $scriptDir).PSDrive.Root.TrimEnd('\')
$wslPath = $scriptDir.Replace('\', '/') -replace "$driveLetter", "/mnt/$($driveLetter.ToLower())"

Write-Host "📦 WSL 経由で setup-harness.sh を実行します..." -ForegroundColor Cyan
# スクリプトは opencode/ 配下にあるので YORI_PATH を設定して WSL に渡す
& wsl bash -c "YORI_PATH='$wslPath/opencode' bash '$wslPath/opencode/setup-harness.sh'"
