## Why

ETF 持股監控頁（`/investment/[etf]`）目前只顯示「當日新增/移除」diff，無法快速判斷近期持股權重趨勢。參考同類開源工具的三層分析框架，在現有 `etf_holdings_snapshot` 資料基礎上，補充近5日趨勢視角，讓使用者不需手動翻查歷史記錄就能判讀籌碼動向。

## What Changes

- 在 ETF 持股監控頁新增「近5日趨勢」區塊，顯示三層分析：
  1. **今日 vs 昨日 diff**（現有，不動）
  2. **近5日每日權重變動**：以最近5筆 snapshot 形成4個日對日區間，列出任一區間權重變動 ≥ ±1% 的持股
  3. **今日 vs 過去N日**：計算今日權重與過去每一天的差值，列出累積偏移 ≥ ±3% 的持股
- 新增 Server Action `getHoldings5DayTrend(etfKey)` 讀取 `etf_holdings_snapshot`，計算上述兩層分析並回傳
- 新增前端元件 `Holdings5DayTrend` 渲染趨勢表格，整合進 `/investment/[etf]` 頁面

## Non-Goals

- 不修改現有的 diff log pipeline（`etf_diff_logs`），所有計算在前端 Server Action 完成
- 不新增 DB 欄位或 migration
- 不支援超過5筆（即5日以上）的歷史分析
- 不修改 00981A 以外的 ETF 資料來源（所有 ETF 使用相同 `etf_holdings_snapshot` 資料）

## Capabilities

### New Capabilities

- `etf-holdings-5day-trend`: ETF 持股近5日權重趨勢分析，包含日對日變動（±1%門檻）與今日累積偏移（±3%門檻）兩種視角

### Modified Capabilities

(none)

## Impact

- Affected specs: `etf-holdings-5day-trend`（新增）
- Affected code:
  - New: `src/app/actions/getHoldings5DayTrend.ts`
  - New: `src/components/features/Holdings5DayTrend.tsx`
  - Modified: `src/app/investment/[etf]/page.tsx`
