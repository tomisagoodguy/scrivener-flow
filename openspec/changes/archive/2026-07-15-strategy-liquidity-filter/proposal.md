## Why

策略選股訊號（`strategy_signals`）目前不檢查標的流動性，低成交值股票（如日均成交額不足 5,000 萬）即使命中策略，散戶跟單時滑價大、甚至吃不到量。FinLab〈客製化流動性風險檢測〉指出這是回測與實戰落差的主因之一。共用快取 `StrategyDataCache.amt`（`price:成交金額`）已存在，計算 20 日均成交值零額外 FinLab 配額成本。

## What Changes

- `StrategySignalStep` 對每筆入選訊號計算 20 日均成交值（`avg_turnover`），低於門檻（預設 5,000 萬台幣）標記 `liquidity_flag = true`
- `strategy_signals` 表新增 `avg_turnover NUMERIC`、`liquidity_flag BOOLEAN` 兩欄（migration）
- `sql_storage.upsert_strategy_signals` 寫入並於 conflict 時更新新欄位
- 前端 `getStrategySignals` Server Action 回傳新欄位（`unstable_cache` key 升版 v3）
- `/investment/strategy` 頁面低流動性股票顯示警示 badge

## Non-Goals

- 不「過濾掉」低流動性股票（只標記不剔除）——保留完整訊號讓使用者自行判斷，剔除會破壞既有 consensus / SyncBareKStep 等下游消費行為
- 不回補歷史訊號的 avg_turnover（僅新寫入的訊號帶值，歷史列為 NULL）
- 不動 `fund_momentum`（由 `FundMomentumStep` 產生，非本步驟系列）與其他訊號表（`etf_signals`、`fund_signals`）
- 門檻不做 UI 可調（常數置於 step 檔頂部，調整走程式碼修改）

## Capabilities

### New Capabilities

- `strategy-liquidity-filter`: 策略訊號流動性標記——pipeline 計算 20 日均成交值與低流動性旗標，前端顯示警示

### Modified Capabilities

(none — 既有策略訊號計算的 requirement 不變，本 change 為新增行為)

## Impact

- Affected specs: 新增 `strategy-liquidity-filter`
- Affected code:
  - New: supabase/migrations/20260715120000_add_liquidity_to_strategy_signals.sql
  - Modified: ETF/pipeline/steps/strategy_signal_step.py（計算 avg_turnover / liquidity_flag）
  - Modified: ETF/database/sql_storage.py（upsert_strategy_signals 增欄）
  - Modified: src/app/actions/getStrategySignals.ts（select 新欄位、cache key v2→v3）
  - Modified: src/lib/investment/strategyUtils.ts（StrategyStock 型別增欄）
  - Modified: src/app/investment/strategy/page.tsx（低流動性 badge）
  - Modified: ETF/tests 與 src 對應測試（strategy_signal_step、getStrategySignals）
