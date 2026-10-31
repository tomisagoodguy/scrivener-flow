## 1. 資料彙整與查詢

- [x] 1.1 在 `src/lib/investment/strategyTradeUtils.ts` 新增 `StrategyHoldingMarks` 型別與純函式 `buildHoldingMarks(rows)`：把 `strategy_trades` 列依 `stock_id` 彙整成去重升冪的 `signalDates`、`entryDates` 與 `periods`（`entry_date` 為 null 的列不產生區間與「買」日期）（需求：Strategy holding marks on chart；決策：區間聯集在純函式中計算，圖表只吃「日期集合」）。驗證：`yarn test --testPathPatterns strategyTradeUtils` 新增案例綠燈。
- [x] 1.2 [after: 1.1] 新增 Server Action `src/app/actions/getStrategyChartTrades.ts`：`getStrategyChartTrades(stockIds)` 依股票代碼分批（每批 300）、分頁查 `strategy_trades`（`exit_date` 為 null 或 ≥ 今日-400 天），回傳 `Record<stockId, StrategyHoldingMarks>`；查詢錯誤時 throw（決策：新 Server Action 依股票代碼查 strategy_trades）。驗證：`src/app/actions/__tests__/getStrategyChartTrades.test.ts` mock Supabase，斷言分批、彙整結果與錯誤時 throw。

## 2. 圖表繪製

- [x] 2.1 在 `src/components/features/investment/BareKChartPanels.ts` 新增 `buildHoldingTextMarkers(ohlcv, marks)`（「選」amber、「買」rose-600，K 棒上方，略過無 o/c 的日期、同日同文字一次）與 `buildHoldingBackground(ohlcv, periods)`（區間聯集、`end` 為 null 延伸到最新 K 棒）；`createKLinePanel` 新增選填 `holdingMarks`，背景用隱藏價格軸 `holding-bg` 的 HistogramSeries 加在 K 線之前，文字標記與發散箭頭合併排序後只呼叫一次 `createSeriesMarkers`（需求：Holding period background on chart；決策：標記用 K 棒上方文字「選」「買」；決策：持有背景用隱藏價格軸的滿高 HistogramSeries）。驗證：`yarn test --testPathPatterns BareKChartPanels` 新增案例涵蓋 spec 範例表三列與快照外日期略過、不傳 `holdingMarks` 時既有測試不變。
- [x] 2.2 [after: 1.1, 2.1] `BareKChart` 與 `BareKSlideContent` 新增選填 prop `holdingMarks` 往下傳到 `createKLinePanel`，並以穩定字串 key 納入重畫依賴；其他頁面不傳時行為不變。驗證：`yarn tsc --noEmit` 通過（`BareKChart` 目前無專屬測試，畫面行為由 3.2 實跑確認）。

## 3. 頁面串接

- [x] 3.1 [after: 1.2, 2.2] `src/app/investment/strategy/page.tsx` 在圖表視角並行呼叫 `getStrategyChartTrades`（失敗 `console.error` 後以 `{}` 繼續）；`StrategyChartViewer` 新增 prop `holdingMarksByStock`，每個 slide 傳 `holdingMarks` 給 `BareKSlideContent`（需求：Strategy holding marks on chart）。驗證：`StrategyChartViewer.test.tsx` 新增案例斷言 `holdingMarks` 依股票傳到圖表 props、無紀錄的股票為 undefined。
- [x] 3.2 [after: 3.1] 實跑驗證：`yarn dev` 後以 Playwright 開 `/investment/strategy?view=chart`，截圖確認有持有紀錄的股票 K 線主圖出現「選」「買」與淡色背景、發散紅箭頭仍在、K 線價格軸未被壓縮；把指令與觀察結果寫回本任務。另跑 `yarn tsc --noEmit` 與 `yarn eslint` 改動檔。
  - 實測紀錄（2026-10-31）：既有 dev server（port 3000）+ `uv run --with playwright python -I shot2.py`（chromium channel=chrome），定位 `[data-idx]` 找到 1815（idx 10）、2330（idx 18）並截 K 線主圖。1815：右側 10-08 起至最新 K 棒有淡紅背景（fan_breakout 10-08→10-30 ∪ broker_ranked/capital_layer 10-13→持有中），左側 2025-11-11→11-21 亦有背景；2330：多段 fan_breakout / low_vol_alpha 區間皆有背景；「選」（amber）「買」（rose）在 K 棒上方，發散紅箭頭仍在下方，價格軸刻度正常未被壓縮；瀏覽器 console 無 error。觀察：Histogram 背景呈細條紋（design 風險一已記載）。
  - DB 對照：`strategy_trades` 無 `fund_momentum` 紀錄，該日圖表 71 支皆為 fund_momentum 選股，故只有曾被其他策略持有的股票（如 1815、2330）有標記，符合 spec「Stock without trades」。
  - 查詢窗口核對：圖表標頭顯示快照為「近 240 日」（約 350 曆日），`LOOKBACK_DAYS = 400` 足以涵蓋。
  - verify/review 後修正（2026-10-31）：分頁排序補 `strategy_id`（唯一鍵三欄）、新增 `getStrategyChartTradesOrEmpty` 承接頁面降級路徑並測試、`periods` 去重；`yarn test` 6 檔 41 tests 全綠、`yarn tsc --noEmit` 通過。
  - `yarn tsc --noEmit` 通過；`yarn eslint` 11 個改動檔 0 error；相關 8 個測試檔 53 tests 全綠。
