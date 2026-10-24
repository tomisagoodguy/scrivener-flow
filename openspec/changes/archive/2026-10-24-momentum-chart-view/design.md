## Context

同步加碼頁（/investment/momentum）是 Server Component，呼叫 getWindowMomentum(windowDays, minEtfCount)，取得過去 N 個交易日內被 ≥ M 家主動 ETF 淨加碼的個股，以 MomentumCard 卡片網格與 MiniKChart 迷你 K 線呈現。窗口交易日取自 market_breadth_daily 最近 N 筆。

策略選股中心的 `?view=chart` 已有完整的捲動看盤：StrategyChartViewer 把股票轉成 slide，交給 ScrollChartViewer（泛型 slide、renderSlide、renderHeaderExtra、backHref）；每格由 BareKSlideContent 畫六面板（支援 markerDates），快照由 getStrategySnapshots 依股票逐支查 bare_k_snapshots 最新一筆。getStrategySnapshots 只吃股票代號，與策略無關。

bare_k_snapshots 由 ETF Pipeline 的 SyncBareKStep 每日計算，名單為 watch_list + strategy_signals 最新日入選股，截斷到 MAX_STOCKS = 50。2026-10-22 實測：watch_list 0 支、策略股 83 支、預設窗口（5 日、≥ 2 家）同步加碼股 69 支，與策略股重疊 20 支，聯集 132 支。現行上限已截掉約 33 支策略股。

Pipeline 順序中，SyncBareKStep 在 SyncAdlStep 之前執行，因此 SyncBareKStep 執行當下 market_breadth_daily 還沒有當日資料；etf_diff_logs 的當日資料則已由 SaveSnapshotStep 寫入。

## Goals / Non-Goals

**Goals:**

- 同步加碼頁提供「卡片 / 圖表」兩種視角，圖表視角與策略頁看盤體驗一致。
- 圖表上看得到「哪幾家 ETF 加碼多少張」、「哪幾天加碼」、「幾家同步、權重變化多少」。
- 預設篩選下的同步加碼股每天都有裸K快照。

**Non-Goals:**

- 不為非預設篩選組合（3 / 10 / 14 天、≥ 3 / ≥ 5 家）另外同步快照；這些組合中沒有快照的股票顯示佔位卡。
- 不在前端即時計算裸K六面板，也不提供以 stock_prices_daily 畫的簡化版 K 線作為備援（已評估並否決，見「K 線資料缺口只補 pipeline 不做前端備援」）。
- 不新增圖表視角的篩選列（策略頁的 StrategyChartFilterBar 與策略標籤綁定，不適用）；篩選維持沿用 MomentumFilter。
- 不重新命名 getStrategySnapshots。
- 不改動卡片視角既有的版面與 MiniKChart。

## Decisions

### 以 view 查詢參數切換卡片與圖表視角

新增 MomentumViewToggle（Server Component，用 Link），產生「卡片」與「圖表」兩個連結。連結保留目前的 `window` 與 `min_count`，卡片連結移除 `view`，圖表連結設 `view=chart`。MomentumFilter 用 router.push 時會把整份 searchParams 帶著走，所以切換篩選不會跳出圖表視角。

替代方案：用 client state 切換。否決原因：重新整理或分享連結時視角會遺失，也與策略頁的 URL 驅動慣例不一致。

### 沿用 ScrollChartViewer 與 BareKSlideContent 組成 MomentumChartViewer

新增 Client Component MomentumChartViewer，把 WindowMomentumStock 陣列與快照 Map 轉成 slide，交給 ScrollChartViewer。每格 renderSlide 使用 BareKSlideContent，renderHeaderExtra 顯示同步摘要，backHref 指回目前篩選的卡片視角。快照由頁面在 `view=chart` 時呼叫 getStrategySnapshots(股票代號) 取得；卡片視角不查快照。

替代方案：直接複用 StrategyChartViewer。否決原因：它的 props 與篩選列綁定 StrategyMonitorStock 與策略 id，硬套需要偽造策略資料。

### 加碼 ETF 標籤與同步摘要的格式化放在純函式

windowMomentumUtils 新增三個純函式，供 MomentumChartViewer 使用並可單元測試：

