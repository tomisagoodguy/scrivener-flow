## 1. 交易日前置確認（CheckTradeDateStep）

- [x] 1.1 在 `ETF/pipeline/steps/check_trade_date_step.py` 建立 `CheckTradeDateStep(BaseStep)`，使用 DB 最新 `data_date` 比對 `_last_weekday()` 結果，實作 Pipeline checks latest data date before running（設計決策：CheckTradeDateStep 使用 DB 最新 `data_date` 比對）
- [x] 1.2 在 `ETF/pipeline/orchestrator.py` 中，將 `CheckTradeDateStep` 加入 pipeline 步驟列表的第一位
- [x] 1.3 在 `orchestrator.py` 的執行迴圈中，捕捉 `EarlyExitSignal` 並以 exit code 0 結束（實作 Early exit is non-destructive），確保 `NotifyStep` 不被呼叫

## 2. Excel/CSV 欄位 alias mapping（xlsx_parser.py）

- [x] 2.1 在 `ETF/scrapers/xlsx_parser.py` 頂層新增 `COLUMN_ALIASES: dict[str, list[str]]` 頂層常數（設計決策：欄位 alias mapping 放在 xlsx_parser.py 頂層常數），涵蓋 `code`、`name`、`weight`、`shares` 四個標準欄名及其別名（實作 xlsx_parser resolves column names via alias mapping）
- [x] 2.2 修改 `xlsx_parser.py` 的欄位偵測邏輯，在精確匹配失敗後逐一嘗試別名（實作 Parser retries with alias matching before failing），未知欄名僅 log warning 不拋例外

## 3. 三層 Fallback 鏈（MultiEtfStep）

- [x] 3.1 修改 `ETF/pipeline/steps/multi_etf_step.py`，fallback 鏈實作位置選在 MultiEtfStep 而非 Registry，將每支 secondary ETF 的爬取邏輯改為固定 fallback 順序：official_api → moneydj → pocket（設計決策：fallback 順序：official_api → moneydj → pocket），實作 Secondary ETF scraping uses a three-layer fallback chain
- [x] 3.2 修改 `multi_etf_step.py` 確保 fallback 結果記錄到 `ctx.scrape_results`，每筆包含 `etf_code`、`source`、`used_fallback`、`data_date`，實作 Fallback results are recorded in pipeline context
- [x] 3.3 確認 `ETF/scrapers/moneydj_scraper.py` 的 `scrape_moneydj()` 回傳介面（`DataFrame | None`）與 fallback 鏈相容；若欄位名不符（`stock_code/stock_name` vs `code/name`）則在 step 層統一重命名（實作 MultiEtfStep falls back to MoneyDJ when Pocket.tw fails）
- [x] 3.4 在三層全部失敗時，log 每一層的失敗原因，確保 no exception propagates

## 4. 整合驗證

- [x] 4.1 以 `--dry-run` 模式本機執行 pipeline，確認 `CheckTradeDateStep` 在資料已是最新時提前退出
- [x] 4.2 手動將 `etf_holdings_snapshot` 某支 ETF 的 `data_date` 設為昨天，確認 pipeline 繼續執行
- [x] 4.3 模擬 `official_api_scraper` 失敗（拋出例外），確認 fallback 至 `moneydj_scraper`，`ctx.scrape_results` 中 `used_fallback=True`
