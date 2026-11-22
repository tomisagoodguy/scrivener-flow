## Summary

ETF pipeline 的每日／每週 upsert 改為「只有資料真的改變才 UPDATE」，在 `ON CONFLICT DO UPDATE` 加上 `WHERE (目標表欄位) IS DISTINCT FROM (EXCLUDED 欄位)`，讓重抓到相同數值的列不再產生寫入，降低 Supabase Disk IO 消耗。

## Motivation

2026-11-22 Supabase 寄信警告專案 `my-case-tracker` 正在耗盡 Disk IO Budget（耗盡後回應變慢、可能無回應）。同日以 pg_stat_statements 實測（統計自 2026-01-06 起累計）：

- 快取命中率：資料表 99.86%、索引 99.79%（實測）→ 讀取不是主因。
- `stock_broker_transactions` 單列 upsert 650 萬次、WAL 10.5 GB；現存 16.5 萬列卻累計更新 736 萬次，約 45 倍（實測）。原因：每日 `--days 60` 重抓 60 天資料，`DO UPDATE` 無條件覆寫並設 `created_at = NOW()`，內容相同也整列重寫。
- `stock_prices_daily` 現存 31 萬列、累計更新 878 萬次，約 28 倍（實測）。
- `stock_shareholder_weekly` upsert 1.3 GB WAL、`sector_strength_stocks` 0.7 GB、`strategy_signals` 0.3 GB（實測）。
- ETF/ 下共 47 條 `ON CONFLICT DO UPDATE`，**沒有任何一條**帶 WHERE 條件；其中 21 條在 SET 內強制寫 `NOW()`（盤點實測）。

PostgreSQL 的 UPDATE 即使值相同也會寫新 tuple、產生 WAL 與髒頁，checkpoint 時落盤。加上 IS DISTINCT FROM 後，相同的列直接跳過，不產生新 tuple、不更新索引，只留少量鎖列 WAL。

## Proposed Solution

- 新增共用 helper `ETF/database/upsert_sql.py`，由欄位清單產生 `DO UPDATE SET ... WHERE (...) IS DISTINCT FROM (...)` 子句；時間戳欄位（`created_at`/`updated_at`）仍設 `NOW()`，但只在其他欄位有變時才觸發，語意變為「最後一次真的變更的時間」。
- 套用到高頻寫入路徑（每日或每週執行）：
  - `SQLStorage`：股價、diff logs、營收、集保、券商、策略交易、策略訊號。
  - Pipeline 步驟：族群強弱（含 stocks 與籌碼統計）、市場籌碼四段、裸K快照、持倉損益兩表、資金流與跨買訊號、訊號偵測、共識持股、Treemap、多 ETF diff logs。
  - 獨立腳本：`sync_equity_distribution.py`、`run_strategies.py`、`run_fund_momentum.py`。
- 資料語意變更：`created_at`/`updated_at` 由「最後一次寫入時間」變為「最後一次內容變更時間」；實作前先確認前端與告警沒有用這些欄位判斷資料新鮮度。
- 單元測試斷言每個改到的 SQL 都含 IS DISTINCT FROM 守門；上線後用 pg_stat_statements 重設後隔日量測，確認每日更新列數下降。

## Non-Goals

- 低頻或一次性腳本（`backfill_*`、`compute_factor_ic.py`、`sync_adl_history.py`、`scripts/backfill_aum_from_twactive.py`、`run_fund_holdings_sync.py`、`sync_topics_step.py`、`margin_regime_step.py`、`taiex_ma60_regime_step.py`、`active_share_step.py` 等每日僅數列者）。
- SET 使用 COALESCE 的路徑（`etf_news`、`etf_aum_series`、`etf_dividend_records`），守門式需另行設計。
- REST `resolution=merge-duplicates` 路徑（`ETF/database/storage.py` 的 snapshot、diff logs、公司資料），無法加 WHERE。
- 把 executemany 改成 `_bulk_upsert`（另一個效能議題）。
- `etf_weight_history` view、索引調整、compute 升級。
- 原提案中「sector_strength_stocks／strategy_signals 改為不先刪再插」：盤點確認兩者本來就是純 upsert，大量 insert/delete 來自每日新增＋30 天保留刪除，屬正常，不改。

## Alternatives Considered

- 只拿掉 `created_at = NOW()`：值相同仍會 UPDATE、寫 WAL，效果有限。
- 在 Python 端先撈現有資料比對再寫：多一次大量讀取與來回，程式複雜，且有競態。
- 升級 compute：治標，費用增加；先做本變更再觀察。

## Impact

- Affected specs: `db-write-minimization`（新增）、`stock-price-sync-integrity`（修改「Atomic price upsert with visible failure」）
- Affected code:
  - New: ETF/database/upsert_sql.py
  - New: ETF/tests/test_upsert_sql.py
  - Modified: ETF/database/sql_storage.py
  - Modified: ETF/pipeline/steps/sector_strength_step.py
  - Modified: ETF/pipeline/steps/market_chips_step.py
  - Modified: ETF/pipeline/steps/sync_bare_k_step.py
  - Modified: ETF/pipeline/steps/position_summary_step.py
  - Modified: ETF/pipeline/steps/flow_compute_step.py
  - Modified: ETF/pipeline/steps/signal_detect_step.py
  - Modified: ETF/pipeline/steps/overlap_compute_step.py
  - Modified: ETF/pipeline/steps/sync_treemap_step.py
  - Modified: ETF/pipeline/steps/multi_etf_step.py
  - Modified: ETF/sync_equity_distribution.py
  - Modified: ETF/run_strategies.py
  - Modified: ETF/run_fund_momentum.py
  - Modified: ETF/CLAUDE.md（常見錯誤表加入 upsert 守門規則）
