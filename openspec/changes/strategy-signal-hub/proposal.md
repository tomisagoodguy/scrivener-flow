## Why

量化交易需要每日確認策略持倉，同時觀察 00981A 經理人（瑤姐）是否對相同標的有加減碼動作，以強化或過濾進場信號。目前策略只能手動跑 FinLab 腳本查看結果，無法在網頁即時瀏覽，也無法與已追蹤的 ETF 持倉變化自動交叉比對。

## What Changes

- 新增 Python 策略框架，允許多個 FinLab 策略以插件方式接入，每日自動計算並將結果存入 Supabase
- 新增 `strategy_signals` 資料表，記錄每支策略每日的選股結果與各條件通過狀態
- 新增前端頁面 `/investment/strategy`，依策略分組顯示今日持倉，並標註 00981A（瑤姐）對同標的的持倉與近期動向

## Non-Goals

- 不實作自動下單或券商介接
- 不修改現有 ETF Pipeline 的爬蟲或快照邏輯
- 不在此 change 實作策略績效回測頁面（回測留給未來 change）
- 不處理非台股市場

## Capabilities

### New Capabilities

- `strategy-runner-framework`: Python 可插件化策略框架，每個策略實作 `BaseStrategy` 介面，統一由 Pipeline Step 驅動執行並將日頻信號存入 Supabase `strategy_signals` 表
- `strategy-signal-display`: 前端投資頁面，依策略分組顯示今日選股清單，每支股票標註 00981A 的持倉狀態（持有中 / 近期加碼 / 近期減碼 / 未持有）

### Modified Capabilities

（無現有 spec 需要變更）

## Impact

- Affected specs: strategy-runner-framework（新）、strategy-signal-display（新）
- Affected code:
  - New:
    - `ETF/strategies/__init__.py`
    - `ETF/strategies/base_strategy.py`
    - `ETF/strategies/super8888.py`
    - `ETF/pipeline/steps/strategy_signal_step.py`
    - `supabase/migrations/20260516120000_add_strategy_signals.sql`
    - `src/app/investment/strategy/page.tsx`
    - `src/app/investment/strategy/loading.tsx`
    - `src/app/actions/getStrategySignals.ts`
    - `src/components/features/StrategySignalCard.tsx`
  - Modified:
    - `ETF/pipeline/orchestrator.py`
