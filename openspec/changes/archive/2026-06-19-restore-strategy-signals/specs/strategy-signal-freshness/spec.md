## ADDED Requirements

### Requirement: 策略選股頁以 per-strategy 最新日期聚合呈現

`getStrategySignals()` 在未指定 `date` 參數時，SHALL 於「近期視窗」（自當日往前一段固定日曆天數，預設 14 天，以具名常數標示）內取得所有 `is_selected = true` 的訊號列，並於 Server 端依 `strategy_id` 分組，每組僅取該策略在視窗內最新日期的股票呈現。每支在視窗內有訊號的現役策略 SHALL 各自出現於回傳結果，不因其他策略日期較新而被過濾掉。

回傳型別 `StrategySignalsResult`（`{ date, strategies[] }`）SHALL 維持不變；其中頂層 `date` 取所有入選策略中的最新日期。當顯式傳入 `date` 參數時，SHALL 維持精確比對該日期的既有行為。

#### Scenario: 不同更新節奏的策略皆顯示

- **WHEN** `strategy_signals` 中某些策略最新日期較新、另一些較舊，但皆落在近期視窗內
- **THEN** `getStrategySignals()` 回傳的 `strategies` 包含視窗內所有有訊號的策略，各策略內容為其自身最新日期的入選股票

##### Example: fund_momentum 較新、其餘策略較舊

- **GIVEN** `fund_momentum` 最新訊號日期為 2026-06-16，`capital_layer` 與 `htf_gvi` 最新訊號日期為 2026-06-10，皆在近 14 日視窗內
- **WHEN** 呼叫 `getStrategySignals()`（未指定 date）
- **THEN** 回傳 `strategies` 同時含 `fund_momentum`（2026-06-16 股票）、`capital_layer` 與 `htf_gvi`（2026-06-10 股票）；頂層 `date` 為 2026-06-16

#### Scenario: 視窗外的策略不顯示

- **WHEN** 某策略最新訊號日期早於近期視窗起點
- **THEN** 該策略不出現於回傳結果，且不造成錯誤

#### Scenario: 顯式日期維持精確比對

- **WHEN** 呼叫 `getStrategySignals(date)` 並傳入特定日期
- **THEN** 僅回傳該日期的訊號，行為與既有一致

### Requirement: 每日策略訊號單一執行者

每日 CI SHALL 對每支現役策略每日只執行一次完整 `get_positions()` 運算（單次 `StrategyDataCache` 建立），由 `main.py` 的 `StrategySignalStep` 擔任唯一寫入者。每日 CI 工作流 SHALL NOT 再額外呼叫 `run_strategies.py`。`run_strategies.py` 檔案 SHALL 保留供手動補跑歷史訊號之用。

#### Scenario: 每日 CI 不重複執行策略運算

- **WHEN** daily ETF workflow 執行
- **THEN** 工作流的執行指令不含 `run_strategies.py` 呼叫，現役策略僅由 `main.py` 的 `StrategySignalStep` 執行並寫入 `strategy_signals`

#### Scenario: 策略股 K 線同步副作用保留

- **WHEN** `StrategySignalStep` 選出股票
- **THEN** 這些股票被加入 `ctx.secondary_stock_codes`，由後續的 `SyncOHLCVStep` 於同一次 pipeline 內同步其 K 線/股價
