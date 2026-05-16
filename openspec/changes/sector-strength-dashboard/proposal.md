## Why

目前每日 ETF Pipeline 只追蹤持股異動，缺乏「今天哪個產業在動」的即時感知。代書在操作投資時需要快速判斷族群輪動方向，但現有工具需手動查詢多個來源。

## What Changes

- **新增 Pipeline 步驟**：每日自動計算全市場族群漲幅（日/週/月），存入 DB
- **新增 LINE 通知區塊**：每日報告附上今日強勢族群 TOP 5 + 本週強勢族群 TOP 5
- **新增 Web 頁面** `/investment/sectors`：顯示族群強弱排行，可點開查看成分股清單與個股漲幅
- **新增 DB Table** `sector_strength`：儲存每日各族群漲幅快照

## Capabilities

### New Capabilities
- `sector-strength-pipeline`: ETF Pipeline 新增 `SectorStrengthStep`，使用 `security_industry_themes` + `price:收盤價` 計算各族群日/週/月平均漲幅，每日存入 `sector_strength` table
- `sector-strength-web`: `/investment/sectors` 頁面，顯示族群強弱三維排行（日/週/月切換），點擊族群展開成分股清單與個股漲幅
- `sector-strength-line`: 每日 LINE 報告新增族群強弱摘要區塊（今日 TOP 5 + 本週 TOP 5）

### Modified Capabilities
- `etf-daily-report`: LINE 每日報告新增族群摘要 section

## Impact

- **新增**：`ETF/pipeline/steps/sector_strength_step.py`
- **新增**：`supabase/migrations/<timestamp>_add_sector_strength.sql`
- **修改**：`ETF/pipeline/orchestrator.py`（加入新步驟，輔助步驟，失敗不中斷）
- **修改**：`ETF/daily_ai_report.py`（加入族群摘要）
- **新增**：`src/app/investment/sectors/page.tsx` + 對應 Server Action
- **依賴**：FinLab VIP 資料 `security_industry_themes`（已確認可用）
