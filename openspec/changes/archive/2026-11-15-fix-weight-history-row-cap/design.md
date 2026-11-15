## Context

- Supabase PostgREST 每次回應最多 1000 列，超過的部分靜默丟棄（`.limit()` 調大也無效，見 `.claude/rules/etf-pipeline.md`）。
- 2026-11-15 實測各讀取點的最大列數：個股頁 API（1 檔股票 × 全部 ETF × 全歷史）2,905；`getRankingHistory`（1 支 ETF 全歷史）17,281；`HoldingsPriceOverlayChart`（1 檔股票 × 多支 ETF × 90 天）1,272；`/investment/history` weight history（全部 ETF × 90 天）69,569；同頁 `etf_stock_overlap`（90 天）25,730；每支 ETF 最新一天合計 1,052；單一 ETF 90 天最多 6,192；`investmentPnl`（1 ETF × 1 股全歷史）174。
- 所有讀取點都只依 `data_date` 升冪排序、沒有分頁，被丟棄的是最新日期。
- 專案已有 8 個以上檔案各自內嵌分頁迴圈；最接近通用的是 `src/app/actions/getFanBreakoutSignals.ts` 的私有 `fetchAllRows<T>(label, fetchPage)`（每頁 1000、失敗拋錯）。
- `/investment/history` 由 Server Component 一次載入 90 天全部資料，經 props 傳入 `HistoryTabs`，`StockWeightCrossEtfChart` 與 `EtfRankingHistoryChart` 在元件內以 `stock_code`／`etf_code` 過濾；選擇狀態（`selectedStock`、`selectedEtf`）在圖表元件內部。共識頁籤的「各股被幾家持有」只用最新一日。
- 使用者已選定 `/investment/history` 改為按需載入。

## Goals / Non-Goals

**Goals:**

- 所有列出的讀取點拿到完整資料，最新日期正確。
- 分頁邏輯只有一份實作（共用函式），weight history 查詢條件只有一份實作（讀取模組）。
- `/investment/history` 開頁不再嘗試載入數萬列。

**Non-Goals:**

- 不改 `etf_weight_history` view、pipeline、`investmentPnl`（174 列，實測）。
- 不把其他已自行分頁的模組改用共用函式（`getFanBreakoutSignals` 除外，因為函式是從它抽出）。
- 不處理 `HoldingsPriceOverlayChart` 在 Client Component 直接查資料庫的既有架構問題。
- 不改圖表的視覺設計與互動，只改資料來源與載入狀態。

## Decisions

### 共用分頁函式 fetchAllRows

把 `getFanBreakoutSignals` 的私有 `fetchAllRows` 移到 `src/lib/supabase/fetchAllRows.ts` 並匯出，`getFanBreakoutSignals` 改為匯入。簽名不變：`fetchAllRows<T>(label: string, fetchPage: (from, to) => PromiseLike<{ data: unknown[] | null; error: { message: string } | null }>): Promise<T[]>`，`PAGE_SIZE = 1000`，依序請求直到某頁列數 < 1000。

- 理由：已在正式環境使用、語意（失敗拋錯、不吞錯）正確；依序請求比先查 count 再並行簡單，也不會因 count 與實際列數在兩次請求間變動而漏列。
- 效能估算：17,281 列需 18 次請求；以每次約 100 ms 估算約 1.8 秒（估算），以 `getRankingHistory` 實測耗時確認，若 > 3 秒再改為並行，不在本次預先最佳化。
- 替代方案：改用資料庫 RPC 一次回傳——PostgREST RPC 回傳集合同樣受 max-rows 限制，且需要新 migration，否決。

### weight history 讀取模組

新增 `src/lib/investment/weightHistoryData.ts`：`fetchWeightHistory(supabase, filter, columns)`，`filter` 為 `{ etfCodes?: string[]; stockCode?: string; fromDate?: string }`，內部組 `.in/.eq/.gte` 並固定 `.order('data_date').order('etf_code').order('stock_code')`，透過 `fetchAllRows` 分頁。`supabase` 參數接受任何 Supabase client（server、public、browser），讓 Server 端與 `HoldingsPriceOverlayChart` 共用同一個實作。

- 穩定排序：同一天有上千列（每日約 1,052 列，實測），只依日期排序時跨頁順序不保證，會重複或漏列。
- 欄位由呼叫端指定，各讀取點維持原本只取需要的欄位。

### 移除改讀 snapshot 的 fallback

個股頁 API 與 `getRankingHistory` 現有「weight history 無資料或只有 1 天時改讀 `etf_holdings_snapshot` 並自算 rank」的分支一併移除。

- 理由：`etf_weight_history` 已是 snapshot 的 view，兩者資料相同，fallback 無法補出更多資料；fallback 自身的 `.in('data_date', dates)` 也會被截斷，留著只會在錯誤情況下回傳殘缺資料。
- 錯誤處理：查詢失敗時 API 回 HTTP 500 與錯誤訊息；`getRankingHistory` 拋錯交由頁面錯誤邊界處理，不回空陣列假裝無資料。

### history 頁按需載入

