## Context

融資使用率（FinLab `margin_transactions:融資使用率`，融資餘額 ÷ 融資限額）已由 `OHLCVService.get()` 抓進 `stock_prices_daily.margin_ratio`，也由 `PriceService` 寫進 `etf_holdings_snapshot.margin_ratio`。前端：

- ETF 持股頁 `/investment/[etf]` 由 `etfPageData.getHoldings()` 組資料，`HoldingsTable` → `HoldingRow` 以固定門檻（>40 紅、>20 橘、>10 藍）上色。
- `getHoldings()` 只對「快照沒有價格」的持股查 `stock_prices_daily`，其餘持股的 `margin_ratio` 來自快照。
- `StockPoolMetrics`、`StockPickerTable` 把 `margin_ratio` 標成「資券%」。
- 自選股頁 `/investment/watch-list` 是 Server Component，目前只查 `watch_list` 與名稱，不帶任何價量資料。
- `stock_prices_daily` 只涵蓋 `SyncOHLCVStep` 同步的股票（ETF 成分股＋次要 ETF 成分股），保留 260 天；自選股若不是 ETF 成分股就沒有列。

### 驗證依據（實測）

以 `research/margin_crash.py`（本 change 目錄內）用 FinLab 重算，2009-01-01～2026-10-16，大盤（`market_transaction_info:收盤指數` TAIEX）收盤跌超過 3% 共 58 天，合格條件同本 change（四碼普通股、前 20 日均額 ≥ 5,000 萬、前日收盤 ≥ 10 元）：

| 指標 | 實測 |
| --- | --- |
| 大跌當天最低 20%／最高 20% 融資使用率組平均報酬 | −3.55%／−5.84% |
| 高融資組跌更重的天數 | 54/58 |
| 2026-10-15 市值三層（小／中／大） | −4.03%／−3.53%／−3.79% |
| 2026-10-15 五組 | −1.48%、−3.02%、−4.18%、−4.81%、−5.42% |
| 2026-10-16 合格股使用率中位數／80 百分位 | 11.3%／22.4% |
| 隔日開盤買抱 20 日差（高−低），2009–2016／2017 起 | +1.51／+5.36 個百分點 |

## Goals / Non-Goals

**Goals:**

- 每檔個股每個同步日都有一個可跨日比較的「當日全市場融資使用率百分位」。
- ETF 持股表直接標出高融資前 20% 的持股。
- ETF 持股頁與自選股頁各有一行高融資曝險摘要。
- 修正「資券%」錯標。

**Non-Goals:**

- 反彈策略、去槓桿週警示、歷史回補、`etf_holdings_snapshot` 加欄位、改動量化策略既有的融資條件（理由見 proposal Non-Goals）。
- 不改 `holdingFilters.ts` 的「高資前10／低資前10」（ETF 內排名，與全市場百分位是不同問題）。

## Decisions

### 百分位在 pipeline 端用全市場資料計算，存進 stock_prices_daily

`OHLCVService.get()` 已載入全市場的 `close`、`amount`、`margin_usage` 寬表，只是在 `stack()` 前切成 `valid_list`。在切之前用全市場寬表算百分位，再取 `valid_list` 欄位附加成 `margin_pct_rank`。

替代方案：前端用 `stock_prices_daily` 現有列排名 —— 否決，因為表內只有 ETF 成分股（數百檔），不是全市場，排名母體錯誤；改為讀時計算也會每次請求重算。

### 百分位計算抽成純函式模組

新增 `ETF/processors/margin_percentile.py`，提供 `compute_margin_pct_rank(close: pd.DataFrame, amount: pd.DataFrame, margin: pd.DataFrame) -> pd.DataFrame`。輸入為日期 × 股票代碼的寬表，回傳同形狀寬表（0–100 浮點，不合格為 NaN）。純函式便於 `ETF/tests/test_margin_percentile.py` 不依賴 FinLab 直接測。

替代方案：直接寫在 `OHLCVService.get()` 內 —— 否決，該方法已在 try 區塊內做多件事，無法單測。

### 合格母體與百分位定義

在日期 t：

- 代碼為四位數字且首碼非 `0`（排除 ETF 與 DR）；
- `amount` 含 t 在內的 20 日滾動平均 ≥ 50,000,000（元）；
- `close_t` ≥ 10；
- `margin_t` 非 NaN。

