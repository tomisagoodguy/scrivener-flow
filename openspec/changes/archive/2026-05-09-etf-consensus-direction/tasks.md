## 1. 資料庫 Migration

- [x] 1.1 新增 migration 檔 `supabase/migrations/20260509000000_add_consensus_counts_to_overlap.sql`：設計決策「DB 欄位加在 `etf_stock_overlap` 而非另建表」，使用 `ADD COLUMN IF NOT EXISTS` 加入 `consensus_buy_count INTEGER NOT NULL DEFAULT 0` 與 `consensus_sell_count INTEGER NOT NULL DEFAULT 0`（對應 Requirement: Database migration adds consensus columns）

## 2. Python 後端

- [x] [P] 2.1 在 `ETF/processors/diff_engine.py` 新增常數 `CONSENSUS_WEIGHT_THRESHOLD = 0.05`，位置在現有 `WEIGHT_CHANGE_THRESHOLD` 下方，不修改現有邏輯；設計決策「閾值：0.05pp（獨立常數 `CONSENSUS_WEIGHT_THRESHOLD`）」（對應 Requirement: Consensus direction threshold constant defined in diff_engine）
- [x] [P] 2.2 修改 `ETF/pipeline/steps/overlap_compute_step.py`：在現有 upsert 完成後匯入 `CONSENSUS_WEIGHT_THRESHOLD`，設計決策「計算時間窗口：固定 7 個自然日」（`target_date - INTERVAL '7 days'`）查詢 `etf_diff_logs`，設計決策「計算位置：`OverlapComputeStep` 內串接而非獨立步驟」，以 `COUNT(DISTINCT etf_code)` 分別統計 BUY/IN 與 SELL/OUT（abs(diff_weight) >= 0.05），並 upsert 至 `consensus_buy_count`、`consensus_sell_count`（對應 Requirement: Consensus direction counts persisted in etf_stock_overlap）

## 3. 前端

- [x] 3.1 修改 `src/app/investment/consensus/page.tsx`：擴充 `OverlapRow` 介面新增 `consensus_buy_count: number` 與 `consensus_sell_count: number`；更新 `fetchConsensus` select 納入兩個新欄；在表格新增「共識動向」欄，套用設計決策：前端：僅顯示非零計數——非零 `consensus_buy_count` 顯示 rose badge（`X買`），非零 `consensus_sell_count` 顯示 emerald badge（`X賣`），皆為零則空白（對應 Requirement: Consensus direction displayed on consensus page）

## 4. 驗證

- [x] 4.1 本地執行 `uv run python ETF/main.py --dry-run` 確認 `OverlapComputeStep` 無語法錯誤
- [x] 4.2 執行 `yarn build` 確認 TypeScript 編譯通過（新 `OverlapRow` 欄位型別正確）
- [x] 4.3 手動查詢 DB 確認 `etf_stock_overlap` 最新日期 row 的 `consensus_buy_count` / `consensus_sell_count` 非全零（至少有部分股票有值）
