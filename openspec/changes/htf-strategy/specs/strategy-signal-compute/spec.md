## ADDED Requirements

### Requirement: htf_momentum 策略前端識別符
`src/lib/investment/strategyUtils.ts` 的 `StrategyId` union type SHALL 包含 `'htf_momentum'`。

#### Scenario: StrategyId 型別包含新策略
- **WHEN** 前端 TypeScript 編譯
- **THEN** `StrategyId` 可賦值 `'htf_momentum'` 且不產生型別錯誤

#### Scenario: strategy_signals 表有 htf_momentum 資料
- **WHEN** CI 每日 Pipeline 執行完畢
- **THEN** `strategy_signals` 表存在當日 `strategy_id = 'htf_momentum'` 的記錄（若當日有符合條件的標的）
