# 快速打開下載資料夾並顯示最新的 Excel 檔案
# 使用方法: 在 PowerShell 中執行 .\open-downloads.ps1

Write-Host "🔍 正在打開下載資料夾..." -ForegroundColor Cyan
Write-Host ""

$downloadsPath = "$env:USERPROFILE\Downloads"

# 檢查下載資料夾是否存在
if (Test-Path $downloadsPath) {
    Write-Host "📂 下載資料夾位置: $downloadsPath" -ForegroundColor Green
    Write-Host ""
    
    # 列出最新的 5 個 Excel 檔案
    Write-Host "📊 最新的 Excel 檔案:" -ForegroundColor Yellow
    Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor DarkGray
    
    $excelFiles = Get-ChildItem "$downloadsPath\案件清單*.xlsx" -ErrorAction SilentlyContinue | 
                  Sort-Object LastWriteTime -Descending | 
                  Select-Object -First 5
    
    if ($excelFiles) {
        $excelFiles | ForEach-Object {
            $size = "{0:N2} KB" -f ($_.Length / 1KB)
            $time = $_.LastWriteTime.ToString("yyyy/MM/dd HH:mm:ss")
            Write-Host "  📄 $($_.Name)" -ForegroundColor White
            Write-Host "     大小: $size | 時間: $time" -ForegroundColor DarkGray
            Write-Host ""
        }
        
        # 顯示最新檔案的完整路徑
        $latestFile = $excelFiles[0]
        Write-Host "✨ 最新檔案:" -ForegroundColor Green
        Write-Host "   $($latestFile.FullName)" -ForegroundColor Cyan
        Write-Host ""
        
        # 詢問是否要打開檔案
        $response = Read-Host "是否要打開最新的檔案? (Y/N)"
        if ($response -eq 'Y' -or $response -eq 'y') {
            Write-Host "🚀 正在打開檔案..." -ForegroundColor Green
            Start-Process $latestFile.FullName
        }
    } else {
        Write-Host "  ⚠️  找不到任何「案件清單」Excel 檔案" -ForegroundColor Yellow
        Write-Host ""
        Write-Host "  請確認:" -ForegroundColor White
        Write-Host "  1. 您已經點擊「📊 匯出 Excel」按鈕" -ForegroundColor DarkGray
        Write-Host "  2. 瀏覽器沒有阻擋下載" -ForegroundColor DarkGray
        Write-Host "  3. 檢查瀏覽器右上角的下載圖示 ⬇️" -ForegroundColor DarkGray
        Write-Host ""
    }
    
    # 打開下載資料夾
    Write-Host "📁 正在打開下載資料夾..." -ForegroundColor Cyan
    Start-Process explorer.exe $downloadsPath
    
} else {
    Write-Host "❌ 找不到下載資料夾: $downloadsPath" -ForegroundColor Red
}

Write-Host ""
Write-Host "✅ 完成!" -ForegroundColor Green
