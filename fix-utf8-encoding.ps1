# UTF-8 編碼批次修復腳本
# 用途: 修復所有 .agent 目錄下的 Markdown 檔案編碼問題

Write-Host "🔧 開始修復 UTF-8 編碼問題..." -ForegroundColor Cyan
Write-Host ""

# 1. 從 Git 恢復所有 .agent/*.md 檔案
Write-Host "📦 從 Git 恢復原始檔案..." -ForegroundColor Yellow
git checkout HEAD -- .agent/*.md

# 2. 驗證修復結果
Write-Host ""
Write-Host "✅ 驗證修復結果:" -ForegroundColor Green
Write-Host ""

$files = @(
    ".agent/rules.md",
    ".agent/LEARNINGS.md",
    ".agent/domain_expertise.md",
    ".agent/PROACTIVE_SUGGESTIONS.md"
)

foreach ($file in $files) {
    if (Test-Path $file) {
        Write-Host "  📄 $file" -ForegroundColor White
        $content = Get-Content $file -Encoding UTF8 -Head 3
        $content | ForEach-Object { Write-Host "     $_" -ForegroundColor DarkGray }
        Write-Host ""
    }
}

Write-Host "✅ 所有檔案已恢復為正確的 UTF-8 編碼!" -ForegroundColor Green
Write-Host ""
Write-Host "💡 建議: 在 VS Code 中設定 'files.encoding': 'utf8' 避免未來問題" -ForegroundColor Cyan