- formatMomentumEtfTags(etfDetails)：回傳每家加碼 ETF 一個標籤字串，格式為「<ETF代號> +<張數>張」。張數 = Math.round(netShares / 1000)，並加千分位；順序沿用 etfDetails 既有排序（依權重增幅遞減）。
- formatMomentumHeader(etfCount, totalWeightChange)：回傳「<N> 家同步・權重 <±x.xx>pp」，權重取兩位小數且一律帶正負號。
- computeAccumulationDates(sharesByDate)：回傳合計 diff_shares > 0 的日期，依日期升冪排序。

標籤透過 BareKSlideContent 的 strategies 參數顯示（該參數本質上是一組標籤字串）。

### getWindowMomentum 回傳 accumulationDates 作為加碼日標記

WindowMomentumStock 新增 `accumulationDates: string[]`，以 computeAccumulationDates(agg.sharesByDate) 計算。sharesByDate 只累計淨加碼 ETF 的日分布，因此標記日代表「有加碼的 ETF 在當日合計為買超」。圖表視角把它傳給 BareKSlideContent 的 markerDates。因為回傳形狀改變，快取鍵由 window-momentum-v1 升為 window-momentum-v2，避免舊快取缺欄位。

### SyncBareKStep 納入同步加碼股並調高 MAX_STOCKS

SyncBareKStep 新增 `_fetch_momentum_stocks`，在策略股之後合併，順序為自選股 → 策略股 → 同步加碼股，並去重。MAX_STOCKS 由 50 調高為 200（目前聯集 132 支，保留約 50% 餘裕）。截斷仍保留前段優先序。

新增模組常數 MOMENTUM_WINDOW_DAYS = 5、MOMENTUM_MIN_ETF_COUNT = 2，必須與 momentum/page.tsx 的 DEFAULT_WINDOW、DEFAULT_MIN_COUNT 一致，兩邊都要加註解互相指向。

查詢與判定規則與前端 aggregateWindowMomentum 相同：同一 (stock_code, etf_code) 在窗口內 SUM(diff_shares) > 0 才計 1 家，家數 ≥ 2 入選，依家數遞減、淨加碼股數合計遞減排序。

### 窗口交易日以 ctx.date_str 加上 market_breadth_daily 前 N-1 日推算

SyncBareKStep 執行時，當日資料還沒寫進 market_breadth_daily，所以窗口定義為：ctx.date_str，加上 market_breadth_daily 中 date < ctx.date_str 的最近 4 筆。窗口起日取這 5 個日期中最早的一天，迄日為 ctx.date_str。等 SyncAdlStep 寫入當日資料後，結果會與前端 getWindowMomentum 預設窗口一致。

日期推算抽成純函式 `_momentum_window_start(prev_dates, today)`，以便單元測試；`prev_dates` 不足 4 筆時，以現有最早日期為起日。

### K 線資料缺口只補 pipeline 不做前端備援

只用 pipeline 預先計算快照，前端維持既有佔位卡。理由：六面板需要 FinLab 全市場資料，前端無法即時算；用 stock_prices_daily 做簡化備援會讓同一個視角出現兩種圖，維護兩套程式。

## Implementation Contract

**Behavior**

- 進入 `/investment/momentum`，標題卡片內的篩選列旁會出現「卡片 / 圖表」切換，預設為卡片，目前所在的視角有高亮。
- 進入 `/investment/momentum?view=chart&window=5&min_count=2`，會以垂直捲動逐支顯示同步加碼股的裸K六面板，順序與卡片視角相同（家數遞減、加碼股數遞減）。
- 每格標籤顯示加碼 ETF 與張數，例如「00981A +320張」；標題列顯示「3 家同步・權重 +1.25pp」；K 線上標記 accumulationDates 的日期。
- 圖表視角的返回連結指向 `/investment/momentum?window=<目前值>&min_count=<目前值>`（卡片視角）。
- 同步加碼股為 0 支時，圖表視角與卡片視角顯示相同的空狀態訊息。
- 沒有快照的股票顯示佔位卡「此股票尚未同步裸K資料，將於今日 Pipeline 執行後更新」。
- Pipeline 每日同步的裸K名單包含預設窗口的同步加碼股，上限 200 支。

**Interface / data shape**

