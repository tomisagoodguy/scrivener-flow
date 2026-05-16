## 1. 資料庫 Migration

- [x] 1.1 資料表設計：strategy_signals — 新增 `supabase/migrations/20260516120000_add_strategy_signals.sql`，定義 `strategy_signals` 表（BIGSERIAL PK、`strategy_id` TEXT、`date` DATE、`stock_id` TEXT、`score` FLOAT nullable、`is_selected` BOOLEAN、`conditions` JSONB nullable、`created_at` TIMESTAMPTZ DEFAULT NOW()），並加入 UNIQUE constraint `(strategy_id, date, stock_id)` 以確保 strategy_signals table stores daily signals 的 upsert idempotency

## 2. Python 策略框架

- [x] [P] 2.1 策略介面設計：BaseStrategy 抽象類別 — 建立 `ETF/strategies/base_strategy.py`：定義 `BaseStrategy` 抽象類別，含 `strategy_id: str`、`description: str` 屬性與 `get_positions() -> FinlabDataFrame` 抽象方法；BaseStrategy interface
- [x] [P] 2.2 建立 `ETF/strategies/super8888.py`：從 `ETF/strategies/super8888_draft.py` 的 `build_position()` 函式取出完整策略邏輯，包裝進 `Super8888Strategy(BaseStrategy)` 類別，`strategy_id = 'super8888'`，`description = '超級8888 量化選股'`；`get_positions()` 直接回傳 `build_position()` 的結果（positionJ）；完成後可刪除 `ETF/strategies/super8888_draft.py`
- [x] 2.3 建立 `ETF/strategies/__init__.py`，定義 `ALL_STRATEGIES: list[BaseStrategy] = [Super8888Strategy()]`；Strategy auto-discovery via registry

## 3. Pipeline Step

- [x] 3.1 Pipeline 整合：StrategySignalStep 為輔助步驟 — 建立 `ETF/pipeline/steps/strategy_signal_step.py`：`StrategySignalStep` 繼承現有 Step 基底類別，遍歷 `ALL_STRATEGIES`，呼叫每個策略的 `get_positions()`，將最新一行轉為 `(strategy_id, date, stock_id, score, is_selected, conditions)` 並 upsert 至 `strategy_signals`；單一策略失敗只 log error 繼續（不 raise）；StrategySignalStep is an auxiliary pipeline step
- [x] 3.2 在 `ETF/pipeline/orchestrator.py` 於 `SaveSnapshotStep` 之後、`NotifyStep` 之前插入 `StrategySignalStep()`

## 4. Server Action

- [x] 4.1 前端查詢：Server Action + Supabase JOIN — 建立 `src/app/actions/getStrategySignals.ts`：`getStrategySignals(date?: string)` 查詢 `strategy_signals` 取最新 date 的 `is_selected=true` 行，JOIN `etf_holdings_snapshot`（00981A）與 `etf_diff_logs`（最近 7 日 00981A），依 00981A 動向標記四類計算每支股票的 movement label（`adding`/`reducing`/`holding`/`none`），回傳 `{ date, strategies: { id, description, stocks: { stock_id, score, movement }[] }[] }`；getStrategySignals Server Action aggregates signals and ETF movement

## 5. 前端元件

- [x] [P] 5.1 建立 `src/components/features/StrategySignalCard.tsx`（≤150行）：接收單一策略資料，渲染持股清單與 00981A movement badge（`adding`→rose、`reducing`→emerald、`holding`→gray、`none`→slate）；Per-stock 00981A movement annotation
- [x] [P] 5.2 建立 `src/app/investment/strategy/loading.tsx`：skeleton loading UI
- [x] 5.3 建立 `src/app/investment/strategy/page.tsx`（Server Component，≤150行）：呼叫 `getStrategySignals()`，渲染各策略 `StrategySignalCard`，頁面頂部顯示資料日期，底部顯示月營收滯後說明文字；Strategy signal page at /investment/strategy；Monthly revenue condition data-freshness notice

## 6. 測試

- [x] [P] 6.1 為 `BaseStrategy` 介面與 `StrategySignalStep` 寫單元測試：驗證策略拋出例外時 step 不 re-raise（Strategy raises an exception）；Daily upsert on repeated pipeline run 邏輯驗證
- [x] [P] 6.2 為 `getStrategySignals` Server Action 寫單元測試：mock Supabase 回傳，驗證 movement label 計算正確（四種情境各一個 test case）；Per-stock 00981A movement annotation
