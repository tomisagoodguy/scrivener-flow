## 1. Pipeline：SyncBareKStep 額外納入策略股（Pipeline：SyncBareKStep 額外納入策略股）

- [x] 1.1 在 `ETF/pipeline/steps/sync_bare_k_step.py` 新增 `_fetch_strategy_stocks(ctx, services)` 私有方法，查詢 `strategy_signals` 最新 `date` 的 `is_selected = true` 股票代碼，失敗時 log error 並回傳空列表（不 raise）
- [x] 1.2 在 `execute()` 中呼叫 `_fetch_strategy_stocks()`，將結果 append 到 watch_list 股票後面（de-dup），確保 SyncBareKStep includes strategy stocks 且 watch_list 排前
- [x] 1.3 驗證 MAX_STOCKS 截斷邏輯已覆蓋合併後的總數，確認 MAX_STOCKS limit exceeded 場景正確運作

## 2. 前端：getStrategySnapshots Server Action

- [x] 2.1 在 `src/app/actions/` 新增 `getStrategySnapshots.ts`，接收 `stockIds: string[]`，查詢 `bare_k_snapshots` 最新一筆（`order by date desc limit 1 per stock_id`），回傳 `Map<string, BareKSnapshot | null>`
- [x] 2.2 確認回傳型別使用 `BareKSnapshot`（來自 `src/app/api/investment/bare-k/[code]/route.ts`），避免重複定義型別

## 3. 前端：StrategyChartViewer 薄包裝 BareKScrollViewer

- [x] 3.1 建立 `src/components/features/strategy/StrategyChartViewer.tsx`（Client Component，StrategyChartViewer 薄包裝 BareKScrollViewer），接收 `stocks: StrategyMonitorStock[]` 和 `snapshots: Map<string, BareKSnapshot | null>`，轉換為 `StockSlide[]` 傳入 `BareKScrollViewer`，`isOwner` 固定為 `false`
- [x] 3.2 實作 Back navigation from chart view：back 連結改為 `href="/investment/strategy"`（而非 `/investment/bare-k`）；需判斷是否需要 fork `BareKScrollViewer` 或透過 prop 傳入 backHref
- [x] 3.3 確認 Strategy stock name display in chart header：從 `stocks` 取 `name`，組成 `StockSlide` 的 `name` 欄位
- [x] 3.4 確認 Stocks without snapshot data show placeholder：`BareKScrollViewer` 已有佔位邏輯，確認佔位文案是否需客製化，若需要則覆寫 `StrategyChartViewer` 的佔位 slot

## 4. 前端：策略頁整合圖表視角

- [x] 4.1 在 `src/app/investment/strategy/page.tsx` 的 view toggle 新增「圖表」選項（前端圖表視角新增第三個 toggle，`href="/investment/strategy?view=chart"`），實作 Chart view toggle on strategy page；高亮邏輯與現有 `isMonitor` 模式相同
- [x] 4.2 在 `page.tsx` 的 `isChart` 分支中，呼叫 `getStrategySnapshots(stockIds)` 取得快照 Map，傳入 `StrategyChartViewer`
- [x] 4.3 確認 No strategy stock data available 場景：stocks 為空時顯示「本日無策略選股資料」

## 5. 驗證

- [x] 5.1 本地執行 `yarn dev`，前往 `/investment/strategy?view=chart`，確認 toggle 顯示正確，有快照的股票渲染圖表，無快照顯示佔位
- [x] 5.2 確認 `BareKScrollViewer` 的 Continuous scroll chart viewer for strategy stocks（導覽點、 scroll sync）在策略頁正常運作
- [x] 5.3 確認 `yarn build` 無 TypeScript 型別錯誤
