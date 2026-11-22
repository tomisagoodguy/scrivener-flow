## Context

Supabase 專案 `my-case-tracker`（推測 Micro compute，shared_buffers 224 MB）收到 Disk IO Budget 耗盡警告。2026-11-22 以 pg_stat_statements 實測：讀取快取命中率 99.8%，主要 IO 是寫入；`stock_broker_transactions` upsert 累計 WAL 10.5 GB、現存列數 45 倍的更新次數，`stock_prices_daily` 28 倍（數字見 proposal）。

盤點 ETF/ 共 47 條 `ON CONFLICT DO UPDATE`，全部無 WHERE；21 條在 SET 內寫 `NOW()`。寫入路徑分兩類：

- `SQLStorage._bulk_upsert`（execute_values，呼叫端傳入整條 SQL）：股價、營收、集保、券商、策略交易。
- `conn.execute(text(...), list_of_dicts)`（executemany）：diff logs、策略訊號、各 pipeline 步驟、獨立腳本。

兩類都由呼叫端自行組 SQL 字串，所以守門可以加在每個呼叫點，不需改 `_bulk_upsert`。目標欄位型別已實測：所有 json 類欄位皆為 `jsonb` 或陣列，支援 `IS DISTINCT FROM` 相等比較（`json` 型別不支援，本範圍內無）。

## Goals / Non-Goals

**Goals:**

- 範圍內的每條 upsert 在內容相同時不產生新的 tuple 版本。
- 同一個子句產生器，避免 20 多處手寫 WHERE 欄位清單與 SET 清單不一致。
- 上線後可量測：重設 pg_stat_statements，隔日比對更新列數。

**Non-Goals:**

- 見 proposal Non-Goals（低頻腳本、COALESCE 型 SET、REST merge-duplicates、executemany 效能、view／索引／compute）。
- 不改 `_bulk_upsert` 簽名，不回傳實際變更列數。

## Decisions

### 決策 1：以 IS DISTINCT FROM 在 DB 端守門

在 `DO UPDATE ... WHERE (target.cols) IS DISTINCT FROM (EXCLUDED.cols)`。ON CONFLICT 的 WHERE 為 false 時 PostgreSQL 不產生新 tuple、不更新索引；但仍會先鎖定既有列，鎖列會寫一筆小 WAL 紀錄並弄髒資料頁（checkpoint 後首次觸頁可能寫整頁映像），所以寫入量下降但不是零。`IS DISTINCT FROM` 對 NULL 視為相等，避免 `<>` 遇 NULL 恆為 NULL 而永不更新。

替代方案：Python 端先 SELECT 比對（多一次大量讀取、競態）；只移除 `NOW()`（值相同仍寫）。皆否決。

### 決策 2：共用子句產生器 conflict_update_clause

新增 `ETF/database/upsert_sql.py` 的 `conflict_update_clause(table, columns, touch=())`，回傳 `DO UPDATE SET ... WHERE ...`。WHERE 必須用目標表名限定欄位（`<table>.<col>`），因為 ON CONFLICT 子句內未限定的欄名有歧義。呼叫端維持原本的 `INSERT INTO <table> (...) VALUES ... ON CONFLICT (<keys>)`，只把 `DO UPDATE SET ...` 換成 helper 輸出。若某條 SQL 用 `INSERT INTO <table> AS <alias>`，傳 alias 作為 `table` 參數。

替代方案：每處手寫 WHERE。20 多處容易漏欄位，否決。

### 決策 3：時間戳改為 touch 欄位，語意變為最後內容變更時間

原本 SET 內的 `created_at = NOW()`／`updated_at = NOW()` 改傳 `touch=[...]`，不列入比較。內容不變時時間戳不動。已確認前端讀 `updated_at`／`created_at` 判斷新鮮度的地方只在 `etf_holdings_snapshot`（holdingsUtils、etfPageData）與 `etf_diff_logs`（`save_diff_logs` 的 SET 不含 `created_at`），都不受影響；`watch_list.created_at` 非本範圍。

### 決策 4：upsert_stock_prices 回傳值維持送出筆數

`_bulk_upsert` 用 execute_values 不取回 rowcount；改為回傳實際變更數需 `RETURNING` + `fetch=True`，增加回傳流量。維持回傳送出筆數，spec 已明載。

