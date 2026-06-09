## 1. 資料庫 Migration

- [x] 1.1 建立 `supabase/migrations/<timestamp>_add_etf_stock_divergence.sql`，以 `CREATE TABLE IF NOT EXISTS etf_stock_divergence` 定義表結構（`id`, `data_date`, `stock_code`, `stock_name`, `buy_etfs jsonb`, `sell_etfs jsonb`, `buy_count int`, `sell_count int`, `created_at`, `UNIQUE(data_date, stock_code)`）；確認 `etf_stock_divergence table stores daily divergence results` 的欄位規格全部實作

## 2. MoneyDJ Scraper（MoneyDJ scraper 使用 subprocess curl 而非 Python requests；MoneyDJ 作為 pocket fallback，而非主要來源）

- [x] 2.1 建立 `ETF/scrapers/moneydj_scraper.py`：在了解現有 ETF 爬蟲架構（`pocket_scraper.py` / `official_api_scraper.py`）後，實作 `fetch_html(etfid)` 函式，以 `subprocess.run(["curl", ...])` 加 Chrome User-Agent 抓取 `https://www.moneydj.com/ETF/X/Basic/Basic0007B.xdjhtm?etfid={etfid}.TW`；執行前 `shutil.which("curl")` 檢查，找不到時 raise `RuntimeError("curl not found on PATH")`；curl 非零退出時 raise `RuntimeError` 含 etfid 與 exit code（`MoneyDJ scraper fetches all holdings via curl`）
- [x] 2.2 在 `moneydj_scraper.py` 實作 `parse_html(html_text, etfid)`：用 `re.compile(r"sdate3.*?(\d{4}/\d{2}/\d{2})")` 取資料日期轉 YYYY-MM-DD；用 `<title>` 取 fund_name；用 `col05/col06/col07` CSS class regex 解析各持股列（ticker、名稱去括號交易所後綴、weight float、shares int）；holdings 空時 raise RuntimeError（`MoneyDJ parser extracts data_date and holdings`）
- [x] 2.3 在 `moneydj_scraper.py` 實作 `scrape_moneydj(etfid) -> pd.DataFrame | None`：呼叫 `fetch_html` + `parse_html`，回傳含 `stock_code`, `stock_name`, `shares`, `weight_pct` 欄位的 DataFrame；任何例外一律 log error 後回傳 `None`，不 re-raise（`MoneyDJ scraper returns standardized DataFrame`）

## 3. MultiEtfStep Fallback 整合

- [x] 3.1 修改 `ETF/pipeline/steps/multi_etf_step.py`：在 `source='pocket'` ETF 的處理路徑中，Pocket.tw 回傳 `None` 或拋例外後，呼叫 `moneydj_scraper.scrape_moneydj(etfid)` 作為 fallback；MoneyDJ 成功時記錄 warning log 說明使用 fallback；兩者皆 None 時 log skip（`MultiEtfStep falls back to MoneyDJ when Pocket.tw fails`）

## 4. 分歧偵測步驟（分歧偵測以「當日 diff_logs」為輸入，獨立步驟；分歧存入新表 `etf_stock_divergence`）

- [x] 4.1 建立 `ETF/pipeline/steps/divergence_detect_step.py`，繼承 `BaseStep`，實作 `run(ctx)`：參照現有共識分析架構（OverlapComputeStep）作為設計參考，查詢 `etf_diff_logs` 中 `data_date = ctx.date_str` 的所有記錄；依 `stock_code` 分群，找出同時有 `change_type IN ('BUY','IN')` 與 `change_type IN ('SELL','OUT')` 的股票，組成 `buy_etfs`/`sell_etfs` JSON 陣列（含 `etfid`, `fund_name`, `diff_shares`）；結果以 SQLAlchemy upsert 寫入 `etf_stock_divergence`（conflict on `data_date, stock_code`）；整個 `run()` 包在 `try/except` 中，失敗時 logger.error 不 re-raise（`DivergenceDetectStep identifies same-day opposing ETF actions`、`etf_stock_divergence table stores daily divergence results`、`Step failure does not break pipeline`）
- [x] 4.2 修改 `ETF/pipeline/orchestrator.py`：import `DivergenceDetectStep` 並將其加入步驟序列，置於 `OverlapComputeStep` 之後、`FlowComputeStep` 之前（`Orchestrator registers DivergenceDetectStep after OverlapComputeStep`）

## 5. 前端共識頁面（前端分歧頁面整合進現有 consensus 頁面）

- [x] 5.1 修改 `src/app/investment/consensus/page.tsx`（或其資料層 Server Action）：新增 Server Action `getDivergenceData()`，查詢 `etf_stock_divergence` 最新 `data_date` 的所有記錄，依 `buy_count + sell_count` 降序排列；確認使用 `src/lib/supabase/service.ts`（bypass RLS）
- [x] 5.2 修改 `src/app/investment/consensus/page.tsx`：新增「分歧」tab，渲染每筆 divergence 記錄：stock_code + stock_name、buying ETFs list（rose 色，`diff_shares / 1000` 取整顯示張數）、selling ETFs list（emerald 色，同上）；空狀態時顯示「今日無跨 ETF 分歧標的」（`Frontend consensus page displays divergence tab`、`Color convention follows Taiwan stock convention`、`Consensus page renders divergence tab alongside existing tabs`）
