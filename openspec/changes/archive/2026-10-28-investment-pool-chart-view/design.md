## Context

- `/investment`（`src/app/investment/page.tsx`）是 async Server Component，`revalidate = 3600`，以 `getAllHoldings()` 取 `{ byEtf, latestDate }`、`buildUnionHoldings(byEtf)` 合併聯集，再並行 10 個查詢組出多分頁面板；頁面不讀 `searchParams`。`buildUnionHoldings` 只保留權重最大的那筆持股，不帶「哪些 ETF 持有」。
- 既有圖表視角（策略、籌碼排行、同步加碼）皆用 `ScrollChartViewer` + `BareKSlideContent`，在伺服器端以 `getStrategySnapshots(ids)` 一次抓完全部快照並序列化。範本 `EquityChartViewer` 約 65 行。
- `ScrollChartViewer` 以 IntersectionObserver 只渲染已到訪的 ±1 張，已渲染者不卸載。
- 實測（2026-10-28）：成分股聯集 388 支，台股 4 碼 218 支；`bare_k_snapshots` 單筆文字長度平均約 163 KB（最新 50 筆）；近三日快照筆數 49–132；`SyncBareKStep.MAX_STOCKS = 200`。
- `/api/investment/bare-k/[code]` 需登入（未登入回 401），`getStrategySnapshots` 是 Server Action、走 `server.ts` client，策略頁未登入可用。

## Goals / Non-Goals

**Goals:**

- 一頁連續捲動看完全部主動式 ETF 台股成分股的裸K圖，依持有 ETF 數排序並標示持有 ETF。
- 頁面初始 payload 不隨股票數線性膨脹到數十 MB。
- pipeline 每日為這些股票產生裸K快照。

**Non-Goals:**

- 圖表頁內篩選、排序切換、搜尋。
- 海外成分股圖表。
- 變更 `/investment` 既有分頁與查詢、`BareKSlideContent`／`getStrategySnapshots` 的行為；`ScrollChartViewer` 只新增預設不變的可選 prop `showJumpDots`，既有頁面行為不變。

## Decisions

### 獨立路由 /investment/pool-chart 而非 ?view=chart

在 `/investment` 讀 `searchParams` 會讓整頁轉為動態渲染，預設視角的 10 個查詢失去 `revalidate = 3600` 快取。獨立路由只呼叫 `getAllHoldings()`（其內部除持股外還會查產業、月營收、近 2 日股價與 310 天股價歷史，本頁用不到；見 Risks），主頁只多一個 `Link`。替代方案「`?view=chart` 同頁」被否決，理由同上。

### 快照按需載入（client 呼叫 Server Action）

每段圖表掛載時才呼叫 `getStrategySnapshots([code])`。218 × 約 163 KB ≈ 35 MB（估計，以平均文字長度乘檔數），伺服器端一次嵌入不可行。替代方案：(a) 伺服器端分批抓全量——payload 問題不變；(b) 走 `/api/investment/bare-k/[code]`——需登入，未登入訪客會 401；(c) 新建 API route——違反「資料讀取優先 Server Action、不新建 route.ts」慣例。沿用既有 Server Action 不改其行為。

### 停留 300ms 才載入快照

**Supersedes**: investment-pool-chart-view / 快照按需載入（client 呼叫 Server Action）（僅取代「掛載時即呼叫」的觸發時機；Server Action 與不嵌入快照的部分保留）

Next.js 瀏覽器端的 Server Action 呼叫是排隊、一次一個執行（dev log 實測每次約 170–190ms）。`ScrollChartViewer` 的已渲染集合只增不減，跳轉時沿路經過的段落全部掛載；若掛載即請求，跳到第 150 段要排在上百個請求後（估計 150 × 0.18s ≈ 27 秒，以 7.4 實測確認改善後耗時）。改為每段以自己的 `IntersectionObserver` 判斷「連續在視窗內 `DWELL_MS` = 300ms」才發唯一一次請求；平滑捲動經過的段落停留不足而不發。替代方案：(a) 批次合併多檔代號一次請求——仍會為經過的段落抓資料，且要新增協調 hook；(b) 改 GET API route 讓瀏覽器並行——既有 route 需登入、新增 route 違反慣例；(c) 只為 active 段請求——相鄰段無預載，捲動時每段都看到骨架。300ms 為經驗值，以 7.4 實測（跳轉後目的地 3 秒內載入）驗證。

### ScrollChartViewer 只新增預設不變的可選 prop

218 個跳轉點（8px 點 + 8px 間距，約 3480px）放在 fixed 置中欄，大半在畫面外無法點擊。新增 `showJumpDots?: boolean`（預設 `true`，保留「超過 3 檔才顯示」），選股池頁傳 `false`，導覽改靠子導覽列的上一檔／下一檔與 `n / 總數`。替代方案「點數過多時自動隱藏」會改變既有頁面（策略頁可能超過門檻）的行為，被否決。

### 純函式 buildPoolChartRows 組清單

在 `src/lib/investment/poolChartUtils.ts` 由 `byEtf` 組出 `PoolChartRow[]`（篩 4 碼、合併、排序），可單元測試；不修改 `buildUnionHoldings`（其他頁依賴其「取最大權重」語義）。ETF 走訪順序依 `ETF_CODES`（registry 順序），使 `etfs` 陣列順序穩定。

