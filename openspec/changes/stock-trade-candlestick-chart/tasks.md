## 1. Server Action — OHLC data fetching

- [x] 1.1 在 `src/app/actions/investmentPnl.ts` 的 `computeStockPnl()` 中，實作 D1：資料格式切換 — 將 `stock_prices_daily` 查詢欄位從 `close` 改為 `open, high, low, close`
- [x] 1.2 更新 `priceHistory` 型別（D1）：從 `{ time: string; value: number }[]` 改為 `{ time: string; open: number; high: number; low: number; close: number }[]`
- [x] 1.3 過濾 null OHLC 記錄：在組裝 `priceHistory` 陣列時加 `.filter(d => d.open != null)`，確保 OHLC data fetching 不回傳無效資料
- [x] 1.4 確認函式回傳型別 annotation 已同步更新，TypeScript 無報錯

## 2. 元件 — Candlestick chart rendering

- [x] [P] 2.1 在 `src/components/features/investment/DualAxisChart.tsx` 中，將右軸 `LineSeries` 改為 `CandlestickSeries`（lightweight-charts v5：`chart.addSeries(CandlestickSeries, {...})`）
- [x] [P] 2.2 實作 D2：CandlestickSeries 顏色（台股慣例）— `upColor: '#e11d48'`、`downColor: '#059669'`、`borderUpColor: '#e11d48'`、`borderDownColor: '#059669'`、`wickUpColor: '#e11d48'`、`wickDownColor: '#059669'`
- [x] [P] 2.3 將 `priceHistory` 的 `setData()` 呼叫資料格式從 `{ time, value }` 更新為 `{ time, open, high, low, close }`，完成 Candlestick chart rendering
- [x] 2.4 實作 D3：圖例更新 — Legend label update：右軸圖例文字從「收盤價（右軸，元）」改為「K 線（右軸，元）」
- [x] 2.5 Buy/sell event markers preserved：確認 `setMarkers()` 邏輯無需更動，buy/sell 事件圓點仍正常渲染
- [x] 2.6 確認雙軸 autoScale 在 CandlestickSeries 下正常，若有 `fitContent` 呼叫需保留

## 3. 型別同步與 Props 更新

- [x] 3.1 找出所有呼叫 `DualAxisChart` 的地方（`EtfStockTradeView.tsx` 等），確認 `priceHistory` prop 傳入格式已更新為 OHLC 結構
- [x] 3.2 若 `DualAxisChart` 的 props interface 有明確型別定義，同步更新（從 `{ time: string; value: number }[]` 改為 OHLC 陣列型別）

## 4. 驗證

- [x] 4.1 執行 `yarn build`，確認 TypeScript 無型別錯誤
- [ ] 4.2 在 `localhost:3000/investment/00981A?tab=stock-trade` 選取任一個股，確認右軸顯示 Candlestick chart rendering（K 線而非折線）、顏色符合台股紅漲綠跌慣例
- [ ] 4.3 確認 Buy/sell event markers preserved — buy/sell 事件圓點仍正確顯示於 K 線圖上