- 伺服器端：`fetchLatestHoldings` 以 `fetchWeightHistory` 讀每支 ETF 的最新 `data_date`（先取各 ETF 最新日期，再以 `etf_code` + `data_date` 條件讀取，合計約 1,052 列，實測）。股票清單改由最新一日計算，依「持有 ETF 家數」降序、同數依 `stock_code` 升冪。頁首交易日數改為 `stock_prices_daily` 中 2330 近 90 天的 `data_date` 筆數（市場交易日，約 65 筆，估算）。unstable_cache key 由 `weight-history-v1` 改為 `weight-history-latest-v2`。
- 按需載入：新增 Server Action 檔 `src/app/actions/getWeightHistory.ts`，提供 `getEtfWeightHistory90d(etfCode)` 與 `getStockWeightHistory90d(stockCode)`，各自以 `unstable_cache`（key 含代碼，revalidate 3600）包住 `fetchWeightHistory`。單一 ETF 90 天最多 6,192 列（實測），單一股票 90 天最多 1,272 列（實測）。
- 元件：`StockWeightCrossEtfChart`、`EtfRankingHistoryChart` 新增 `onSelectionChange` 與 `loading`／`error` props，選擇狀態保留在圖表內；`HistoryTabs` 依選擇呼叫對應 Server Action，並以「代碼 → 資料」的 Map 暫存已載入結果，切回不重抓。選擇變更期間若前一個請求晚到，只採用與目前選擇相符的回應。
- 替代方案（使用者未選）：全量分頁（約 70 次請求、資料約 5 MB 超過 Next 快取 2 MB 上限，估算）、縮短為 30 天。

### 共識趨勢分頁聚合

`fetchOverlapTrend` 改用 `fetchAllRows` 讀 `etf_stock_overlap` 近 90 天的 `data_date, etf_count`（不再取未使用的 `stock_code`），排序 `data_date` + `stock_code`，聚合邏輯不變。25,730 列需 26 次請求（實測列數），結果只有約 64 列聚合值，可放入 unstable_cache；key 由 `overlap-trend-v1` 改為 `overlap-trend-v2`。

## Implementation Contract

**行為**

- 個股頁「ETF 持倉歷史」、ETF 頁排名歷史、持股比重 × 股價疊圖、`/investment/history` 三個頁籤，都顯示到資料庫中的最新日期。
- `/investment/history` 開頁只載入最新一日持股；切換 ETF 或股票時顯示載入中，載入失敗顯示錯誤訊息。

**介面／資料形狀**

- `fetchAllRows<T>(label, fetchPage): Promise<T[]>`（`src/lib/supabase/fetchAllRows.ts`）。
- `fetchWeightHistory<T>(supabase, filter, columns): Promise<T[]>`（`src/lib/investment/weightHistoryData.ts`），`filter = { etfCodes?, stockCode?, fromDate? }`，`columns` 為逗號分隔欄位字串。
- Server Actions：`getEtfWeightHistory90d(etfCode: string): Promise<WeightHistoryRow[]>`、`getStockWeightHistory90d(stockCode: string): Promise<WeightHistoryRow[]>`；`WeightHistoryRow` 沿用 `src/app/investment/history/page.tsx` 現有 interface。
- `GET /api/investment/etf-weight-history?code=` 回應格式不變（`Record<etfCode, { date, weight, rank }[]>`）；查詢失敗回 500 `{ error }`。

**失敗模式**

- 任一頁查詢失敗即拋錯，不回傳部分資料；API 轉為 500，Server Action 拋錯由 `HistoryTabs` 顯示錯誤訊息，`getRankingHistory` 拋錯交給頁面錯誤邊界。

**驗收**

- `yarn test --testPathPatterns fetchAllRows`、`--testPathPatterns weightHistoryData` 通過（含 spec 的分頁邊界 Example 表）。
- `yarn tsc --noEmit` 通過；`yarn eslint <改動檔>` 無新錯誤。
- 以 Supabase SQL 與實際呼叫比對：2330 API 回傳 2,905 列（或執行時的實際列數）且最新日 = snapshot 最新日；`getRankingHistory('00981A')` 列數 = snapshot 列數。
- Playwright 實測 `/investment/history`：頁首交易日數 > 1；「各 ETF 排名史」選 00981A 後圖表最新日期 = 資料庫最新日；「個股跨 ETF」選 2330 同理；「共識趨勢」點數 = 近 90 天 overlap 相異日期數。
- 記錄 `getRankingHistory('00981A')` 實際耗時。

**範圍**

- 範圍內：上列 8 個既有檔案與 5 個新檔。
- 範圍外：見 Non-Goals。

## Risks / Trade-offs

- [依序分頁在大 ETF 上偏慢（估算 18 次請求約 1.8 秒）] → 實測耗時寫入 tasks；> 3 秒再另案改並行或加快取。
- [按需載入讓切換頁籤時出現短暫載入] → 已載入結果以 Map 暫存；使用者已接受此取捨。
- [資料在兩次分頁請求之間被 pipeline 寫入] → 穩定排序下新增列只可能出現在最後一頁或造成單一列重複；pipeline 在收盤後執行，頁面讀取時段重疊機率低，接受。
- [移除 fallback 後，若 view 被誤刪則畫面變成錯誤而非退回] → 這是期望行為：錯誤應被看見，而不是靜默回傳殘缺資料。
- [股票清單排序由「90 天出現次數」改為「最新一日持有家數」] → 兩者都反映熱門程度；舊排序依賴 90 天全量資料，按需載入下無法維持。
