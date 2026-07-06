## 1. 資料庫 Migration

- [x] 1.1 建立 `ETF/supabase/migrations/20260512000001_etf_frontrunning_stats.sql`：表欄位 `(id serial PK, etf_code text, stock_code text, event_date date, delta_shares numeric, prev_shares numeric, cur_shares numeric, delta_pct numeric, is_new_position bool, r_t0 numeric, r_t1 numeric, r_t2 numeric, created_at timestamptz)`，UNIQUE `(etf_code, stock_code, event_date)`
- [x] 1.2 建立 `ETF/supabase/migrations/20260512000002_etf_active_share.sql`：表欄位 `(id serial PK, computed_date date, etf_a text, etf_b text, active_share_pct numeric, as_vs_mean_a numeric, as_vs_mean_b numeric)`，UNIQUE `(computed_date, etf_a, etf_b)` 且 CHECK `etf_a < etf_b`
- [x] 1.3 建立 `ETF/supabase/migrations/20260512000003_etf_cumulative_drag.sql`：表欄位 `(id serial PK, etf_code text, computed_date date, n_events int, days_span int, events_per_year numeric, annual_excess_volume_kshares_per_yi numeric, annual_manager_drag_kshares_per_yi numeric)`，UNIQUE `(etf_code, computed_date)`
- [x] 1.4 建立 `ETF/supabase/migrations/20260512000004_etf_matched_pairs.sql`：detail 表欄位 `(id serial PK, computed_date date, stock_code text, stock_name text, n_active_events int, n_passive_events int, active_median_r numeric, passive_median_r numeric, diff_median numeric)`，UNIQUE `(computed_date, stock_code)`；summary 表 `etf_matched_pairs_summary` 欄位 `(computed_date date PK, n_pairs int, n_active_higher int, n_passive_higher int, median_of_diffs numeric)`
- [x] 1.5 建立 `ETF/supabase/migrations/20260512000005_etf_aum_series.sql`：表欄位 `(id serial PK, etf_code text, data_date date, aum_yi numeric, nav numeric, units_yi numeric, inflow_yi numeric, cumulative_inflow_yi numeric, inflow_share_of_growth numeric)`，UNIQUE `(etf_code, data_date)`
- [x] 1.6 用 `uv run python ETF/ensure_tables.py` 或直接在 Supabase SQL editor 執行上述五支 migration 建表，確認表存在

## 2. FrontrunningStep 實作（etf-frontrunning-analysis spec）

- [x] 2.1 建立 `ETF/pipeline/steps/frontrunning_step.py`，繼承 `BaseStep`，class `FrontrunningStep`
- [x] 2.2 實作 `build add-events from holdings snapshot`：查 `etf_holdings_snapshot` 按 `(etf_code, data_date)` 排序，兩兩比對同一 ETF 相鄰日期的 shares 差異，篩選 `delta_shares >= 100_000` 且 (`delta_pct >= 5%` 或 `is_new_position = true`)
- [x] 2.3 實作 `compute abnormal volume ratio using FinLab`：呼叫 `finlab.data.get("price:成交股數")`，對每個 add event 取 baseline 20 天 median，算 `r_t0`, `r_t1`, `r_t2`；不足 10 個非零值則設為 `null`
- [x] 2.4 實作 `persist results to etf_frontrunning_stats`：UPSERT ON CONFLICT `(etf_code, stock_code, event_date)` DO UPDATE
- [x] 2.5 確保 `step is auxiliary — failure must not halt pipeline`：整個 `run()` 用 try/except 包裹，catch 後 log error 並 return

## 3. ActiveShareStep 實作（etf-active-share spec）

- [x] 3.1 建立 `ETF/pipeline/steps/active_share_step.py`，class `ActiveShareStep`
- [x] 3.2 實作 `load latest TW-stock holdings per ETF`：讀 `etf_holdings_snapshot` 最新 `data_date` 的各 ETF 持股，過濾 TW 股票正則 `^\d{4}[A-Z]?$`，renormalize 至 100%；TW exposure < 50% 者排除並 log
- [x] 3.3 實作 `compute Active Share matrix`：計算 industry-mean 組合，對每對 ETF 算 `AS = 0.5 × Σ|w_A - w_B|`，確認輸出含 N×(N-1)/2 筆 pairwise 記錄
- [x] 3.4 實作 `persist results to etf_active_share`：UPSERT ON CONFLICT `(computed_date, etf_a, etf_b)`；寫入時確保 `etf_a < etf_b` lexicographically
- [x] 3.5 確保 `step is auxiliary — failure must not halt pipeline`：整個 `run()` try/except，log and return

## 4. CumulativeDragStep 實作（etf-cumulative-drag spec）