合格股依 `margin_t` 做 `rank(pct=True, method='average')`，乘 100 後四捨五入到小數 1 位。不合格或當日母體少於 50 檔時一律 NaN（母體太小時百分位無意義）。

研究腳本用「前一日」數值分組是為了避免事件日前視；本功能是顯示「目前」狀態，所以用當日（含 t）的數值。

`margin_usage` 的 NaN 是「無融資資格或尚未公布」，不能當 0。現有程式在寫入時把 `margin_ratio` 的 NaN 補 0，百分位必須用補 0 之前的原始寬表算。

### 高融資門檻常數只定義一次

前端 `src/lib/investment/marginRisk.ts` 匯出 `HIGH_MARGIN_PCT = 80` 與 `isHighMargin(pct: number | null | undefined): boolean`（pct ≥ 80 為 true，null/undefined 為 false）。Python 端只存百分位，不存布林，因此門檻只有前端一處。

### 百分位讀取走共用的 fetchMarginPctRanks

`marginRisk.ts` 另匯出 `fetchMarginPctRanks(supabase, codes): Promise<Record<string, number | null>>`：查 `stock_prices_daily` 的 `stock_code, data_date, margin_pct_rank`，`in('stock_code', codes)`、`order('data_date', desc)`、`limit(2 * codes.length)`，每個代碼取最新一列。codes 為空時直接回 `{}` 不發查詢；查詢回 error 時 throw（由呼叫端決定如何呈現），不靜默回空。

`etfPageData.getHoldings()` 與 `watch-list/page.tsx` 都呼叫它，不各寫一份查詢。

替代方案：在 `getHoldings()` 既有的「缺價查詢」中加欄位 —— 否決，那個查詢只涵蓋缺價持股。

### 曝險彙總是純函式，摘要元件只負責呈現

`marginRisk.ts` 匯出 `summarizeMarginExposure(items: { margin_pct_rank?: number | null; weight?: number | null }[]): MarginExposureSummary`：

```ts
interface MarginExposureSummary {
  total: number;        // items 數
  highCount: number;    // isHighMargin 為 true 的數量
  highWeight: number;   // 高融資者 weight 加總（weight 缺值視為 0），單位與輸入相同（%）
  unknownCount: number; // margin_pct_rank 為 null/undefined 的數量
}
```

新元件 `src/components/features/investment/MarginExposureSummary.tsx`（無 `'use client'`，≤ 60 行）接收 `summary` 與 `showWeight: boolean`，渲染一行：「高融資前 20%：N 檔（權重 X%）」，`unknownCount > 0` 時附「另 M 檔無資料」。`highCount === 0` 時顯示「高融資前 20%：0 檔」。

替代方案：塞進 `HoldingsOverview`（已 147 行）或 `WatchListManager`（已 255 行）—— 否決，違反元件 150 行上限且讓 Client Component 承擔計算。

### 高融資標示用琥珀色，不用紅色

投資模組紅色代表上漲／利多（`components.md` 台股色彩慣例），高融資是風險提示，用紅色會混淆。`HoldingRow` 的融資使用率改為中性文字色，高融資時旁邊加琥珀色標籤「前20%」（`bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300`），title 為「當日全市場融資使用率百分位 P{pct}」。

### 「資券%」改名

`StockPoolMetrics` 的 chip label 改為「融資使用率」；`StockPickerTable` 表頭改為「資使用」（與 `HoldingsTable` 既有縮寫一致，窄欄）。只改字，不改資料。

## Implementation Contract

**Behavior**

- 每日 pipeline 跑完 `SyncOHLCVStep` 後，`stock_prices_daily` 新寫入的列帶 `margin_pct_rank`：合格股為 0–100 數值，不合格為 NULL。
- `/investment/[etf]` 持股表中，`margin_pct_rank ≥ 80` 的持股在融資使用率旁有「前20%」琥珀色標籤；其他持股沒有。
- `/investment/[etf]` 持股區塊上方顯示「高融資前 20%：N 檔（權重 X%）」。
- `/investment/watch-list` 清單上方顯示「高融資前 20%：N 檔」，有查不到百分位的自選股時附「另 M 檔無資料」；未登入（清單為空）時不顯示摘要。
- 任何頁面都不再出現「資券%」字樣代表 `margin_ratio`。

