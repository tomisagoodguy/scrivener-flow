## 1. Server Action

- [x] 1.1 建立 `src/app/actions/getHoldings5DayTrend.ts`，定義回傳型別 `Holdings5DayTrendResult`（含 `insufficient: boolean`、`dailyDiff: DailyDiffItem[]`、`cumulativeDiff: CumulativeDiffItem[]`、`dates: string[]`）
- [x] 1.2 實作 Server Action query：查詢指定 `etfKey` 最近5個不同 `data_date`（`etf_holdings_snapshot`），再 `IN` 取全量持股（`stock_code, stock_name, weight, rank`）—— 對應 Requirement: Server Action returns 5-day snapshot data for an ETF
- [x] 1.3 實作 daily diff 計算（計算在 Server 端完成）：對連續日期對逐一比對持股 weight，閾值 `|delta| >= 1.0` 才納入 `dailyDiff` —— 對應 Requirement: Daily diff analysis filters by ±1% threshold
- [x] 1.4 實作 cumulative diff 計算（計算在 Server 端完成）：今日 weight vs 各歷史日 weight，閾值 `|delta| >= 3.0` 才納入 `cumulativeDiff`，同一股票的多筆歷史合併為一個 entry —— 對應 Requirement: Cumulative diff analysis compares today vs each past date
- [x] 1.5 處理資料不足情境：distinct date 數 < 2 時回傳 `{ insufficient: true, dailyDiff: [], cumulativeDiff: [], dates: [] }` —— 對應 Requirement: Server Action returns 5-day snapshot data for an ETF

## 2. 單元測試

- [x] 2.1 [P] 為 daily diff 計算邏輯撰寫單元測試，涵蓋 spec 中的 threshold boundary cases（delta = 1.00 納入，delta = 0.99 不納入，負向 delta）
- [x] 2.2 [P] 為 cumulative diff 計算邏輯撰寫單元測試，涵蓋 threshold boundary cases（delta = 3.00 納入，delta = 2.99 不納入）
- [x] 2.3 [P] 為資料不足情境（< 2 天）撰寫單元測試，確認回傳 `insufficient: true`

## 3. 前端元件

- [x] 3.1 建立 `src/components/features/Holdings5DayTrend.tsx` Client Component，接受 `Holdings5DayTrendResult` props；實作「近5日每日權重變動」表格（欄位：代號、名稱、區間、起始權重、最新權重、變動）—— 對應 Requirement: Holdings5DayTrend component renders two analysis sections
- [x] 3.2 實作「今日累積偏移」區塊：依股票分組顯示，列出今日權重與各歷史日 delta —— 對應 Requirement: Cumulative diff analysis compares today vs each past date
- [x] 3.3 處理空資料與資料不足狀態：無符合標的顯示「無符合條件的標的」；`insufficient: true` 顯示「資料不足（至少需要 2 天資料）」—— 對應 Requirement: Holdings5DayTrend component renders two analysis sections
- [x] 3.4 套用台股色彩慣例（Server Action 查詢策略）：正向 delta 用 `text-rose-600`，負向 delta 用 `text-emerald-600`

## 4. 頁面整合

- [x] 4.1 在 `src/app/investment/[etf]/page.tsx` 呼叫 `getHoldings5DayTrend(etfKey)` 取得趨勢資料 —— 對應 Requirement: Trend section is inserted below the existing diff section in the ETF page
- [x] 4.2 將趨勢資料以 props 傳入 `Holdings5DayTrend`，依元件放置位置決策插入現有 diff 區塊下方，確認三支 ETF（00980A、00981A、00991A）皆可正常顯示
