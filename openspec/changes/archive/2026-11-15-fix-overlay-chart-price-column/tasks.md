## 1. 股價線改用 data_date 並外露錯誤

- [x] 1.1 `HoldingsPriceOverlayChart` 的股價查詢改以 `data_date` 選取、篩選起始日與排序，回傳列對應成 `{ date: data_date, close }`；股價查詢回錯誤時圖表區顯示含錯誤訊息的文字，不畫出缺股價線的圖（需求：Overlay chart price line reads stock_prices_daily by data_date）。驗證：在 `src/components/features/investment/__tests__/WeightHistoryLoadStates.test.tsx` 新增測試——(a) 股價 mock 只在查詢欄位為 `data_date` 時回 spec Example 的兩列（2026-11-12／1450、2026-11-13／1465），斷言 `select` 收到含 `data_date` 的欄位字串、`gte` 與 `order` 的欄位為 `data_date`；(b) 股價查詢回 `{ error: { message: 'column stock_prices_daily.date does not exist' } }` 時畫面出現該訊息。兩個測試先在現行實作確認失敗再修改；`yarn test --testPathPatterns WeightHistoryLoadStates` 與 `yarn tsc --noEmit` 通過，`yarn eslint src/components/features/investment/HoldingsPriceOverlayChart.tsx` 無新增錯誤（現有 1 筆 `react-hooks/set-state-in-effect` 為既有）。
  - 實測（2026-11-15）：新增 2 個測試在修改前失敗（股價點 `date` 為 undefined，路徑畫成 `M 600 120 L 600 0`；股價錯誤被吞掉），修改後 `yarn test --testPathPatterns WeightHistoryLoadStates` 9/9 通過，價格線路徑為 `M 0 120 L 600 0`；查詢欄位 select `data_date, close`、`gte`／`order` 皆為 `data_date`。錯誤訊息改由來源自帶前綴（「比重歷史載入失敗：」／「股價載入失敗：」），畫面直接顯示。`yarn tsc --noEmit` 通過；ESLint 1 筆 `react-hooks/set-state-in-effect` 為既有。

## 2. 實測

- [x] 2.1 [after: 1.1] 在 dev server 開 `/investment/stock/2330`，展開「ETF 持倉分析」並切到 90D，確認「比重走勢 × 股價」出現股價虛線，且瀏覽器對 `stock_prices_daily` 的請求回 200、列數等於 SQL `SELECT count(*) FROM stock_prices_daily WHERE stock_code='2330' AND data_date >= current_date - 90`（需求：Overlay chart price line reads stock_prices_daily by data_date）。驗證：Playwright 腳本攔截該請求並截圖，請求狀態、列數、SQL 數字與截圖結論記到本任務下方。
  - 實測（2026-11-15，dev server）：`/investment/stock/2330` 點 90D，瀏覽器請求 `select=data_date,close&stock_code=eq.2330&data_date=gte.2026-08-17&order=data_date.asc` 回 200、60 列、最新 2026-11-13；SQL `count(*)` = 60、最新 2026-11-13，一致。畫面股價虛線 1 條、60 個點，無錯誤訊息；截圖確認灰色虛線與 ETF 比重線同時顯示（修正前股價線為空）。
  - 環境備註：此次 dev server 因 `.next/dev` 快取記錄了小寫 `c:` 路徑，tailwindcss 從專案上一層解析失敗且大量產生 postcss 子行程；清除 `.next/dev`（gitignored 建置快取）並從 `C:\` 路徑啟動後恢復。
