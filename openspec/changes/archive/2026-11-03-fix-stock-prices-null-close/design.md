## Context

`SyncOHLCVStep` 每日以 `OhlcvService.get_ohlcv(codes, days=30)` 取 FinLab 開高低收量、融資使用率、投信買賣超，經 `Storage.save_stock_prices`（REST `merge-duplicates`、每批 500 筆、失敗只記 log）寫入 `stock_prices_daily`（PK `(stock_code, data_date)`）。這是此表唯一的寫入者。實測與根因見 proposal。

## Goals / Non-Goals

**Goals:**

- 任何寫入路徑都不產生或覆蓋出 `close` 為 NULL 的列。
- 寫入失敗可見且不留半套資料。
- 一次性修復 2026-04-01 起 FinLab 有價的 NULL 列，並讓下游統計重算。

**Non-Goals:**

- 不改 `get_ohlcv` 的資料組裝（30 天窗口、融資與投信補 0 維持現狀）。
- 不處理下市股名單、CI FinLab 快取。

## Decisions

### 只寫有收盤價的列

`build_price_records(df)` 在寫入端排除 `close` 為 NaN 的列；當天價格表尚未更新的股票不寫入，隔天 30 天窗口重抓時自然寫入。無成交與下市股的當天也不再產生列。
替代方案：寫入時以 `COALESCE(EXCLUDED.close, stock_prices_daily.close)` 保留舊值——否決，仍會為無價日建立新的 NULL 列。

### 寫入改用 SQLStorage._bulk_upsert

`SQLStorage.upsert_stock_prices(df)` 以 `INSERT ... ON CONFLICT (stock_code, data_date) DO UPDATE SET ... = EXCLUDED....` 經 execute_values 每 1000 列一次來回、單一交易；任一頁失敗整批 rollback 並 raise，由 `SyncOHLCVStep` 捕捉後 `logger.error`（輔助步驟不 raise）。`build_price_records` 同時把 ±inf 轉為 NULL，避免 JSON／SQL 寫入失敗。刪除 REST 版 `Storage.save_stock_prices`，單一寫入實作。
替代方案：保留 REST 只修過濾——否決，批次失敗靜默是 6～7 月無法自癒的最可能原因。

### 一次性修復腳本

`ETF/scripts/repair_stock_prices.py --since 2026-04-01 [--dry-run]`：查期間內有 NULL close 的股票 → `get_ohlcv(codes, days=期間內 FinLab 交易日數)` → 只保留 `data_date >= since` → `upsert_stock_prices`。結束時印出修復筆數，並以 SQL 回查期間內仍為 NULL 的列數。`--dry-run` 只印預計筆數不寫入。

## Implementation Contract

**行為**

- 每日 pipeline 後，當日寫入的列 `close` 皆非 NULL；寫入失敗時 log 出現 `OHLCV upsert failed` 與錯誤原文，pipeline 繼續。
- 執行修復腳本後，2026-04-01 起仍為 NULL 的列只剩 FinLab 當天也無價者。

**介面**

- `build_price_records(df: pd.DataFrame) -> list[dict]`：欄位 `stock_code, data_date, open, high, low, close, volume, amount, margin_ratio, margin_pct_rank, it_buy, currency`；`close` 為 NaN 的列不輸出；NaN／±inf 轉 `None`，但 `volume`、`margin_ratio`、`it_buy` 缺值維持現行預設 0，`margin_pct_rank` 缺值或缺欄為 `None`，`currency` 為 `'TWD'`。
- `SQLStorage.upsert_stock_prices(df: pd.DataFrame) -> int`：回傳寫入列數。

**失敗模式**

- DB 寫入失敗：整批 rollback，`SyncOHLCVStep` 記 error 不 raise；修復腳本 raise 並以非 0 結束。
- FinLab 無資料：沿用現行 `No OHLCV data returned` 警告。

**驗收**

- `uv run pytest ETF/tests/test_stock_price_sync.py ETF/tests/test_margin_percentile.py` 通過。
- 修復後 SQL：2026-04-01 起 NULL close 列，對照 FinLab 當天有價者為 0（腳本輸出＋抽查 2330 於 2026-05-29 為 2355）。
- 重跑回補與統計後，買進模式 20 日覆蓋率 ≥ 98%。

**範圍**

- 範圍內：寫入過濾、寫入實作替換、修復腳本、下游重算、文件陷阱。
- 範圍外：下市股名單、同步窗口、CI 快取、既有 NULL 列的刪除（apply 時另問使用者）。

## Risks / Trade-offs

- [無價日不再有列，依賴「最新一列」取融資使用率的讀取端在無成交日會拿到前一日] → 對現價與融資顯示更正確；ETF 持股補價本來就需要 close。
- [修復抓約 150 個交易日 × 約 2,000 檔（估計值）] → 本機 FinLab 已有快取；apply 時記錄實際筆數與耗時。
- [根因 3 為推測] → 改用單一交易且失敗必 log，即使原因不同也不會再靜默留下半套資料。
