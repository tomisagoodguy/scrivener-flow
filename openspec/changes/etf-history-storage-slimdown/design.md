## Context

- Supabase 專案 `my-case-tracker` 在 Free 方案，資料庫上限 500 MB。2026-11-15 實測 `pg_database_size` = 528 MB，並收到 Disk IO Budget 警告。
- ETF 三表實測（2026-11-15）：`etf_holdings_snapshot` 39 MB／151,693 列（2026-03-02 起，23 支 ETF，181 個交易日）、`etf_weight_history` 36 MB／154,572 列（2026-04-02 起）、`etf_position_summary` 30 MB。
- 實測 `etf_weight_history` 每列都能以 `(etf_code, stock_code, data_date)` 對到 snapshot，且 `weight`、`shares` 完全相同（154,572／154,572）。
- `SQLStorage.cleanup_old_data` 目前刪除 260 天前的 snapshot；最舊日期 2026-03-02 在 2026-11-17 起被刪。ETF 爬蟲只能抓當日持股，被刪的歷史無法重建。使用者已決定 ETF 持股歷史永久保留。
- `etf_weight_history` 讀取點（皆只 select `etf_code, stock_code, stock_name, data_date, weight, shares, rank` 的子集，無人讀 `id`、`created_at`）：`src/lib/investment/etfPageData.ts`、`src/app/api/investment/etf-weight-history/route.ts`、`src/app/investment/history/page.tsx`、`src/components/features/investment/HoldingsPriceOverlayChart.tsx`、`src/app/actions/investmentPnl.ts`。
- 寫入點：`WeightHistoryStep`（經 `ETFStorage.save_weight_history`，REST merge-duplicates）、`MultiEtfStep._save_weight_history`（SQL `ON CONFLICT`，由主流程與 gap-fill 呼叫）。三者失敗都只記 log 不拋出。
- 屬性欄位讀取：前端 `selectDateWithFallback` 取每支 ETF 最新 2 個日期中 price 覆蓋率足夠者；`ETFStorage.get_snapshot_from_date` 讀歷史日期但其結果只被 `compute_diff` 用到 `code, name, shares, weight`。
- 盤點時順帶發現的既有問題（不在本 change 修正）：`getHoldings5DayTrend` 從 snapshot select 不存在的 `rank` 欄位。

## Goals / Non-Goals

**Goals:**

- ETF 持股歷史（snapshot 的 weight、shares）永久保留，不再被例行清理刪除。
- 消除 `etf_weight_history` 的重複存放，讀取端不需改碼。
- 舊日期的個股屬性欄位不再占空間。
- 以 `stock_code` 查 snapshot 不再全表掃描。
- 一次性回收後 `pg_database_size` < 500 MB。

**Non-Goals:**

- upsert 每次重寫未變動列（`stock_prices_daily` 等平均每列被重寫約 28 次）的 `IS DISTINCT FROM` 修正——另開 change。
- `sector_strength_stocks` 刪除後重灌的寫入模式——另開 change。
- 個股類資料表（價格、集保、分點）保留期限調整。
- 修正 `getHoldings5DayTrend` select 不存在的 `rank` 欄位。
- 更新其他既有 spec 中提到 `etf_weight_history` 的敘述：view 保留同名同欄位，那些敘述仍成立。

## Decisions

### 同名 view 取代 etf_weight_history 實體表

刪除實體表後建立 `CREATE VIEW public.etf_weight_history WITH (security_invoker = true) AS SELECT etf_code, stock_code, stock_name, data_date, weight, shares, row_number() OVER (PARTITION BY etf_code, data_date ORDER BY weight DESC, stock_code) AS rank FROM public.etf_holdings_snapshot`，並 `GRANT SELECT` 給 `anon`、`authenticated`。

- 理由：5 個讀取點只用到 view 提供的欄位，零改碼；`row_number()` 依 weight 降序與現行 `MultiEtfStep._save_weight_history` 的排名方式一致，同分改以 `stock_code` 決定，結果可重現。
- 效能：讀取端都帶 `etf_code` 條件，它是 partition key，Postgres 可把條件推進 window 之前，每支 ETF 約 7,000 列（181 日 × 約 40 檔，估算）。以 `stock_code` 篩選時仍需計算該 ETF 全部日期的 window，屬可接受量級；以 `EXPLAIN ANALYZE` 驗證單次查詢 < 200 ms。
- `security_invoker = true`：讓 snapshot 的 RLS（公開讀）套用在 view 讀者，避免 view 以擁有者權限繞過 RLS。
- 替代方案：各讀取點改查 snapshot 並在應用層算 rank——需改 5 處，且以 stock_code 篩選時另抓整支 ETF 當日持股，否決。

### 屬性欄位以每支 ETF 最新 2 日為界清空

例行清理執行一條 UPDATE：以 `DENSE_RANK() OVER (PARTITION BY etf_code ORDER BY data_date DESC)` 找出每支 ETF 的第 3 個以後日期，將 15 個屬性欄位設 NULL，WHERE 條件加上「任一屬性欄位 IS NOT NULL」避免重複寫入同一列。

- 為何是 2 日：`selectDateWithFallback` 會在最新日 price 覆蓋率不足時改讀次新日。
- 為何逐 ETF：各 ETF 公告日不同（Pocket.tw 來源可能數天才更新），用全域日期會誤清尚未更新之 ETF 的最新資料。
- 個股頁 `stock/[code]` 以 `stock_code` 取最新一列的 `is_disposal`：若該股已被所有 ETF 出清，最新列屬舊日期，`is_disposal` 會變 NULL（顯示為非處置）。舊日期的處置狀態本就過期，接受此行為。
- 空間效益：屬性欄位約占 snapshot 每列一半寬度（估算，依欄位型別推估）；預估回收約 10–15 MB，以 `VACUUM FULL` 後的 `pg_total_relation_size('etf_holdings_snapshot')` 實測確認。

