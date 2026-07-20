## MODIFIED Requirements

### Requirement: 策略訊號連續停更升級告警

`StrategySignalStep` 執行後，SHALL 檢查 `StrategySignalStep` 系列策略（即 `ALL_STRATEGIES` 的 `strategy_id`，排除 `FundMomentumStep` 產生的 `fund_momentum`）在 `strategy_signals` 中的最新成功寫入日期。此系列策略的訊號日期軸對齊月營收揭露日（`monthly_revenue:當月營收` 資料的 index），每月月營收揭露完畢後到下月揭露前存在約 3 週的自然空窗期，SHALL NOT 在此空窗期內誤判為停更。

判斷基準 SHALL 以「距最新一次月營收揭露日的天數」為主，而非「距 server 當日的日曆天數」：

1. `StrategySignalStep` SHALL 嘗試取得 `monthly_revenue:當月營收` 資料的最新 index 日期（下稱「最新揭露日」）。
2. 若 `strategy_signals` 系列策略最新成功寫入日期已等於或晚於最新揭露日，代表訊號已跟上該期揭露，SHALL NOT 加入停更告警，即使距 server 當日超過門檻天數。
3. 若 `strategy_signals` 系列策略最新成功寫入日期早於最新揭露日，且兩者天數差距超過門檻（3 個日曆天），SHALL 於 `ctx.validation_warnings` 加入一筆繁體中文告警，指明已停更天數（以「距最新揭露日」計算）與最後成功寫入日期，透過既有 LINE 通知管道通知管理員。
4. 若取得最新揭露日的過程拋出例外（例如 FinLab 錯誤），`StrategySignalStep` SHALL 回退為現行「距 server 當日的日曆天數」判斷邏輯（門檻同為 3 個日曆天），不得因此邏輯本身失敗而永久壓抑停更告警。

若判斷結果為未停更，或本次執行成功寫入使最新日期即為當日，`StrategySignalStep` SHALL NOT 加入該停更告警。此「連續停更」告警與既有「當次全空」告警為兩種獨立告警，兩者 SHALL 能於同一次執行同時存在。

#### Scenario: 月營收揭露空窗期不誤判停更

- **GIVEN** server 當日為 2026-07-20；`monthly_revenue:當月營收` 最新揭露日為 2026-07-13；`strategy_signals` 系列策略最新成功寫入日期為 2026-07-13（與最新揭露日相同）
- **WHEN** `StrategySignalStep` 執行完畢
- **THEN** `ctx.validation_warnings` 不因「連續停更」原因新增告警，即使距 server 當日已達 7 天

#### Scenario: 新一期揭露已出現但訊號未跟上，判定為真實停更

- **GIVEN** server 當日為 2026-08-15；`monthly_revenue:當月營收` 最新揭露日為 2026-08-12；`strategy_signals` 系列策略最新成功寫入日期仍為 2026-07-13（早於最新揭露日超過 3 天）
- **WHEN** `StrategySignalStep` 執行完畢
- **THEN** `ctx.validation_warnings` 新增一筆指明「距最新揭露日已停更 30 天、最後成功寫入日期 2026-07-13」意涵的告警字串

#### Scenario: 取得最新揭露日失敗時回退為距今日曆天判斷

- **WHEN** `StrategySignalStep` 嘗試取得 `monthly_revenue:當月營收` 最新 index 時拋出例外
- **THEN** `StrategySignalStep` 回退使用「距 server 當日超過 3 個日曆天」的既有判斷邏輯，不因取得揭露日失敗而略過停更檢查

#### Scenario: 停更在門檻內不告警

- **WHEN** `StrategySignalStep` 系列策略最新成功寫入日期距判斷基準（最新揭露日或 server 當日，依前述規則擇一）不超過 3 個日曆天
- **THEN** `ctx.validation_warnings` 不因「連續停更」原因新增告警

#### Scenario: 本次正常寫入不告警

- **WHEN** `StrategySignalStep` 本次執行成功寫入當日訊號，使系列策略最新日期即為當日
- **THEN** `ctx.validation_warnings` 不因「連續停更」原因新增告警
