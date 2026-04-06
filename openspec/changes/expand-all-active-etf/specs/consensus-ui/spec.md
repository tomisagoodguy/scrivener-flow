## ADDED Requirements

### Requirement: 共識持股頁面 /investment/consensus
新增 `src/app/investment/consensus/page.tsx`，展示跨主動式 ETF 的共識持股資料。頁面採 Server Component，資料透過 `src/app/api/investment/consensus/route.ts` 取得。

#### Scenario: 頁面顯示共識排行表
- **WHEN** 使用者訪問 `/investment/consensus`
- **THEN** 顯示當日持股排行表，欄位包含：股票代號、股票名稱、持有 ETF 數量（`etf_count`）、合計權重（`total_weight`）、持有 ETF 清單（標籤形式）

#### Scenario: 預設顯示被 2 檔以上 ETF 持有的股票
- **WHEN** 頁面初始載入
- **THEN** 僅顯示 `etf_count >= 2` 的股票，並可透過篩選器調整門檻值（1/2/3/4+）

#### Scenario: 點擊股票跳轉個股頁
- **WHEN** 使用者點擊股票代號
- **THEN** 跳轉至 `/investment/stock/[code]`

### Requirement: 共識 API Route
`GET /api/investment/consensus` 回傳指定日期的 `etf_stock_overlap` 資料，支援 query params：`date`（預設今日）、`min_etf_count`（預設 2）、`limit`（預設 50）。

#### Scenario: 正常查詢
- **WHEN** 呼叫 `GET /api/investment/consensus?min_etf_count=2`
- **THEN** 回傳 JSON `{ data: [...], date: "YYYY-MM-DD", total: N }`，依 `etf_count DESC, total_weight DESC` 排序

#### Scenario: 指定日期無資料時 fallback 最近一日
- **WHEN** 傳入 `date` 參數但當日無快照
- **THEN** 自動查詢最近一個有資料的日期並回傳，response 中 `date` 欄位反映實際資料日期

### Requirement: SideNav 新增共識頁連結
SideNav 投資模組區塊 SHALL 包含「經理人共識」連結，指向 `/investment/consensus`。

#### Scenario: 導覽顯示
- **WHEN** 使用者在任何頁面查看 SideNav
- **THEN** 投資模組區塊內可見「經理人共識」連結
