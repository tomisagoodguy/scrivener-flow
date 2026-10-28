## Context

籌碼排行頁（/investment/equity）是 Server Component，以 URL 參數 `tier`、`weeks`、`sort`、`dir` 驅動，資料來自 `fetchRankingData()`（`unstable_cache` 1 小時），產出 `doubleSignalRanking`（≤10）、`bigHolderRanking`、`retailDeclineRanking` 三份清單，以及 `etfMap`（股票 → 持有的 E 經理人 ETF 代號）。

策略頁的 `?view=chart` 已有成熟做法：Server 端用 `getStrategySnapshots(stockIds)` 逐股取最新 `bare_k_snapshots`，Client 端 `StrategyChartViewer` 把股票轉成 slide 交給共用的 `ScrollChartViewer`，每格用 `BareKSlideContent` 畫六面板或佔位卡。

裸K快照只由 Pipeline 的 `SyncBareKStep` 產生，名單依序為自選股 → 策略股 → 同步加碼股，上限 `MAX_STOCKS = 200`。2026-10-19～27 每日實際同步約 50 支（10-22 為 132 支），尚有餘裕。`equity_distribution_stats` 每週更新一次，已有預計算的週變化欄位 `big_holder_pct_change`、`shareholders_change_rate`。

## Goals / Non-Goals

**Goals:**

- 籌碼排行頁可切到圖表視角，三個清單都能連續捲動看裸K六面板。
- 預設視角（1 週、不分級距）三清單的圖表股票，於 Pipeline 跑完後都有當日快照。
- 前端完全沿用 `ScrollChartViewer` / `BareKSlideContent` / `getStrategySnapshots`，不新增第二套圖表。

**Non-Goals:**

- 不為非預設的 `tier` / `weeks` 組合另外同步快照；這些組合中未同步的股票顯示佔位卡。
- 不提高 `MAX_STOCKS`，也不改變自選股、策略股、同步加碼股既有的優先序。
- 不在圖表視角加 Client 端篩選列（策略頁的 `StrategyChartFilterBar` 不沿用）；清單切換一律走 URL。
- 不修正 `SortableHeader` 點擊排序時會丟掉 `tier` / `weeks` 的既有行為（與本變更無關）。
- 不改 `getStrategySnapshots` 的名稱或位置（雖然名稱帶 strategy，但行為是通用的逐股取最新快照）。

## Decisions

### 決策 1：清單切換用 URL 參數 `list`，不用 Client state

`list` ∈ `double | big | retail`，預設 `double`。理由：排行頁本身就以 URL 驅動、Server 端才知道該查哪些股票的快照；放 Client state 會變成三份清單的快照全部預先查（最多 70 次逐股查詢）。替代方案「一次查三份 + Client 切換」被否決：切換頻率低，不值得三倍查詢量。

### 決策 2：圖表清單每份上限 30 檔（`EQUITY_CHART_LIST_LIMIT = 30`），雙訊號本身 ≤10

主力買進 218 檔、散戶減少 272 檔，全部捲動不實用，逐股快照查詢也會過多。30 與 Pipeline 同步的前 N 名一致，讓預設視角的圖表股票全部有快照。TS 常數與 Python 常數必須同值，兩邊各留註解互指（比照既有 `MOMENTUM_WINDOW_DAYS` 的做法）。

### 決策 3：圖表清單順序完全沿用目前排行結果

直接取 `fetchRankingData()` 已排序的陣列 `.slice(0, 30)`，所以 `tier`、`weeks`、`sort`、`dir` 會影響圖表內容與順序，跟表格一致。替代方案「圖表固定用預設排序」被否決：使用者在表格切了 400 張+，切到圖表卻看到另一批股票會困惑。

### 決策 4：Pipeline 只同步「預設視角」排行，直接用預計算欄位

`_fetch_equity_ranking_stocks()` 查 `equity_distribution_stats` 全局最新 `snapshot_date`（獨立子查詢，依 database 規則不可依賴特定股票），以預計算的 `big_holder_pct_change`、`shareholders_change_rate` 重現前端 `weeks=1, tier=null, sort=null` 的三份清單：

- 雙訊號：`big_holder_pct_change > 0 AND shareholders_change_rate < 0`，依 `big_holder_pct_change` 遞減取 10
- 主力買進：`big_holder_pct_change > 0`，依 `big_holder_pct_change` 遞減取 30
- 散戶減少：`shareholders_change_rate < 0`，依 `shareholders_change_rate` 遞增取 30

依序串接（雙訊號 → 主力買進 → 散戶減少）並去重。同值時以 `stock_code` 遞增作為穩定次序。替代方案「Pipeline 為所有 tier×weeks 組合同步」被否決：12 種組合聯集可能上百支，會擠壓上限且多數組合很少用。

### 決策 5：籌碼股排在同步名單最後

順序變為自選股 → 策略股 → 同步加碼股 → 籌碼排行股。籌碼資料每週才變，優先度最低；超過 200 時最先被截斷，不影響既有功能。

### 決策 6：標題脈絡與標籤

- 標題（`renderHeaderExtra`）：「<級距>大戶 +x.xxpp・股東 -y.yy%」。級距欄位與排行頁一致：`tier` 為 `200` 用 `mid_holder_pct_change`（標「200張+」），`1000` 用 `whale_holder_pct_change`（標「1000張+」），其餘用 `big_holder_pct_change`（標「400張+」）。值為 null 的部分省略；兩者皆 null 時不顯示。
- 標籤（`BareKSlideContent` 的 `strategies` prop）：放 `etfMap[stock_code]` 的 ETF 代號；查無時為空陣列。

