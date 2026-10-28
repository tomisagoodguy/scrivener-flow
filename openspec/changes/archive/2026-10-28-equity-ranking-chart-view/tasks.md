## 1. Pipeline：裸K同步名單納入籌碼排行股

- [x] 1.1 [P] 先寫測試：在 ETF/tests/test_sync_bare_k_step.py 新增四個情境——籌碼股排在同步加碼股之後且與前面去重（`['2330','2454','3017','6669','3661']`）、前面已有 195 支時只補進前 5 支籌碼股、籌碼查詢拋例外時 log error 不 raise 且其他名單照常同步、`equity_distribution_stats` 無資料時回傳空清單；驗證：`uv run pytest ETF/tests/test_sync_bare_k_step.py` 新測試為紅燈（尚未實作）
- [x] 1.2 在 `SyncBareKStep` 新增 `_fetch_equity_ranking_stocks()` 與常數 `EQUITY_DOUBLE_LIMIT = 10`、`EQUITY_LIST_LIMIT = 30`（註解指向前端 `EQUITY_CHART_LIST_LIMIT`）：以獨立 `MAX(snapshot_date)` 子查詢取全局最新日，依 spec 條件產出雙訊號前 10 → 主力買進前 30 → 散戶減少前 30（同值以 `stock_code` 遞增），去重後回傳；例外時 `logger.error` 並回傳 `[]`；驗證：1.1 的單元測試轉綠（需求：SyncBareKStep includes equity ranking stocks；決策 4：Pipeline 只同步「預設視角」排行，直接用預計算欄位）
- [x] 1.3 把 `execute()` 的合併順序改為自選股 → 策略股 → 同步加碼股 → 籌碼排行股，並同步更新檔頭 docstring 與超出 `MAX_STOCKS` 的 warning 文字；驗證：`uv run pytest ETF/tests/test_sync_bare_k_step.py` 全綠、`uv run ruff check ETF/pipeline/steps/sync_bare_k_step.py` 無錯誤（決策 5：籌碼股排在同步名單最後）
- [x] 1.4 在正式 DB 以唯讀 SQL 執行 1.2 的查詢，確認回傳筆數 ≤ 70、前 10 筆與 `/investment/equity` 預設視角的雙訊號清單一致；驗證：記錄查詢結果與頁面比對

## 2. 前端純函式：清單選取與標題脈絡

- [x] 2.1 [P] 先寫測試 src/lib/investment/__tests__/equityChartUtils.test.ts：`parseEquityChartList` 對 `undefined`、`'foo'` 回傳 `'double'`，對三個合法值原樣回傳；`selectEquityChartRows` 依 spec「rows selected per list」表格回傳正確列與順序（big 218 列取前 30、retail 12 列全取）；`formatEquityHeader` 依 spec「header context formatting」表格五列逐一斷言；驗證：`yarn test --testPathPatterns equityChartUtils` 為紅燈
- [x] 2.2 實作 src/lib/investment/equityChartUtils.ts：匯出 `EquityChartList` 型別、`EQUITY_CHART_LIST_LIMIT = 30`（註解指向 Python `EQUITY_LIST_LIMIT`）、`parseEquityChartList`、`selectEquityChartRows`、`formatEquityHeader`（級距欄位對應 tier、正數帶 `+`、兩位小數、null 部分連同分隔符省略）；驗證：`yarn test --testPathPatterns equityChartUtils` 全綠（需求：Chip context in chart section header；決策 2：圖表清單每份上限 30 檔（`EQUITY_CHART_LIST_LIMIT = 30`），雙訊號本身 ≤10；決策 3：圖表清單順序完全沿用目前排行結果；決策 6：標題脈絡與標籤）

## 3. 前端元件：視角切換與圖表檢視器

- [x] 3.1 `TierNav`、`WeekNav` 新增可選 prop `extraParams: Record<string, string>`，組 href 時一併帶入；未傳時產生的 href 與現行完全相同；驗證：新增或擴充元件測試斷言傳入 `{ view: 'chart', list: 'retail' }` 時「1000張+」連結含 `view=chart&list=retail&tier=1000`，未傳時連結不變
- [x] 3.2 [P] 新增 src/components/features/investment/equity/EquityViewNav.tsx（≤150 行）：渲染「排行 / 圖表」切換（帶非預設 `tier`、`weeks`），圖表視角時再渲染「雙訊號 / 主力買進 / 散戶減少（N）」清單連結並高亮目前清單；驗證：元件測試斷言 `/investment/equity?tier=400&weeks=2` 下「圖表」連結含 `view=chart&tier=400&weeks=2`，`list=foo` 時高亮「雙訊號」（需求：View toggle on equity ranking page；需求：Chart list selection；決策 7：視角切換元件獨立成 `EquityViewNav`）
- [x] 3.3 [P] 先寫測試 src/components/features/investment/equity/__tests__/EquityChartViewer.test.tsx：有快照的股票渲染圖表且標籤為 `etfMap` 的 ETF 代號、無快照時顯示「此股票尚未同步裸K資料，將於下次 Pipeline 執行後更新」、空清單顯示「此清單目前沒有股票」且不渲染 `ScrollChartViewer`、標題附 `formatEquityHeader` 字串、返回連結為傳入的 `backHref`；驗證：`yarn test --testPathPatterns EquityChartViewer` 為紅燈
- [x] 3.4 實作 src/components/features/investment/equity/EquityChartViewer.tsx（Client Component，≤150 行）：把 `EquityRow[]` 轉成 slide，交給 `ScrollChartViewer`（`key` 用 `listKey`、`initialIndex=0`、`backHref` 由 props 傳入、不同步網址），`renderSlide` 用 `BareKSlideContent`，`renderHeaderExtra` 用 `formatEquityHeader`；驗證：3.3 測試轉綠（需求：Scrollable bare-K charts for equity ranking stocks）

## 4. 頁面整合與驗證

- [x] 4.1 修改 src/app/investment/equity/page.tsx：解析 `view` 與 `list`；表格視角維持原內容並多渲染 `EquityViewNav`、不呼叫 `getStrategySnapshots`；圖表視角渲染 `EquityViewNav` 與帶 `extraParams` 的 `TierNav`/`WeekNav`，用 `selectEquityChartRows` 取列、只對這些股票呼叫 `getStrategySnapshots`，`!data`/`insufficientData` 沿用既有空狀態且不查快照；`backHref` 為帶非預設 `tier`/`weeks` 的 `/investment/equity`；驗證：`yarn tsc --noEmit` 無錯、`yarn eslint` 改動檔無新錯（決策 1：清單切換用 URL 參數 `list`，不用 Client state）
- [x] 4.2 本地實跑（`yarn dev` + playwright-skill 腳本，`/investment/*` 未登入可存取）：`/investment/equity` 表格視角與改動前一致；`?view=chart&list=big` 可捲動且最多 30 檔；切「散戶減少」回到第 1 檔；圖表視角點「1000張+」仍在圖表視角；返回鈕回到表格視角；截圖存 `.playwright-mcp/` 並在驗完後刪除；驗證：截圖與檢查結果紀錄
- [x] 4.3 最終回歸：`yarn test --testPathPatterns "equity|StrategyChartViewer|ScrollChartViewer"`、`uv run pytest ETF/tests/test_sync_bare_k_step.py`、`yarn tsc --noEmit` 全部通過；驗證：貼出三個指令的輸出摘要
