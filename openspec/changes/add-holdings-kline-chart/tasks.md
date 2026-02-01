# Tasks: 00981A 成分股動能 K 線圖

## 第一階段：後端數據準備

- [ ] 1. 在 Supabase 建立 `stock_prices_daily` 資料表 (包含 RLS 設定)。
- [ ] 2. 在 `FinlabService` 中實作 `sync_stock_prices(stock_list)` 方法。
- [ ] 3. 修改 `ETF/main.py`，串接同步邏輯，確保每日跑 tracker 時也會更新個股 K 線數據。
- [ ] 4. 驗證數據同步 (手動執行 `main.py` 並查看資料庫)。

## 第二階段：API 與基礎組件

- [ ] 5. 安裝前端依賴 `npm install lightweight-charts`。
- [ ] 6. 撰寫 Next.js API Route `src/app/api/investment/prices/route.ts`。
- [ ] 7. 建立 `PriceChartModal` 技術原型組件 (基礎 K 線渲染)。

## 第三階段：前端 UI 整合與優化

- [ ] 8. 修改 `HoldingsTable.tsx`，加入點擊列開啟 Modal 的交互邏輯。
- [ ] 9. 優化圖表樣式 (深色模式適配、格線調整、成交量顏色)。
- [ ] 10. 增加 Loading 狀態與錯誤處理 (若無數據時的顯示)。

## 驗證指標

- 點選個股後，圖表在 1 秒內載入完成。
- K 線數據與成交量與 Finlab 官網顯示一致。
- 支援手機端縮放操作。
