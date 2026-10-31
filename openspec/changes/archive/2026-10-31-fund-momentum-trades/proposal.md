## Why

策略圖表視角的「買」「賣」標記與持有背景來自 `strategy_trades`，但「投信買超動能」（`fund_momentum`）不是 `BaseStrategy`：`FundMomentumStep` 每天只計算最新一日名單並寫入 `strategy_signals`，從未產生持有部位，`StrategyTradeStep` 因此沒有它的紀錄。2026-10-30 圖表的 71 支股票全部來自此策略，多數因而沒有任何標記。

## What Changes

- `FundMomentumStep` 另外計算近 300 個交易日每天的入選名單（與每日訊號同一套條件：投信連買 ≥ 3 天且 20 日買超全市場百分位 ≥ 90），作為 `fund_momentum` 的持有部位歷史。
- 以既有持有期間規則推導並寫入 `strategy_trades`：入選日為進場訊號日、落選日為出場訊號日，皆以隔一交易日開盤價計價。
- 把 `StrategyTradeStep` 的「推導 → 計價 → upsert → 清理」抽成共用函式，兩個步驟共用；步驟順序不變。

## Non-Goals (optional)

（見 design.md）

## Capabilities

### New Capabilities

(none)

### Modified Capabilities

- `fund-momentum-signal`: 新增「Fund momentum holding periods」需求。

## Impact

- Affected specs: `fund-momentum-signal`（ADDED）
- Affected code:
  - ETF/pipeline/steps/fund_momentum_step.py（新增 `compute_selection_history`，寫完訊號後推導持有期間）
  - ETF/pipeline/steps/strategy_trade_step.py（抽出 `persist_strategy_trades`）
  - ETF/tests/test_fund_momentum_step.py、ETF/tests/test_strategy_trade_step.py
- DB：只寫既有 `strategy_trades` 表，無 schema 變更；下一次每日 pipeline 執行即回補近一年紀錄。