### 決策 5：以 SQL 字串測試 + 上線後實測驗證

既有測試多 mock storage 層，無本地 PostgreSQL。單元測試擷取各寫入點執行的 SQL，斷言含 `IS DISTINCT FROM`；DB 行為以一次 BEGIN…ROLLBACK 的實際 SQL 驗證，以及上線後 pg_stat_statements 量測。

### 決策 6：共識計數 UPDATE 同樣守門

`OverlapComputeStep._update_consensus_counts` 在 upsert 之後對當日 `etf_stock_overlap` 列執行 `UPDATE ... SET consensus_buy_count, consensus_sell_count, updated_at = NOW()`，原本無條件執行。若不處理，當日有 diff log 的列每天照樣被重寫，`updated_at` 仍是最後執行時間，與決策 3 的語意矛盾（`/spectra-verify` 警告）。改為在 UPDATE 的 WHERE 加上 `(o.consensus_buy_count, o.consensus_sell_count) IS DISTINCT FROM (c.buy_count, c.sell_count)`。這是一般 UPDATE 不是 upsert，不經 `conflict_update_clause`，直接寫在 SQL；log 的 `rowcount` 語意變為「計數有變的列數」。

替代方案：在 Non-Goals 註明此表 `updated_at` 仍代表執行時間。會讓決策 3 出現例外且保留無效寫入，否決。

## Implementation Contract

- **Behavior**：pipeline 重跑同一天資料時，範圍內各表內容相同的列不被改寫，`created_at`／`updated_at` 不變；內容有差的列照常更新且時間戳刷新；新列照常插入。Pipeline 對外行為（LINE 通知、前端資料）不變。
- **Interface**：`conflict_update_clause(table: str, columns: Sequence[str], touch: Sequence[str] = ()) -> str`，輸出格式 `DO UPDATE SET a = EXCLUDED.a, ..., t = NOW() WHERE (<table>.a, ...) IS DISTINCT FROM (EXCLUDED.a, ...)`。`columns` 空或與 `touch` 重疊 → `ValueError`。
- **Failure modes**：helper 參數錯誤在組 SQL 時立即 raise（不吞）；SQL 錯誤沿用各呼叫點既有處理（`_bulk_upsert` rollback + raise、輔助步驟 log 不 raise）。
- **Acceptance**：
  - `uv run pytest ETF/tests/test_upsert_sql.py` 全綠，覆蓋 helper 與每個範圍內寫入點。
  - `uv run pytest ETF/` 既有測試不退步（test_stock_price_sync 的 `ON CONFLICT (stock_code, data_date) DO UPDATE` 子字串斷言仍成立）。
  - `uv run ruff check` 對改動檔通過。
  - 實際 DB：對 `stock_broker_transactions` 以現有一列的原值執行守門 upsert 加 `RETURNING 1`，包在 `BEGIN … ROLLBACK`，回傳 0 列；改一個值回傳 1 列。
  - 上線後：重設 pg_stat_statements，下一次日排程後 `stock_broker_transactions` upsert 的 `rows`（實際影響列）明顯低於 CI log 記錄的送出筆數；結果記入 tasks.md。
- **Scope**：in scope 為 spec「Recurring upserts skip unchanged rows」列出的寫入點，以及 spec「Consensus count update skips unchanged rows」的共識計數 UPDATE；`conflict_update_clause` 的 import 一律放在檔案開頭（`multi_etf_step.py`、`run_strategies.py` 原為函式內 import）；其他 upsert、REST 路徑、executemany 改造皆 out of scope。

## Risks / Trade-offs

- [時間戳語意改變] → 已確認前端不依賴範圍內表的時間戳；ETF/CLAUDE.md 記錄新語意。
- [浮點欄位微小差異仍觸發更新] → 例如重算的報酬率小數末位不同，仍會寫入；屬正確行為，效益以實測為準。
- [漏欄位導致該欄改變卻不更新] → helper 由同一份 `columns` 同時產生 SET 與 WHERE，兩者不可能不一致；測試逐寫入點檢查。
- [效益估計] 「WAL 下降 80% 以上」是估計值（依據：券商重抓 60 天中僅最新 1 至數天會變），以上線後 pg_stat_statements 的 wal_bytes 量測確認；若效益不足，再評估 compute 升級。