- [x] 4.1 建立 `ETF/pipeline/steps/cumulative_drag_step.py`，class `CumulativeDragStep`
- [x] 4.2 實作 `compute per-event excess volume and manager drag`：重用 FrontrunningStep 產生的 add events（從 `etf_frontrunning_stats` 讀，或共用 helper），計算 `excess_volume_shares = max(r_t0-1, 0) × baseline_median_vol` 和 `manager_drag_shares = abs(delta_shares) × max(r_t0-1, 0)`
- [x] 4.3 實作 `annualize and normalize by AUM`：對每支 ETF 加總後 `× (365/days_span)`，再除以 `etf_aum_series` 最新 AUM（億元），取得 `annual_excess_volume_kshares_per_yi` 和 `annual_manager_drag_kshares_per_yi`；AUM 缺失時設 null
- [x] 4.4 實作 `persist results to etf_cumulative_drag`：UPSERT ON CONFLICT `(etf_code, computed_date)`
- [x] 4.5 確保 `step is auxiliary — failure must not halt pipeline`：try/except，log and return

## 5. MatchedPairsStep 實作（etf-matched-pairs spec）

- [x] 5.1 建立 `ETF/pipeline/steps/matched_pairs_step.py`，class `MatchedPairsStep`
- [x] 5.2 實作 `identify overlap stocks between active and passive ETF add events`：主動 ETF add events 從 `etf_frontrunning_stats` 讀；被動 ETF 以 FinLab `data.get("index_components:成分股")` 取 0050/0056 成分，計算其 delta，用相同門檻抽 passive add events；找兩邊都出現且各有 ≥2 events 的股票
- [x] 5.3 實作 `compute paired abnormal vol difference per stock`：對每個 overlap stock，算 `active_median_r`、`passive_median_r`、`diff_median`；產出 `n_active_higher`、`n_passive_higher`、`median_of_diffs`
- [x] 5.4 實作 `persist results to etf_matched_pairs`：UPSERT detail rows ON CONFLICT `(computed_date, stock_code)`；另 UPSERT 至 `etf_matched_pairs_summary` ON CONFLICT `computed_date`
- [x] 5.5 確保 `step is auxiliary — failure must not halt pipeline`：try/except，log and return

## 6. AumSyncStep 擴充（etf-aum-series spec）

- [x] 6.1 在 `ETF/pipeline/steps/aum_sync_step.py` 新增 `_sync_aum_series()` 方法，讀取 `etf_holdings_snapshot`，每日計算 AUM（`compute daily AUM from holdings snapshot`）：優先用 C_NTD weight denominator，fallback 用 market value
- [x] 6.2 實作 `derive net inflow from unit changes`：`inflow = Δunits × NAV`；第一個資料點 inflow 設為 0.0
- [x] 6.3 實作 `track cumulative inflow and growth attribution`：維護 running cumulative_inflow；計算 `inflow_share_of_growth`（分母為零或負時設 null）
- [x] 6.4 實作 `persist daily time-series to etf_aum_series`：UPSERT ON CONFLICT `(etf_code, data_date)`
- [x] 6.4a 確保 `AumSyncStep enhanced — existing behavior preserved`：新增邏輯只在現有 run() 末尾呼叫 `_sync_aum_series()`，不修改現有欄位寫入邏輯；執行前後讀取 `etf_meta`（或現有目標表）的現有欄位值應保持一致
- [x] 6.5 確保 `step is auxiliary — failure must not halt pipeline`：新增的 `_sync_aum_series()` 用 try/except 包裹，不影響現有邏輯

## 7. Pipeline Orchestrator 整合

- [x] 7.1 在 `ETF/pipeline/orchestrator.py` 匯入並註冊 `FrontrunningStep`、`CumulativeDragStep`、`MatchedPairsStep` 至每日執行序列（輔助步驟，排在 `SaveSnapshotStep` 之後）
- [x] 7.2 將 `ActiveShareStep` 設為週執行（每週一執行或 `weekday == 0`，其他天 skip）；在 orchestrator 加入判斷邏輯
- [x] 7.3 確認 orchestrator 中所有新 step 都有 try/except 保護，失敗不中斷後續 step

## 8. 驗證

- [x] 8.1 本地執行 `uv run python ETF/main.py --dry-run`，確認 orchestrator 無 import 錯誤且新 step 可被初始化
- [x] 8.2 執行 `uv run pytest ETF/tests/` 確認現有測試全數通過，無 regression
- [x] 8.3 用 `uv run python ETF/main.py --days 7 --force-run` 小範圍執行，確認 `etf_frontrunning_stats`、`etf_active_share`、`etf_cumulative_drag`、`etf_matched_pairs`、`etf_aum_series` 各表有資料寫入
