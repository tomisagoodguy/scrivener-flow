## ADDED Requirements

### Requirement: 策略訊號連續停更升級告警

`StrategySignalStep` 執行後，SHALL 檢查 `StrategySignalStep` 系列策略（即 `ALL_STRATEGIES` 的 `strategy_id`，排除 `FundMomentumStep` 產生的 `fund_momentum`）在 `strategy_signals` 中的最新成功寫入日期。若該最新日期距 server 當日超過門檻（3 個日曆天）——含本次因 FinLab 配額 skip、例外或全空而未寫入的情況——`StrategySignalStep` SHALL 於 `ctx.validation_warnings` 加入一筆繁體中文告警，指明已停更天數與最後成功寫入日期，透過既有 LINE 通知管道通知管理員。

若該最新日期在門檻內，或本次執行成功寫入使最新日期即為當日，`StrategySignalStep` SHALL NOT 加入該停更告警。此「連續停更」告警與既有「當次全空」告警為兩種獨立告警，兩者 SHALL 能於同一次執行同時存在。

#### Scenario: 連續停更超過門檻時升級告警

- **WHEN** `StrategySignalStep` 系列策略在 `strategy_signals` 的最新成功寫入日期距 server 當日超過 3 個日曆天
- **THEN** `ctx.validation_warnings` 新增一筆指明停更天數與最後成功寫入日期的告警字串，步驟不 raise，Pipeline 繼續執行

##### Example: 停更 3 週觸發告警

- **GIVEN** server 當日為 2026-07-01；`StrategySignalStep` 系列策略最新成功寫入日期為 2026-06-10（距當日 21 天），本次執行因配額耗盡未寫入
- **WHEN** `StrategySignalStep` 執行完畢
- **THEN** `ctx.validation_warnings` 含一筆指明「已停更 21 天、最後成功日期 2026-06-10」意涵的告警字串

#### Scenario: 停更在門檻內不告警

- **WHEN** `StrategySignalStep` 系列策略最新成功寫入日期距 server 當日不超過 3 個日曆天
- **THEN** `ctx.validation_warnings` 不因「連續停更」原因新增告警

#### Scenario: 本次正常寫入不告警

- **WHEN** `StrategySignalStep` 本次執行成功寫入當日訊號，使系列策略最新日期即為當日
- **THEN** `ctx.validation_warnings` 不因「連續停更」原因新增告警

