## 1. 前端：per-strategy 最新日期聚合

> 對應 spec 需求「策略選股頁以 per-strategy 最新日期聚合呈現」與 design 決策二：前端改 per-strategy 最新日期聚合（限近期視窗）。

- [x] [P] 1.1 實作需求「策略選股頁以 per-strategy 最新日期聚合呈現」：在 `getStrategySignals()`（未指定 date 時）改以單一查詢取近期視窗（具名常數，預設 14 個日曆日）內所有 `is_selected = true` 的列，於 Server 端依 `strategy_id` 分組、各取該策略最新日期的股票；頂層 `date` 取入選策略中的最新日期。回傳型別 `StrategySignalsResult` 維持不變。驗證：在「fund_momentum 日期較新、其餘策略較舊但皆在視窗內」的 mock 資料下，回傳 `strategies` 同時含新舊日期的策略。
- [x] [P] 1.2 保留 `getStrategySignals(date)` 顯式傳入日期時的精確比對行為。驗證：傳入特定日期時僅回傳該日期訊號的單元測試通過。
- [x] [P] 1.3 新增/更新 `getStrategySignals` 單元測試於 `src/app/actions/__tests__/`（或同目錄 `*.test.ts`），涵蓋：多策略不同日期皆顯示、視窗外策略不顯示、顯式日期精確比對三個情境。驗證：`yarn test -- --testPathPattern=getStrategySignals` 通過。

## 2. 後端：StrategySignalStep 全空告警

> 對應 spec 需求「配額耗盡事件記入 Pipeline Context」與 design 決策三：`StrategySignalStep` 全空時發告警。

- [x] [P] 2.1 實作需求「配額耗盡事件記入 Pipeline Context」（擴充全空告警）：在 `ETF/pipeline/steps/strategy_signal_step.py` 的 `execute()`，當所有現役策略跑完後 `all_rows` 為空時，於回傳前 append 一筆指明「策略訊號全空」與 `ctx.date_str` 的繁體中文告警至 `ctx.validation_warnings`；維持不 raise。個別單一策略回空/例外仍只 log + continue，不升級告警。驗證：見 2.2 測試。
- [x] [P] 2.2 於 `ETF/tests/test_strategy_signal_step.py` 新增測試：所有策略回空時 `ctx.validation_warnings` 新增一筆告警；至少一支策略有輸出時不因「全空」新增告警。驗證：`uv run pytest ETF/tests/test_strategy_signal_step.py` 通過。

## 3. CI：移除每日重複的策略執行

> 對應 spec 需求「每日策略訊號單一執行者」與 design 決策一：保留 `StrategySignalStep`，自每日 CI 移除 `run_strategies.py` 呼叫。

- [ ] [P] 3.1 實作需求「每日策略訊號單一執行者」：自 `.github/workflows/etf_daily.yml` 的 "Run ETF Tracker" step 移除 `uv run python ETF/run_strategies.py --days 5` 該行，保留 `main.py --days 30`；`run_strategies.py` 檔案保留不刪。驗證：`grep run_strategies .github/workflows/etf_daily.yml` 無輸出。

## 4. 驗證與收尾

- [ ] 4.1 全測試綠燈：`yarn test` 與 `uv run pytest ETF/` 通過，`yarn lint` 與 `uv run ruff check` 無新增錯誤。
- [ ] 4.2 手動驗證：本機開啟 `/investment/strategy`（或對著現有 `strategy_signals` 資料），確認 6/10 的 8 支現役策略卡片與 `fund_momentum` 同時顯示。驗證：頁面策略視角顯示多於一支策略卡片。