- `WindowMomentumStock.accumulationDates: string[]`：YYYY-MM-DD，升冪。
- `formatMomentumEtfTags(etfDetails: EtfAccumulationDetail[]): string[]`
- `formatMomentumHeader(etfCount: number, totalWeightChange: number): string`
- `computeAccumulationDates(sharesByDate: Record<string, number>): string[]`
- `MomentumChartViewer` props：`stocks: WindowMomentumStock[]`、`snapshots: Map<string, BareKSnapshot | null>`、`backHref: string`。
- `MomentumViewToggle` props：`currentView: 'cards' | 'chart'`、`windowDays: number`、`minEtfCount: number`。
- Python：`SyncBareKStep._fetch_momentum_stocks(ctx, services) -> list[str]`；`_momentum_window_start(prev_dates: list[str], today: str) -> str`；常數 `MAX_STOCKS = 200`、`MOMENTUM_WINDOW_DAYS = 5`、`MOMENTUM_MIN_ETF_COUNT = 2`。

**Failure modes**

- `_fetch_momentum_stocks` 的 SQL 失敗時，log error 並回傳空列表，不 raise（SyncBareKStep 是輔助步驟）；名單只剩自選股與策略股。
- ctx.date_str 為空字串時，以 date.today() 的 ISO 字串作為迄日，與步驟既有的 fallback 一致。
- 前端 getStrategySnapshots 查不到快照時，該股顯示佔位卡，其他股票照常顯示。
- 未知的 view 值一律視為卡片視角。

**Acceptance criteria**

- `yarn test --testPathPatterns momentumChartSlides` 與 `yarn test --testPathPatterns getWindowMomentum` 通過。
- `uv run pytest ETF/tests/test_sync_bare_k_step.py` 通過，涵蓋合併順序、去重、200 上限截斷、窗口起日推算、SQL 失敗回傳空列表。
- `yarn tsc --noEmit` 通過；`yarn eslint` 檢查改動檔無新錯誤；`uv run ruff check ETF/pipeline/steps/sync_bare_k_step.py ETF/tests/test_sync_bare_k_step.py` 通過。
- 實跑本地 dev server：`/investment/momentum?view=chart` 能捲動顯示六面板，標籤、標題列摘要、加碼日標記、返回連結都正確，深淺色模式都正常，漲跌維持紅漲綠跌。
- 以 Supabase SQL 比對：`_fetch_momentum_stocks` 的名單與前端預設窗口名單相同（在 SyncAdlStep 完成之後比對）。

**Scope boundaries**

- In scope：同步加碼頁的視角切換與圖表視角、getWindowMomentum 新增欄位與快取鍵、windowMomentumUtils 純函式、SyncBareKStep 名單與上限。
- Out of scope：策略頁 UI、BareKChart 本身的繪圖、bare_k_snapshots schema、非預設篩選組合的快照同步、卡片視角版面。

## Risks / Trade-offs

- [Risk] 裸K計算量由最多 50 支變成約 132 支，每日 pipeline 拉長，可能接近 GitHub Actions 逾時 → 實作時量測本地 compute_snapshot 的單支耗時並推算總時間；若超過可接受範圍，回頭討論降低 MAX_STOCKS 或只納入前 K 支同步加碼股。
- [實測 2026-10-24] 本機 BareKService：ensure_global_data 14.9s，compute_snapshot 平均 5.23s/支（10 支樣本 4.89–6.14s）。推算 50 支 4.4 分、132 支 11.5 分、200 支 17.4 分；每日增加約 7 分鐘（滿載 200 支增加約 13 分鐘）。etf_daily.yml 主工作 timeout-minutes 為 150；現行整體 pipeline 耗時無法在本機以 gh 取得，需上線後從 Actions 確認仍有餘裕。
- [Risk] 前後端兩份窗口判定邏輯（TypeScript 與 SQL）可能逐漸不一致 → 兩邊常數加註解互相指向，驗收時用 SQL 比對名單。
- [Risk] 非預設篩選（例如 14 天）中有部分股票沒有快照 → 依 Non-Goals 接受，顯示佔位卡；14 天、≥ 2 家實測與 5 天名單聯集 96 支，未來可考慮改同步較寬的窗口。
- [Trade-off] 用 strategies 參數承載 ETF 標籤，語意上不完全貼合，但不需修改 BareKChart。

## Migration Plan

- 無 DB schema 變更。前端快取鍵升版（v1 → v2），部署後自動失效。
- 部署順序不限：前端先上時，同步加碼股暫時多為佔位卡；隔日 pipeline 跑完後補齊。
- Rollback：revert 前端與 sync_bare_k_step.py 即可，bare_k_snapshots 中多出的資料列不會造成影響。