### 停用 snapshot 的 260 天刪除

從 `cleanup_old_data` 移除刪除 `etf_holdings_snapshot` 的語句，其餘表的保留規則不變。必須在 2026-11-17 的排程執行前部署，因此排為第一個任務且不依賴其他任務。

- 成長估算：屬性清空後 snapshot 每月增加約 2–3 MB（估算：現行約 4.6 MB／月 × 屬性清空後約一半寬度），以一個月後 `pg_total_relation_size` 實測確認。

### 先移除寫入端再刪表

順序：(1) 移除 pipeline 的三個寫入點並部署 → (2) 使用者執行 view migration。若反過來，寫入 view 會失敗；雖然只記 log 不中斷 pipeline，仍會產生每日錯誤 log。

### 一次性回收以手動 SQL 執行

`supabase/maintenance/20261115_etf_storage_reclaim.sql` 包含：既有舊日期屬性欄位一次性清空（與例行 UPDATE 相同條件）、`VACUUM FULL` 受影響的表、查詢 `pg_database_size`。`VACUUM FULL` 不能放在 transaction 內，且會鎖表數秒到數十秒，故不放進 migrations，由使用者在 pipeline 非執行時段於 SQL Editor 執行。

## Implementation Contract

**行為**

- `cleanup_old_data` 執行後，snapshot 不會少任何一列；每支 ETF 最新 2 個日期以外的列，15 個屬性欄位為 NULL，`weight`、`shares`、`stock_name`、`updated_at` 不變。
- 例行清理其他表的保留天數（260／365／400／5／30／180／90 天、`equity_distribution_stats` 730 天、裸K 每檔留最新一列）不變。
- pipeline 不再註冊 `WeightHistoryStep`，也不再有任何程式寫入 `etf_weight_history`。
- `etf_weight_history` 在資料庫中是 view，欄位為 `etf_code, stock_code, stock_name, data_date, weight, shares, rank`。
- snapshot 有 `(stock_code, data_date)` btree 索引。

**介面／資料形狀**

- `SQLStorage.cleanup_old_data()` 簽名不變；新增模組常數（例如 `SNAPSHOT_ATTRIBUTE_RETENTION_SQL`），讓測試能直接在 SQLite 執行同一語句。
- `ETFStorage.save_weight_history` 與 `MultiEtfStep._save_weight_history` 刪除；`WeightHistoryStep`、`WeightHistoryProcessor` 及其檔案刪除；`ETF/pipeline/steps/__init__.py` 與 `ETF/pipeline/orchestrator.py` 移除對應匯出與註冊。
- `src/types/supabase.ts`：`etf_weight_history` 從 `Tables` 移到 `Views`，只留 `Row` 型別（欄位皆 nullable，與 Supabase 產生 view 型別的慣例一致）。

**失敗模式**

- 屬性清空的 UPDATE 失敗：沿用 `cleanup_old_data` 既有行為，整個清理記 error log、不 commit、不拋出，pipeline 繼續。
- view migration 執行前 pipeline 已移除寫入：表停止更新但讀取仍正常（資料停在最後一天），不影響正確性，直到 view 上線。

**驗收**

- `uv run pytest ETF/tests/test_cleanup_old_data.py`：新增「無 snapshot DELETE」「屬性清空只影響每 ETF 第 3 個以後日期」「重複執行更新 0 列」測試皆通過，既有測試仍通過。
- `uv run pytest ETF/` 全部通過；`uv run ruff check ETF/`。
- `yarn tsc --noEmit` 通過。
- 使用者執行 migration 後：以 SQL 驗證 view 的 `rank` 與舊表 rank 一致（migration 前先把舊表抽樣存成暫存比對）、`EXPLAIN` 個股查詢走新索引。
- 使用者執行回收 SQL 後：`pg_database_size` < 500 MB（記錄實測數字到 tasks.md）。
- 前端實測：`/investment/history` 與個股頁比重走勢圖有資料。

**範圍**

- 範圍內：上列 pipeline、migration、維運 SQL、型別與文件更新。
- 範圍外：見 Non-Goals。

## Risks / Trade-offs

- [view 以 stock_code 篩選時要計算整支 ETF 的 window] → 以 `EXPLAIN ANALYZE` 實測；若 > 200 ms，改為對 `etf_code` 加日期範圍的讀取點各自優化，不改回實體表。
- [rank 同分時排序可能與舊表不同] → 舊表同分排序本就取決於 DataFrame 排序穩定性；新規則固定為 `stock_code`，比對時容許同分列 rank 互換。
- [VACUUM FULL 鎖表] → 在 pipeline 非執行時段執行；snapshot 約 40 MB，預估數秒到數十秒（估算）。
- [snapshot 永久保留後持續成長] → 屬性清空後估每月 2–3 MB；一個月後實測成長量，再評估是否需要壓縮舊資料。
- [個股頁對已出清股票顯示 is_disposal 為 NULL] → 舊日期處置狀態本就過期，接受。
- [刪表不可逆] → migration 前先確認 snapshot 涵蓋全部舊表列（重跑 2026-11-15 的比對查詢，matched 必須等於舊表列數）才執行 DROP。
