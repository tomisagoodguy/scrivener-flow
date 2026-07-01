## MODIFIED Requirements

### Requirement: 策略選股頁以 per-strategy 最新日期聚合呈現

`getStrategySignals()` 在未指定 `date` 參數時，SHALL 於「近期視窗」內取得所有 `is_selected = true` 的訊號列。該視窗 SHALL 以 server 當日日期為錨、往前一段固定日曆天數（對齊 `strategy_signals` 的 DB 保留期，預設 30 天，以具名常數標示），而**非**以資料表中的全域最新日期為錨。取得後於 Server 端依 `strategy_id` 分組，每組僅取該策略在視窗內最新日期的股票呈現。每支在視窗內有訊號的現役策略 SHALL 各自出現於回傳結果，不因其他策略日期較新（將全域最新日期推前）而被過濾掉。

回傳型別 `StrategySignalsResult`（`{ date, strategies[] }`）SHALL 維持不變；其中頂層 `date` 取所有入選策略中的最新日期。當顯式傳入 `date` 參數時，SHALL 維持精確比對該日期的既有行為。

#### Scenario: 不同更新節奏的策略皆顯示

- **WHEN** `strategy_signals` 中某些策略最新日期較新、另一些較舊，但皆落在以當日為錨的近期視窗（30 天）內
- **THEN** `getStrategySignals()` 回傳的 `strategies` 包含視窗內所有有訊號的策略，各策略內容為其自身最新日期的入選股票

##### Example: fund_momentum 每日更新、其餘策略較舊仍在保留期內

- **GIVEN** server 當日為 2026-07-01；`fund_momentum` 最新訊號日期為 2026-06-30，`capital_layer` 與 `htf_gvi` 最新訊號日期為 2026-06-10（距當日 21 天，落在 14 天外但在 30 天保留期內）
- **WHEN** 呼叫 `getStrategySignals()`（未指定 date）
- **THEN** 回傳 `strategies` 同時含 `fund_momentum`（2026-06-30 股票）、`capital_layer` 與 `htf_gvi`（2026-06-10 股票）；頂層 `date` 為 2026-06-30

#### Scenario: 更新較慢的策略不因較快策略推前全域最新日期而被擠出

- **WHEN** `fund_momentum` 每日更新使資料表全域最新日期為當日，另一支策略最新日期早於當日 14 天但仍在 30 天保留期內
- **THEN** 該較慢策略仍出現於 `getStrategySignals()` 回傳結果，不因 `fund_momentum` 推前全域最新日期而被過濾

#### Scenario: 視窗外的策略不顯示

- **WHEN** 某策略最新訊號日期早於以當日為錨的近期視窗起點（超過 30 天）
- **THEN** 該策略不出現於回傳結果，且不造成錯誤

#### Scenario: 顯式日期維持精確比對

- **WHEN** 呼叫 `getStrategySignals(date)` 並傳入特定日期
- **THEN** 僅回傳該日期的訊號，行為與既有一致

