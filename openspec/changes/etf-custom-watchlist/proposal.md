## Why

使用者需要在手機或瀏覽器即時新增/移除自選股，
目前只能本機修改 select_stock.xlsx 再 push，移動端完全無法操作。

## What Changes

- 新增 Supabase 表 `custom_watchlist`，儲存使用者自訂的股票代號與分組標籤
- 投資頁面新增「自選清單」管理 UI（搜尋股票 → 加入/移除，支援手機）
- `stock_chart_report.py` 合併讀取自選清單，一起納入裸K報告
- Excel 下載的「選股策略」Sheet 增加「自選」欄位

## Capabilities

### New Capabilities
- `custom-watchlist-crud`: 自選股新增/移除/分組的 CRUD 操作（DB + Server Action + UI）
- `watchlist-chart-integration`: 裸K報告自動包含自選清單股票

### Modified Capabilities
（無現有 spec 需異動）

## Impact

- DB: 新增 `custom_watchlist` 表（user_id, stock_code, label, created_at）
- Server Actions: `addToWatchlist` / `removeFromWatchlist`
- UI: `src/app/investment/` 頁面新增 WatchlistPanel 元件
- Python: `ETF/stock_chart_report.py` 讀取 `custom_watchlist`
