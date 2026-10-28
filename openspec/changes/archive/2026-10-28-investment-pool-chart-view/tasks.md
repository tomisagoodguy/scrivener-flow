## 1. 選股池清單純函式

- [x] 1.1 在 `src/lib/investment/poolChartUtils.ts` 新增 `PoolChartRow` 與 `buildPoolChartRows(byEtf, etfOrder)`：只保留 `^\d{4}$` 代號、同股合併並收集持有 ETF（依 `etfOrder` 順序）、依 ETF 數遞減再代號遞增排序、`stock_name` 空值轉空字串（需求：Pool chart stock list；決策：純函式 buildPoolChartRows 組清單）。驗證：新增 `src/lib/investment/__tests__/poolChartUtils.test.ts` 覆蓋 spec 三個 Example 與名稱 fallback，`yarn test --testPathPatterns poolChartUtils` 綠燈。

## 2. 按需載入的圖表段

- [x] 2.1 新增 client 元件 `src/components/features/investment/pool/LazyBareKSlide.tsx`：掛載時以 `getStrategySnapshots([code])` 取單檔快照，載入中顯示骨架，成功後渲染 `BareKSlideContent`（無快照時沿用其 `noSnapshotMessage` 文案 `此股票尚未同步裸K資料，將於下次 Pipeline 執行後更新`），reject 時顯示 `圖表載入失敗` 並 `console.error`；卸載後不 setState（需求：On-demand snapshot loading；決策：快照按需載入（client 呼叫 Server Action））。驗證：新增 `src/components/features/investment/pool/__tests__/LazyBareKSlide.test.tsx`（mock Server Action）覆蓋載入中／成功／無快照／失敗四狀態且每次掛載只呼叫一次，`yarn test --testPathPatterns LazyBareKSlide` 綠燈。
- [x] 2.2 新增 client 元件 `src/components/features/investment/pool/PoolChartViewer.tsx`：外層 `pt-6`，以 `ScrollChartViewer` 依 rows 順序渲染 `LazyBareKSlide`，標頭額外文字 `N 支 ETF 持有`、標籤為持有 ETF 代號、`backHref="/investment"`；rows 為空顯示 `目前沒有選股池股票`（需求：Continuous scroll pool charts with holding ETF tags；需求：Pool chart stock list）。[after: 1.1, 2.1] 驗證：`yarn tsc --noEmit` 無新錯，檔案 ≤150 行，4.1 實跑確認標頭與標籤。

## 3. 頁面與入口

- [x] 3.1 新增 Server Component `src/app/investment/pool-chart/page.tsx`（`revalidate = 3600`）：呼叫 `getAllHoldings()` 與 `buildPoolChartRows(byEtf, ETF_CODES)`，標題列含返回 `/investment` 按鈕、資料日期與股票數，下方渲染 `PoolChartViewer`；不在伺服器端查快照（需求：Pool chart page entry and back navigation；決策：獨立路由 /investment/pool-chart 而非 ?view=chart）。[after: 2.2] 驗證：`yarn tsc --noEmit` 無新錯；4.1 實跑頁面可開。
- [x] 3.2 在 `/investment` 頁首（`src/app/investment/page.tsx` 的 `InvestmentPoolPage`）新增 `圖表瀏覽` 連結至 `/investment/pool-chart`，不新增 `searchParams` 讀取、不動既有查詢（需求：Pool chart page entry and back navigation）。[after: 3.1] 驗證：`git diff src/app/investment/page.tsx` 僅含 Link 與其 import；4.1 實跑點擊後導向圖表頁。

## 4. 前端實測

- [x] 4.1 以 headless Playwright 對 `yarn dev` 實跑：`/investment` 點 `圖表瀏覽`（以 `a[href="/investment/pool-chart"]` 定位）→ 首段出現裸K圖與 `N 支 ETF 持有` 標頭 → 捲動至第 10 段後該段完成載入 → 返回按鈕回到 `/investment`；記錄圖表頁 HTML 文件大小確認未嵌入快照（應遠小於 1 MB）（需求：On-demand snapshot loading；需求：Continuous scroll pool charts with holding ETF tags）。[after: 3.2] 驗證：腳本輸出與截圖存於 `.playwright-mcp/`，驗完刪檔。

## 5. Pipeline 同步選股池股

