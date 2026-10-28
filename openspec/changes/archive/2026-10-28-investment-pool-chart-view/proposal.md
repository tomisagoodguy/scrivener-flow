## Why

選股池（`/investment`）涵蓋全部主動式 ETF 的成分股，但目前只能看表格與清單，想逐檔看走勢必須一支一支點進裸K頁。策略頁（`/investment/strategy?view=chart`）已有「連續捲動、一次看完全部裸K圖」的圖表視角，使用者希望選股池也能用同樣方式一次瀏覽全部成分股圖表。

實測（2026-10-28 查 DB）：23 支 ETF 最新快照的成分股聯集 388 支，其中台股 4 碼代號 218 支（其餘為海外股票，FinLab 無法計算裸K）；`bare_k_snapshots` 最新一日（2026-10-27）只有 54 支有快照，且同步上限 `MAX_STOCKS = 200`。不擴大同步範圍，圖表視角大多會顯示「尚未同步」。

## What Changes

- 新增選股池圖表頁 `/investment/pool-chart`：連續捲動顯示全部主動式 ETF 台股成分股的裸K六面板圖，依「持有 ETF 數」多到少排序、同數依股票代號遞增；每張圖標頭列出持有的 ETF 代號。
- `/investment` 頁首新增「圖表瀏覽」入口連結，圖表頁提供返回 `/investment` 的按鈕。
- 圖表資料改為**段落在畫面上停留 300ms 才載入**（client 端呼叫既有 Server Action `getStrategySnapshots`；Server Action 在瀏覽器端排隊執行，停留閘門避免跳轉時沿路段落塞滿佇列），不在伺服器端一次序列化全部快照：實測單筆快照文字長度平均約 163 KB（最新 50 筆平均），218 檔一次嵌入約 35 MB，不可行。
- 共用的 `ScrollChartViewer` 新增可選 prop `showJumpDots`（預設 `true`，既有頁面不變），選股池頁關閉右側跳轉點：218 個點約 3480px 高，大半在畫面外無法點擊。
- ETF pipeline `SyncBareKStep` 新增「選股池股」來源（全部 ETF 最新持股的台股 4 碼成分股），排在既有四種來源之後；`MAX_STOCKS` 由 200 提高到 400。

## Non-Goals

- 不篩選選股池股票（使用者確認要全部成分股），也不提供圖表頁內的篩選列。
- 不顯示海外成分股（非 4 碼台股代號）：FinLab 無其裸K資料。
- 不在 `/investment` 本頁加 `?view=chart`：該頁 `revalidate = 3600` 且預設視角有 10 個並行查詢，讀取 `searchParams` 會讓整頁變成動態渲染、失去快取；改用獨立路由。
- 不修改 `getStrategySnapshots`、`BareKSlideContent` 的既有行為；`ScrollChartViewer` 只新增預設不變的可選 prop。
- 不為本頁另寫輕量持股查詢（`getAllHoldings()` 會多跑 4 個本頁用不到的查詢，頁面每小時最多重建一次，列為已知取捨）。

## Capabilities

### New Capabilities

- `investment-pool-chart-view`: 選股池全部成分股的連續捲動裸K圖表頁（入口、排序、ETF 標籤、按需載入、返回），以及 pipeline 將選股池股納入裸K同步。

### Modified Capabilities

(none)

## Impact

- 新增：src/app/investment/pool-chart/page.tsx、src/components/features/investment/pool/PoolChartViewer.tsx、src/components/features/investment/pool/LazyBareKSlide.tsx、src/lib/investment/poolChartUtils.ts 與其單元測試
- 修改：src/app/investment/page.tsx（新增入口連結）、src/components/features/investment/ScrollChartViewer.tsx（新增 `showJumpDots` prop）與其測試
- 修改：ETF/pipeline/steps/sync_bare_k_step.py（新增 `_fetch_pool_stocks`、`MAX_STOCKS` 200 → 400）與 ETF/tests 對應測試
- 執行時間：每日 pipeline 的 SyncBareKStep 估計由近三次實測的 49–132 檔（2026-10-21/22/27 各日快照筆數）增為最多約 350 檔（132 + 218，未扣重疊，估計值，低於新上限 400），以 compute_snapshot 約 5.2 秒/檔最多約 +19 分鐘（218 × 5.2 秒）；`etf_daily.yml` 主 job `timeout-minutes: 150`，日排程合計預算由約 33 分增至約 52 分。實際值以上線後第一次 CI log 的「BareK sync done」行與步驟耗時確認。
