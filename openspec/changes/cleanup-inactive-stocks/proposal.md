## Why

每日 ETF Pipeline 的 `CleanupStep` 目前只按時間 retention（260–730 天）刪除舊資料，但對於已完全出場（不再出現在任何 ETF 持股）的股票，其歷史資料仍被保留至 retention 到期，佔用 Supabase 免費版的有限空間。限縮同步範圍至「目前仍在持股的股票」，可大幅減少無效資料的累積。

## What Changes

- 修改 `cleanup_old_data()`：新增「非現有持股」的清理邏輯，對已離開所有 ETF 持股的股票，刪除其在 `stock_prices_daily`、`stock_revenue_monthly`、`stock_broker_transactions`、`stock_shareholder_weekly` 的歷史資料（保留 30 天 buffer，避免誤刪剛出場的股票）
- 「現有持股」定義：過去 7 天內出現在 `etf_holdings_snapshot` 的 `stock_code`（涵蓋各 ETF 公告日不同步的情況）
- 時間 retention 規則維持不變（用於現有持股的資料量控管）

## Capabilities

### New Capabilities

- `inactive-stock-cleanup`: 清理已離開所有 ETF 持股的股票輔助資料（股價、營收、券商、集保），在每日 `CleanupStep` 執行

### Modified Capabilities

（無）

## Impact

- **修改檔案**：`ETF/database/sql_storage.py`（`cleanup_old_data()` 方法）
- **依賴資料表**：`etf_holdings_snapshot`（用來判斷現有持股清單）
- **影響資料表**：`stock_prices_daily`、`stock_revenue_monthly`、`stock_broker_transactions`、`stock_shareholder_weekly`
- **無 API / 前端影響**：清理邏輯純後端，前端查詢不受影響（查詢的股票必然在現有持股中）
