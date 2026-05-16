## Why

族群強弱告訴我們資金流向，但不知道該買哪支。加入策略篩選（三均線 + 月營收成長）後，可直接輸出「強勢族群中符合策略的個股清單」，讓每日 LINE 通知從「看方向」升級到「看標的」。

台股特性：族群啟動時營收可能還沒反映，但均線多頭排列 + 月營收向上是可以同時確認的訊號。

## What Changes

- **`SectorStrengthStep` 新增策略命中計算**：對成分股套用三均線 + 月營收條件，標記 `is_strategy_hit`，並計算策略動能分數（5 日滾動均漲幅）
- **`sector_strength_stocks` 新增欄位**：`is_strategy_hit BOOLEAN`、`momentum_score NUMERIC`
- **LINE 通知新增策略命中清單**：在族群摘要後附上「今日命中清單」—族群 + 個股 + 動能分數，取全市場前 10 名
- **Web 頁面成分股標記**：命中策略的個股顯示 ⚡ 標記

## Capabilities

### New Capabilities
- `strategy-signal-compute`: 在 `SectorStrengthStep.execute()` 內，取 `price:收盤價`（含均線）與 `monthly_revenue:當月營收`，對每支成分股計算策略命中與動能分數

### Modified Capabilities
- `sector-strength-pipeline`: `sector_strength_stocks` 新增 `is_strategy_hit`、`momentum_score` 欄位
- `sector-strength-line`: LINE 族群摘要後附加策略命中個股 TOP 10
- `sector-strength-web`: 成分股列表中命中策略者顯示 ⚡

## Impact

- **修改**：`supabase/migrations/` 新增 migration（ALTER TABLE）
- **修改**：`ETF/pipeline/steps/sector_strength_step.py`（加策略計算邏輯）
- **修改**：`ETF/daily_ai_report.py` 的 `build_sector_summary()`（加命中清單）
- **修改**：`src/app/investment/sectors/SectorDashboard.tsx`（加 ⚡ 標記）
- **依賴**：FinLab `monthly_revenue:當月營收`（VIP 資料，與現有步驟同配額）
