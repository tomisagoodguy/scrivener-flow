## 1. 前端視窗修正（策略選股頁以 per-strategy 最新日期聚合呈現）

- [x] 1.1 [P] 實作需求「策略選股頁以 per-strategy 最新日期聚合呈現」：在 `src/app/actions/getStrategySignals.ts` 將近期視窗改以 server 當日日期為錨、寬度改為對齊 DB 保留期的具名常數（30 天），取代原本以 `strategy_signals` 全域 `maxDate` 為錨、14 天寬度的邏輯；per-strategy 各取自身視窗內最新日期、頂層 `date` 仍取入選策略最新日期。行為驗證：`fund_momentum` 最新為當日、另一策略最新為 21 天前（在 30 天內）時，回傳 `strategies` 仍含該較舊策略。
- [x] 1.2 [P] 在 `src/app/actions/__tests__/getStrategySignals.test.ts` 新增/更新測試涵蓋「更新較慢的策略在保留期內仍顯示」與「視窗外（>30 天）策略不顯示」與「顯式 date 精確比對不變」。驗證：`yarn test --testPathPatterns getStrategySignals` 全數通過。

## 2. 後端停更告警（策略訊號連續停更升級告警）

- [x] 2.1 [P] 實作需求「策略訊號連續停更升級告警」：在 `ETF/pipeline/steps/strategy_signal_step.py` 於步驟結尾查詢 `StrategySignalStep` 系列策略（`ALL_STRATEGIES` 的 `strategy_id`，排除 `fund_momentum`）在 `strategy_signals` 的最新成功寫入日期，若距當日超過 3 個日曆天則在 `ctx.validation_warnings` 加入指明停更天數與最後成功日期的繁體中文告警；門檻內或本次已寫入當日則不加入。行為驗證：停更 21 天且本次配額 skip 時 `ctx.validation_warnings` 出現停更告警，且與既有「當次全空」告警可並存。
- [x] 2.2 [P] 在 `ETF/tests/test_strategy_signal_step.py` 新增測試涵蓋「連續停更超過門檻時升級告警」「停更在門檻內不告警」「本次正常寫入不告警」三情境（以 mock 最新日期查詢）。驗證：`uv run pytest ETF/tests/test_strategy_signal_step.py` 通過。

## 3. 驗證

- [x] 3.1 執行 `yarn test --testPathPatterns getStrategySignals` 與 `uv run pytest ETF/tests/test_strategy_signal_step.py`，兩者皆綠；`yarn lint` 與 `uv run ruff check` 無新錯誤。

