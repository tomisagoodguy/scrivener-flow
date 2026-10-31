## Context

`StrategyTradeStep`（排在 `StrategySignalStep` 之後、`SyncOHLCVStep` 之前）讀 `ctx.strategy_positions` 推導持有期間。`FundMomentumStep` 排在 `SyncOHLCVStep` 之後很遠處（spec「Step placement in pipeline orchestrator」要求在 `SyncOHLCVStep` 之後），只算最新一日；它用 FinLab `institutional_investors_trading_summary:投信買賣超股數` 與 `price:成交股數`。

## Goals / Non-Goals

**Goals:**

- `fund_momentum` 在 `strategy_trades` 有近一年持有期間，規則與其他策略一致（入選日隔日開盤買、落選日隔日開盤賣）。
- 不改步驟順序、不改每日訊號計算結果。

**Non-Goals:**

- 不改前端（圖表已讀全部策略的 `strategy_trades`）。
- 不在本地手動回補；由下一次每日 pipeline 回補。
- 不調整入選門檻。

## Decisions

### 共用持有期間持久化函式，不調換步驟順序

把 `StrategyTradeStep.execute` 的主體抽成 `persist_strategy_trades(positions_by_strategy, run_date, cache, sql_storage) -> int`（推導、計價、upsert、只清理推導成功的策略、刪除過期），`StrategyTradeStep` 與 `FundMomentumStep` 都呼叫它。

替代方案：把 `FundMomentumStep` 移到 `StrategyTradeStep` 之前——違反既有 spec 的步驟位置要求，捨棄。

### 向量化計算入選歷史，與每日訊號同口徑

`compute_selection_history(fund_df)`：取最後 320 列（300 + 20 列給 20 日滾動），`fund_20d = rolling(20, min_periods=1).sum()`，`score = (fund_20d.rank(axis=1, pct=True) * 100).round().fillna(0)`；連續天數逐欄在 `dropna()` 後的序列上以「非正值重置的累加」計算，再 reindex 回完整日期並 forward-fill（與 `_compute_consec_days` 對最新可得值的口徑相同）；`selected = (consec >= 3) & (score >= 90)`，回傳最後 300 列。截斷只影響窗口開頭的連續天數，距保留期起點約 55 個交易日（估計：365 曆日 ≈ 245 交易日），不影響結果。

## Implementation Contract

- `compute_selection_history(fund_df: pd.DataFrame) -> pd.DataFrame`（bool，index＝日期、columns＝股票）；最後一列與每日 `is_selected` 相同。
- `FundMomentumStep._run` 在 upsert 訊號與通知之後呼叫 `_persist_trades`，以 `{"fund_momentum": history}` 呼叫 `persist_strategy_trades`；`cache = ctx.strategy_data_cache or StrategyDataCache()`；例外 log error、不 re-raise。dry-run 時整步驟已 skip。
- `StrategyTradeStep` 行為不變（既有 `test_strategy_trade_step.py` 不改斷言即通過）。
- 驗收：pytest 涵蓋 spec 範例表三列、最後一列一致性、選取段→持有期間（mock sql_storage 斷言 upsert 收到 `fund_momentum` 列）、推導失敗隔離；`uv run ruff check` 通過。
- 範圍外：前端、手動回補、門檻調整。

## Risks / Trade-offs

- [`StrategyDataCache()` 建構會載入價格資料，增加 FundMomentumStep 耗時] → 優先重用 `ctx.strategy_data_cache`；StrategyTradeStep 已是同樣做法。
- [名單每日變動造成大量 1–3 天短持有] → 使用者已選擇「入選買、落選賣」，接受。

## Migration Plan

部署後下一次每日 pipeline 自動寫入近一年紀錄；回滾 revert commit，再刪除 `strategy_id = 'fund_momentum'` 的 `strategy_trades` 列（需使用者確認）。

## Open Questions

(none)
