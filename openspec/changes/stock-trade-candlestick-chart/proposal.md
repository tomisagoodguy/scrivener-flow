## Why

`stock-trade` tab 的「股數/股價走勢」圖目前只顯示收盤折線，但 `stock_prices_daily` 表已存有完整的 open/high/low/close 資料，無法呈現每日價格區間，讓投資人錯失更豐富的進出場時機判讀。

## What Changes

- `DualAxisChart` 右軸從折線圖（LineSeries）改為 K 線圖（CandlestickSeries），顯示 open/high/low/close
- `computeStockPnl()` server action 回傳的 `priceHistory` 從 `{ time, value }` 改為 `{ time, open, high, low, close }`
- 圖例說明文字對應更新（移除「收盤價」改為「K 線」）

## Non-Goals

- 不新增成交量（Volume）直方圖
- 不更動左軸（股數折線）邏輯
- 不更動「加減碼事件時間軸」列表
- 不修改裸K看盤（`/investment/bare-k`）頁面

## Capabilities

### New Capabilities

- `stock-trade-candlestick`: 以 K 線圖取代折線圖顯示 `stock_prices_daily` 的 OHLC 資料，與左軸股數折線同步呈現

### Modified Capabilities

(none)

## Impact

- Affected specs: stock-trade-candlestick（新建）
- Affected code:
  - Modified: `src/app/actions/investmentPnl.ts`
  - Modified: `src/components/features/investment/DualAxisChart.tsx`
  - Modified: `src/app/api/investment/prices/route.ts`（如需擴充查詢欄位）
