## Why

策略選股頁（`/investment/strategy`）目前只顯示股票代號與分數，無法判斷個股所屬產業族群，使用者無從判斷策略持股的產業集中度或族群輪動方向。`stock_basic_info.industry` 欄位全為 NULL，需要先同步 FinLab 的產業分類資料。

## What Changes

- **FinLab 產業分類同步**：`SyncCompanyStep` 在同步公司基本資料時，一併從 FinLab 寫入 `stock_basic_info.industry`（中文產業名稱，例如「半導體」、「電子零組件」）
- **Server Action 擴充**：`getStrategySignals` JOIN `stock_basic_info`，在每支股票資料中附帶 `name` 與 `industry` 欄位
- **型別擴充**：`StrategyStock` 新增 `name?: string` 與 `industry?: string` 欄位
- **UI 顯示**：`StrategySignalCard` 在每支股票旁顯示中文名稱與產業標籤

## Non-Goals

- 不新增族群維度的篩選或排序功能（族群分析已有 `/investment/sectors` 頁面）
- 不改動策略計算邏輯（`run_strategies.py`）
- 不對 `industry` 做自訂分類映射，直接使用 FinLab 原始產業字串

## Capabilities

### New Capabilities

- `strategy-stock-industry`: 策略選股股票顯示中文名稱與產業族群標籤

### Modified Capabilities

- `strategy-signal-compute`: `StrategyStock` 型別新增 `name` 與 `industry` 欄位，Server Action 查詢加入 JOIN

## Impact

- Affected specs: strategy-stock-industry（新增）、strategy-signal-compute（修改）
- Affected code:
  - Modified: `ETF/pipeline/steps/sync_company_step.py`
  - Modified: `src/app/actions/getStrategySignals.ts`
  - Modified: `src/lib/investment/strategyUtils.ts`
  - Modified: `src/components/features/StrategySignalCard.tsx`
