## ADDED Requirements

### Requirement: MultiEtfStep 支援全部 9 檔次要 ETF
`MultiEtfStep` 的 `SECONDARY_ETF_CODES` SHALL 包含 00980A、00982A、00984A、00985A、00987A、00991A、00992A、00993A、00994A、00995A（共 9 檔），並改用 `pocket_scraper.scrape_holdings()` 抓取持股。

#### Scenario: 全部 ETF 成功爬取
- **WHEN** Pipeline 執行 MultiEtfStep
- **THEN** 9 檔 ETF 的持股快照與 weight history 全部寫入 `etf_holdings_snapshot` 和 `etf_weight_history`

#### Scenario: 單一 ETF 爬取失敗不中斷 Pipeline
- **WHEN** 某一 ETF（如 00987A）的 `pocket_scraper` 回傳 `(None, None)`
- **THEN** 記錄 WARNING log，繼續處理剩餘 ETF，不拋出例外

#### Scenario: secondary_stock_codes 包含全部成分股
- **WHEN** MultiEtfStep 執行完畢
- **THEN** `ctx.secondary_stock_codes` 包含所有成功爬取的 ETF 成分股代碼（去重後），供後續 SyncOHLCVStep 使用

### Requirement: 各 ETF 的資料日期以 Pocket.tw 回傳日期為準
ETF 快照存入時 `data_date` SHALL 使用爬蟲回傳的實際資料日期，若爬蟲未回傳日期則 fallback 為執行當日。

#### Scenario: Pocket.tw 有明確資料日期
- **WHEN** 爬蟲成功解析頁面上的「資料日期」
- **THEN** `etf_holdings_snapshot.data_date` 記錄該日期，而非 Pipeline 執行日期

#### Scenario: 資料日期解析失敗
- **WHEN** 頁面無「資料日期」欄位
- **THEN** fallback 使用 `date.today().strftime("%Y-%m-%d")` 作為 `data_date`
