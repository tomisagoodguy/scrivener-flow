## 1. 共用持久化

- [x] 1.1 在 `ETF/pipeline/steps/strategy_trade_step.py` 抽出 `persist_strategy_trades(positions_by_strategy, run_date, cache, sql_storage)`，`StrategyTradeStep.execute` 改呼叫它且行為不變（決策：共用持有期間持久化函式，不調換步驟順序）。驗證：`uv run pytest ETF/tests/test_strategy_trade_step.py` 既有測試全綠。

## 2. 投信買超動能持有期間

- [x] 2.1 [after: 1.1] 在 `ETF/pipeline/steps/fund_momentum_step.py` 新增 `compute_selection_history`，`_run` 寫完訊號後以 `{"fund_momentum": history}` 呼叫 `persist_strategy_trades`，失敗只 log（需求：Fund momentum holding periods；決策：向量化計算入選歷史，與每日訊號同口徑）。驗證：`uv run pytest ETF/tests/test_fund_momentum_step.py` 新增案例綠燈（spec 範例表三列、最後一列與每日 is_selected 一致、選取段→持有期間、推導失敗隔離）；`uv run ruff check` 改動檔通過。
- [x] 2.2 [after: 2.1] 本地以真實 FinLab 資料執行 `compute_selection_history`（不寫 DB），核對最新一日入選數與 `strategy_signals` 2026-10-30 的 `fund_momentum` 入選數一致，並列出推導出的持有期間數；結果寫回本任務。
  - 實測紀錄（2026-10-31）：`PYTHONPATH=<repo> uv run python scratchpad/fm_check.py`（FinLab 快取憑證，未寫 DB）。投信買賣超資料截至 2026-10-30、與成交股數取共同欄位後執行 `compute_selection_history`：最後一日 2026-10-30 入選 71 支，與 `strategy_signals` 當日 `fund_momentum` is_selected 71 支一致。`derive_trade_episodes`（since = 2025-10-30）推導 2848 段持有期間，其中持有中 71 段；已出場段落持有曆日中位數 4 天。3189 最近三段：2026-09-11→09-14、09-30→10-06、10-15→持有中。
  - `uv run pytest ETF/tests/test_fund_momentum_step.py ETF/tests/test_strategy_trade_step.py ETF/tests/test_strategy_trades.py` 45 tests 全綠；`uv run ruff check` 改動檔僅 6 個既有錯誤（HEAD 版即存在：測試檔 3 個 E401、步驟檔未使用的 timedelta／text／finlab import），本次新增程式碼無新錯誤。