### pipeline 選股池股排在最後、上限 400

選股池股附加在既有四種來源之後，維持既有優先序（上限內全部同步時順序不影響結果，超限時最先截斷的是選股池股）。上限 400 高於估計最大量約 350（132 + 218，未扣重疊）。SQL 取每支 ETF 各自最新 `data_date`、`stock_code ~ '^[0-9]{4}$'`；前端 `getAllHoldings()` 則用全表最新 `data_date` 且只走 `ETF_CODES`，因此 pipeline 同步的是前端顯示清單的超集合（多同步不缺圖）。2026-10-28 實測兩者皆為 218 檔。

## Implementation Contract

**行為**

- `/investment` 頁首出現 `圖表瀏覽` 連結 → `/investment/pool-chart`。
- `/investment/pool-chart`：標題列含返回 `/investment` 的按鈕、資料日期與股票數；下方連續捲動裸K圖，每段標頭 `N 支 ETF 持有`，標籤為持有 ETF 代號，右側無跳轉點；段落在視窗內停留 300ms 才載入該檔快照，載入中顯示骨架，無快照／失敗顯示 spec 規定文案。
- pipeline 同步清單多出選股池股，`MAX_STOCKS = 400`。

**介面 / 資料形狀**

- `interface PoolChartRow { code: string; name: string; etfs: string[] }`
- `buildPoolChartRows(byEtf: Record<string, Holding[]>, etfOrder: readonly string[]): PoolChartRow[]`
- `PoolChartViewer({ rows }: { rows: PoolChartRow[] })`（client，`'use client'`）
- `LazyBareKSlide({ code, name, strategies }: { code: string; name: string; strategies: string[] })`（client）：以 `IntersectionObserver` 觀察自身容器，連續在視窗內 `DWELL_MS`（300）毫秒後呼叫一次 `getStrategySnapshots([code])`，取 `map.get(code) ?? null`；狀態 `loading | ready | error`；卸載時斷開 observer、清除計時器。
- `ScrollChartViewer` 新增 `showJumpDots?: boolean`（預設 `true`）。
- `SyncBareKStep._fetch_pool_stocks(ctx, services) -> list[str]`

**失敗模式**

- Server Action reject → 該段顯示 `圖表載入失敗` + `console.error`，其他段不受影響。
- `getAllHoldings()` 無資料 → 顯示 `目前沒有選股池股票`。
- pipeline 選股池查詢例外 → `logger.error`，回空清單，不 raise（輔助步驟規則）。

**驗收**

- `yarn test --testPathPatterns poolChartUtils` 覆蓋 spec 的三個 Example。
- `yarn test --testPathPatterns LazyBareKSlide` 覆蓋載入中／成功／無快照／失敗四狀態與 dwell timing 四列範例。
- `yarn test --testPathPatterns ScrollChartViewer` 覆蓋 `showJumpDots` 預設顯示與 `false` 隱藏。
- 實跑跳到第 150 段，該段 3 秒內載入、頁面無跳轉點。
- `uv run pytest ETF/tests/test_sync_bare_k_step.py` 覆蓋合併順序、`MAX_STOCKS == 400`、選股池查詢失敗回空。
- `yarn tsc --noEmit`、`yarn eslint <改動檔>`、`uv run ruff check ETF/pipeline/steps/sync_bare_k_step.py` 無新錯。
- 實跑 `yarn dev` 開 `/investment/pool-chart`（headless Playwright）：首段圖表出現、捲動後後段載入、網路面板未見一次性大 payload。

**範圍**

- 範圍內：上述新檔、`/investment` 加一個 Link、`ScrollChartViewer` 新增 `showJumpDots` prop、`sync_bare_k_step.py` 與其測試。
- 範圍外：其他圖表頁、`getStrategySnapshots` 批次化、DB schema、GitHub Actions workflow 設定。

## Risks / Trade-offs

- [pipeline 執行時間增加最多約 19 分（估計：218 × 5.2 秒）] → 主 job timeout 150 分仍有餘裕；以上線後首次 CI 的 SyncBareKStep 耗時確認，超過 30 分再評估改為只同步 ≥2 支 ETF 持有者。
- [使用者捲完全部 218 段時瀏覽器累積約 35 MB 快照資料（估計）] → `ScrollChartViewer` 不卸載已渲染段，屬既有行為；本變更不處理，實跑時觀察記憶體，必要時另開變更。
- [Server Action 在瀏覽器端排隊執行，請求多時目的地要等前面全部完成] → 停留 300ms 閘門讓捲動經過的段落不發請求；已送出的請求無法中止，屬已知限制。
- [`getAllHoldings()` 為本頁多跑 4 個用不到的查詢（產業、月營收、近 2 日股價、310 天股價歷史）] → 已知取捨：頁面 `revalidate = 3600`，每小時最多重建一次，影響有限；不另寫輕量查詢以免複製「全表最新日期 + ETF_CODES」邏輯。若重建時間成為問題再另開變更。
- [新上限 400 仍可能被未來聯集成長超過] → 超限時截斷的是排序最後的選股池股，`logger.warning` 已記錄總數。
