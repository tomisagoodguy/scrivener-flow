## Why

系統追蹤 16 支主動 ETF 的持股，但無法回答最關鍵的問題：「這些 ETF 有沒有 outperform 大盤？」以及「ETF 報酬主要來自哪幾支股票？」現有 `etf_position_summary` 只記錄個別持股損益，缺乏跟大盤對比的 alpha 視角和持股貢獻度聚合。

## What Changes

- 新增 `BenchmarkSyncStep`（輔助步驟）：每日從 FinLab 抓取 ETF 市場報酬、台灣加權指數報酬、0050 報酬，存入 `etf_benchmark_comparison`
- 新增 `AttributionComputeStep`（輔助步驟）：利用現有 `etf_holdings_snapshot` 持股權重與 `stock_prices_daily` 個股報酬，計算每期各持股貢獻度，存入 `etf_holding_attribution`
- 新增前端頁面 `/investment/attribution`：ETF vs 大盤累積報酬折線圖 + 持股貢獻度長條圖
- 策略 vs ETF 報酬比較（策略選股是否比 ETF 更好？）→ 超出此 change 範圍，保留為未來

## Capabilities

### New Capabilities

- `etf-vs-benchmark`: Pipeline 同步 ETF 市場報酬 vs 加權指數/0050，儲存至 `etf_benchmark_comparison`，前端以折線圖呈現累積 alpha
- `etf-holding-attribution`: 依持股權重與個股報酬計算持股貢獻度，儲存至 `etf_holding_attribution`，前端呈現前五大貢獻者與拖累者

### Modified Capabilities

（無既有 spec 需變更）

## Impact

- **新增 Pipeline 步驟**：`ETF/pipeline/steps/benchmark_sync_step.py`、`ETF/pipeline/steps/attribution_compute_step.py`
- **修改 Orchestrator**：插入兩個新輔助步驟（`PositionSummaryStep` 之後）
- **新增 DB 表（Supabase migration）**：`etf_benchmark_comparison`、`etf_holding_attribution`
- **新增前端頁面**：`src/app/investment/attribution/page.tsx`
- **新增 Server Action**：`src/app/actions/getAttribution.ts`
- **修改導航**：`src/app/investment/layout.tsx`（「更多」下拉加入「績效歸因」）
- **FinLab 依賴**：`index_price:收盤價`（加權指數）、`price:收盤價`（0050 和 ETF 代碼）