**Interface / data shape**

- DB：`stock_prices_daily.margin_pct_rank NUMERIC NULL`（migration `supabase/migrations/20261101130000_add_margin_pct_rank.sql`，`ADD COLUMN IF NOT EXISTS`，無 DROP、無預設值、不回補）。
- Python：`compute_margin_pct_rank(close, amount, margin) -> pd.DataFrame`；`OHLCVService.get()` 回傳的 long-format DataFrame 多一欄 `margin_pct_rank`（NaN 保留，不補 0）；`ETFStorage.save_stock_prices()` 寫入 `margin_pct_rank`（NaN → JSON null）。
- TS：`Holding.margin_pct_rank?: number | null`（`src/types/investment.ts`）；`marginRisk.ts` 匯出 `HIGH_MARGIN_PCT`、`isHighMargin`、`summarizeMarginExposure`、`fetchMarginPctRanks`、`MarginExposureSummary` 型別。

**Failure modes**

- 百分位計算拋例外：`OHLCVService.get()` log error 並讓 `margin_pct_rank` 全為 NaN，OHLCV 其餘欄位照常回傳（不能因新功能讓股價同步失敗）。
- migration 未套用就跑 pipeline：PostgREST 會因未知欄位拒絕整批，`save_stock_prices()` 既有 except 會 log 回應內容。部署順序必須先套 migration（列在 tasks）。
- `fetchMarginPctRanks` 查詢失敗：throw；`getHoldings()` 呼叫端 catch 後 log error，所有持股 `margin_pct_rank = null`、摘要顯示全為「無資料」，持股表其餘內容照常顯示。

**Acceptance criteria**

- `uv run pytest ETF/tests/test_margin_percentile.py` 通過，涵蓋合格過濾、NaN 不當 0、母體 < 50 回 NaN、百分位數值。
- `yarn test --testPathPatterns marginRisk` 通過，涵蓋 `isHighMargin` 邊界（79.9/80/null）、`summarizeMarginExposure` 計數與權重、`fetchMarginPctRanks` 取最新列與空 codes 不查詢。
- `yarn tsc --noEmit` 無新錯；改動檔 `yarn eslint` 無新錯；`uv run ruff check ETF/processors/margin_percentile.py ETF/services/finlab/ohlcv_service.py ETF/database/storage.py` 通過。
- 本地 `FORCE_RUN=true` 跑一次同步（或以 FinLab 直接呼叫 `compute_margin_pct_rank`）後，抽查 2026-10-16 的 80 百分位門檻落在 22.4% 附近（±1 個百分點，與研究腳本同母體）。
- 實跑 `/investment/00981A` 與 `/investment/watch-list` 截圖確認標籤與摘要。

**Scope boundaries**

- In scope：上列 Python 模組、OHLCV 同步、storage 寫入、migration、`marginRisk.ts`、摘要元件、`HoldingRow` 標籤、兩頁掛載、兩處改名。
- Out of scope：`holdingsUtils.getAllHoldings()`、`useStockPickerHub` 與選股中心的標籤、`etf_holdings_snapshot`、`PriceService`、歷史回補、LINE 通知、AI 報告提示詞。

## Risks / Trade-offs

- [自選股不在 `stock_prices_daily`] → 非 ETF 成分股的自選股會計入「無資料」。摘要明確顯示無資料檔數，不假裝是 0。
- [百分位只在同步後才有] → 上線首日之前的列皆為 NULL；前端只讀最新列，所以上線後第一次同步即生效。
- [當日融資資料尚未公布] → 若 pipeline 執行時 FinLab 融資資料晚於股價，當日列的百分位為 NULL，該檔會顯示無資料直到下次同步。這是保守行為，不以前一日值填補。
- [門檻 80 是固定百分位] → 百分位本身已隨市況調整，對應的使用率數值會移動（2026-10-16 為 22.4%，實測），這正是改用百分位的目的。
- [研究結論的外推] → 重現的是歷史大跌日統計，不是預測；標籤 title 只描述百分位，不寫「會跌更多」等預測字眼。