- [x] 5.1 在 `ETF/pipeline/steps/sync_bare_k_step.py` 新增 `_fetch_pool_stocks`（每支 ETF 最新 `data_date` 的 `^[0-9]{4}$` 成分股，依持有 ETF 數遞減、代號遞增），附加於 equity ranking 之後合併去重；`MAX_STOCKS` 改為 400；查詢例外 `logger.error` 回空清單不 raise；更新模組 docstring 的優先序說明（需求：SyncBareKStep includes pool stocks；決策：pipeline 選股池股排在最後、上限 400）。驗證：`ETF/tests/test_sync_bare_k_step.py` 新增測試：合併順序（spec 範例得 [2330, 2454, 3008, 2317]）、`MAX_STOCKS == 400`、選股池查詢失敗回空且其他來源照常；`uv run pytest ETF/tests/test_sync_bare_k_step.py` 綠燈、`uv run ruff check ETF/pipeline/steps/sync_bare_k_step.py` 無錯。
- [x] 5.2 以實際 DB 唯讀執行 `_fetch_pool_stocks` 的 SQL，回報筆數並與 proposal 實測值 218 比對（差異 >10% 需說明原因）（需求：SyncBareKStep includes pool stocks）。[after: 5.1] 驗證：指令輸出貼入 apply 回報。

## 6. 收尾

- [x] 6.1 更新 `ETF/CLAUDE.md` 的 SyncBareKStep 說明與日排程預算表（標註 SyncBareKStep 增加時間為估計值、待首次 CI 確認），並在 `.claude/rules/indexes.md` 路由表加入 `/investment/pool-chart`（決策：pipeline 選股池股排在最後、上限 400）。[after: 5.2] 驗證：派 fresh agent read-back 兩檔，確認描述與實作一致。

## 7. 審查修正（/spectra-review Warning 1、2）

> 變更說明：2.1 已完成的「掛載即載入」行為被「停留才載入」取代（決策：停留 300ms 才載入快照），由 7.1 補償；2.1 的完成紀錄保留不動。

- [x] 7.1 `LazyBareKSlide` 改為停留閘門：以 `IntersectionObserver` 觀察自身容器，連續在視窗內 `DWELL_MS` = 300ms 才呼叫一次 `getStrategySnapshots([code])`，未滿 300ms 離開取消計時，已請求後不再請求；卸載時斷開 observer 並清除計時器；骨架／成功／無快照／失敗文案不變（需求：On-demand snapshot loading；決策：停留 300ms 才載入快照）。驗證：更新 `src/components/features/investment/pool/__tests__/LazyBareKSlide.test.tsx`，以 jest fake timers + mock `IntersectionObserver` 覆蓋 spec「dwell timing」四列範例與原四種狀態，`yarn test --testPathPatterns LazyBareKSlide` 綠燈。
- [x] 7.2 `ScrollChartViewer` 新增可選 prop `showJumpDots`（預設 `true`，保留「超過 3 檔才顯示」規則），`false` 時不渲染跳轉點、子導覽列照常（需求：Pool chart page hides jump dots；決策：ScrollChartViewer 只新增預設不變的可選 prop）。驗證：在 `src/components/features/investment/__tests__/ScrollChartViewer.test.tsx` 新增「4 檔未傳 prop 顯示跳轉點」與「4 檔傳 false 不顯示且上一檔／下一檔仍在」兩個測試，該檔既有測試全數通過。
- [x] 7.3 `PoolChartViewer` 傳 `showJumpDots={false}`（需求：Pool chart page hides jump dots）。[after: 7.2] 驗證：`PoolChartViewer.test.tsx` 新增斷言畫面上沒有 `nav[aria-label="快速跳轉"]`，`yarn test --testPathPatterns PoolChartViewer` 綠燈。
- [x] 7.4 重跑 headless Playwright 實測：除 4.1 的流程外，用子導覽列下一檔或直接 `scrollIntoView` 跳到第 150 段，量測該段在 3 秒內完成載入（不再顯示骨架），並確認頁面無 `nav[aria-label="快速跳轉"]`；輸出直接貼入 apply 回報（需求：On-demand snapshot loading；需求：Pool chart page hides jump dots）。[after: 7.1, 7.3] 驗證：腳本輸出含第 150 段載入耗時（秒）與跳轉點數量 0。
