## 1. 新增欄位並回填（view 不動）

- [x] 1.1 撰寫 `supabase/migrations/20261116090000_add_snapshot_rank.sql`：`etf_holdings_snapshot` 新增 `rank integer`（可為 NULL），以 `row_number() OVER (PARTITION BY etf_code, data_date ORDER BY weight DESC, stock_code)` 回填所有列，檔尾附比對與 VACUUM 指令註解（需求：Weight history rank is stored at write time；決策：分兩支 migration，依序部署；決策：回填比對作為驗收）。驗證：向使用者確認後在 Supabase SQL Editor 執行；SQL 比對儲存 rank 與視窗 rank 不一致列數 = 0、`rank IS NULL` 列數 = 0；另行執行 `VACUUM etf_holdings_snapshot`；數字記到本任務下方。
  - 實測（2026-11-17）：使用者同意後以 Supabase `apply_migration`（名稱 `add_snapshot_rank`）執行。SQL 比對：總列數 156,754；儲存 rank 與視窗 rank 不一致 0 列；`rank IS NULL` 0 列；與現行 `etf_weight_history` view 的 rank 不一致 0 列。另行執行 `VACUUM public.etf_holdings_snapshot`：`n_dead_tup` 0，表總大小 54 MB。注意：2.1 的 pipeline 程式上線前，新寫入的列 rank 為 NULL（view 仍用視窗函式，不影響畫面），3.1 會再補填。

## 2. pipeline 寫入 rank

- [x] 2.1 [after: 1.1] `ETFStorage.save_snapshot` 依 `weight` 降序、`code` 升冪為每列算 1..n 的 rank 並寫入 records 的 `rank` 欄位（需求：Weight history rank is stored at write time；決策：rank 在 pipeline 寫入時計算）。驗證：新增 `ETF/tests/test_storage_snapshot_rank.py`，mock `requests.post` 擷取送出的 records，以 spec Example 的四列（2330/9.5、2317/4.2、2454/4.2、3008/1.0）斷言 rank 為 1、2、3、4，且輸入順序打亂時結果相同；先確認測試在現行實作失敗；`uv run pytest ETF/tests/test_storage_snapshot_rank.py` 與 `uv run ruff check ETF/database/storage.py` 通過。
  - 實測（2026-11-17）：新增 3 個測試在現行實作失敗（送出的 records 無 `rank`，KeyError），加入 `_rank_by_weight`（weight 降序、代碼升冪）後 3/3 通過，含輸入順序打亂、rank 為 int；`uv run pytest ETF/tests` 全數通過。ruff 1 筆 F841（`save_snapshot` 內未使用的 `url`）與 HEAD 版本相同，為既有問題。
- [x] 2.2 [after: 2.1] `src/types/supabase.ts` 的 `etf_holdings_snapshot` Row／Insert／Update 型別加入 `rank: number | null`（Insert／Update 為選填），使前端型別與資料庫一致（需求：Weight history rank is stored at write time）。驗證：`yarn tsc --noEmit` 通過。
  - 實測（2026-11-17）：Row 加 `rank: number | null`、Insert／Update 加 `rank?: number | null`；`yarn tsc --noEmit` 通過。純型別宣告不含執行邏輯，依測試範圍準則不另寫測試。

## 3. view 改讀儲存的 rank

  - 前置狀態（2026-11-17）：1.1、2.1、2.2 已以 commit `c5da1665` push 至 master；等待下一次每日 pipeline 成功執行後才進行 3.1。進行前先以 SQL 確認 pipeline 新寫入日期的 rank 非 NULL 且與視窗 rank 一致。
- [ ] 3.1 [after: 2.1] 在 2.1 的 pipeline 程式已 push 並至少成功跑過一次每日 pipeline 後，撰寫並執行 `supabase/migrations/20261116100000_weight_history_view_stored_rank.sql`：補填 `rank IS NULL` 的列，再以 `CREATE OR REPLACE VIEW` 把 `etf_weight_history.rank` 改為 `rank::bigint`，其餘欄位不變（需求：Stock weight history queries do not rank the whole table；決策：分兩支 migration，依序部署；決策：回填比對作為驗收）。驗證：向使用者確認後在 SQL Editor 執行；比對儲存 rank 與視窗 rank 不一致 = 0、NULL = 0、pipeline 新寫入日期的 rank 與視窗 rank 不一致 = 0；`EXPLAIN ANALYZE`（`set local role anon`）查 2330 單頁 < 50 ms 且計畫使用 `idx_etf_holdings_snapshot_stock_date`；數字記到本任務下方。

## 4. 實測

- [ ] 4.1 [after: 3.1] 重啟 dev server 後第一次呼叫 `GET /api/investment/etf-weight-history?code=2330` 回 200，總點數等於 SQL `SELECT count(*) FROM etf_holdings_snapshot WHERE stock_code='2330'`；`/investment/history`「各 ETF 排名史」00981A 最新日 Top 5 的 rank 等於 SQL 以視窗函式 `row_number() OVER (PARTITION BY etf_code, data_date ORDER BY weight DESC, stock_code)` 算出的名次（需求：Stock weight history queries do not rank the whole table）。驗證：curl 狀態碼、耗時與點數，以及 Playwright 或 SQL 比對結果記到本任務下方。