### 決策 7：視角切換元件獨立成 `EquityViewNav`

「排行 / 圖表」切換與「雙訊號 / 主力買進 / 散戶減少」清單切換放在新元件 `EquityViewNav`（Server 可渲染的 `Link` 列），維持 page.tsx 與各元件 ≤150 行。`TierNav`、`WeekNav` 新增可選的 `extraParams: Record<string, string>`，組 href 時一併帶上，讓圖表視角切換級距/週數時留在圖表視角。

## Implementation Contract

**行為**

- `/investment/equity`（無 `view` 或 `view` 非 `chart`）：與現行完全相同，另多一列「排行 / 圖表」切換，「排行」為選取狀態。
- `/investment/equity?view=chart`：顯示 `TierNav`、`WeekNav`、清單切換（雙訊號 / 主力買進 / 散戶減少，各附檔數），下方為捲動圖表；不顯示 `DoubleSignalSection` 與 `RankingPanelGrid`。
- `list` 缺省或不合法時視為 `double`。
- 圖表返回鈕（`backHref`）回到 `/investment/equity`，保留 `tier`、`weeks`（非預設值時）。
- 無快照的股票顯示佔位卡，文字「此股票尚未同步裸K資料，將於下次 Pipeline 執行後更新」。
- 清單為空：顯示「此清單目前沒有股票」，不渲染 `ScrollChartViewer`。
- `!data` 與 `insufficientData` 時沿用現有空狀態訊息，不查快照。
- 只有圖表視角才呼叫 `getStrategySnapshots`；表格視角的查詢量不變。

**介面 / 資料形狀**

- `src/lib/investment/equityChartUtils.ts`（純函式，可單測）：
  - `type EquityChartList = 'double' | 'big' | 'retail'`
  - `EQUITY_CHART_LIST_LIMIT = 30`
  - `parseEquityChartList(raw: string | undefined): EquityChartList`
  - `selectEquityChartRows(data: RankingData, list: EquityChartList): EquityRow[]` — `double` 回傳 `doubleSignalRanking`，`big` / `retail` 回傳對應排行前 30
  - `formatEquityHeader(row: EquityRow, tier: Tier | null): string` — 依決策 6 組字串，正數帶 `+`，小數兩位
- `EquityChartViewer`（Client）props：`rows: EquityRow[]`、`snapshots: Map<string, BareKSnapshot | null>`、`etfMap: Record<string, string[]>`、`tier: Tier | null`、`backHref: string`、`listKey: string`（當作 `ScrollChartViewer` 的 `key`，切清單時重掛載回到第 1 檔）。
- Python：`SyncBareKStep._fetch_equity_ranking_stocks(ctx, services) -> list[str]`；模組常數 `EQUITY_DOUBLE_LIMIT = 10`、`EQUITY_LIST_LIMIT = 30`。

**失敗模式**

- `_fetch_equity_ranking_stocks` 任何例外：`logger.error` 後回傳 `[]`，不 raise（輔助步驟規則），其餘名單照常同步。
- `equity_distribution_stats` 無資料：回傳 `[]`，不記錯誤。
- 前端 `getStrategySnapshots` 單股查詢失敗：沿用既有行為（該股為 null → 佔位卡）。

**驗收**

- `yarn test --testPathPatterns equityChartUtils` 與 `--testPathPatterns EquityChartViewer` 綠燈。
- `uv run pytest ETF/tests/test_sync_bare_k_step.py` 綠燈，含名單順序、去重、截斷、查詢失敗四種情境。
- `yarn tsc --noEmit`、`yarn eslint <改動檔>`、`uv run ruff check ETF/pipeline/steps/sync_bare_k_step.py` 無新錯誤。
- 本地實跑 `/investment/equity?view=chart&list=big`：可捲動、切清單回到第 1 檔、切 `tier` 仍在圖表視角、返回鈕回表格。

**範圍**

- In：上述頁面、元件、純函式、`SyncBareKStep` 名單擴充與其測試。
- Out：`MAX_STOCKS` 調整、非預設組合同步、Client 篩選列、`SortableHeader` 參數保留、`getStrategySnapshots` 重新命名。

## Risks / Trade-offs

- [Pipeline 時間增加，最壞約 6 分鐘] → 籌碼股排最後，且與自選/策略股重疊；上線後看 GitHub Actions 的 SyncBareK 耗時，若超過容忍度再把 `EQUITY_LIST_LIMIT` 降為 20。
- [名單超過 200 時籌碼股被截斷] → 現況每日約 50 支，餘裕約 150；截斷時沿用既有 warning log，前端顯示佔位卡而不報錯。
- [TS 與 Python 的 30 不同步] → 兩邊常數旁註解互指，並在 spec 明定兩者必須相等。
- [Pipeline 用預計算欄位、前端 weeks=1 用兩期快照動態計算，邊界值可能有細微差異] → 兩者語意相同（皆為最新 vs 前一期），差異只影響第 30 名附近個別股票，該股顯示佔位卡，可接受。
- [週更資料 vs 日更快照] → 籌碼名單一週內不變，每日重算快照只是更新 K 線，屬預期行為。

## Migration Plan

無 schema 變更、無資料遷移。前後端可獨立部署：前端先上線時，未同步股票顯示佔位卡；Pipeline 改動於下一次每日排程生效。回滾只需 revert commit。

## Open Questions

（無）
