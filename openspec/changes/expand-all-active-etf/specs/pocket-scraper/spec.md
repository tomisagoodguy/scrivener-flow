## ADDED Requirements

### Requirement: 通用 Pocket.tw 爬蟲
`ETF/scrapers/pocket_scraper.py` 提供 `scrape_holdings(etf_code: str) -> tuple[pd.DataFrame | None, str | None]`，支援任意主動式 ETF 代號（含或不含 A 後綴），回傳統一格式 DataFrame（欄位：code, name, weight, shares）與資料日期字串。

#### Scenario: 成功抓取持股資料
- **WHEN** 傳入合法 ETF 代號（如 `"00982A"` 或 `"00982"`）
- **THEN** 回傳 DataFrame 含欄位 `code`（4 位數字串）、`name`、`weight`（float）、`shares`（int，單位：張），以及資料日期字串（格式 `YYYY/MM/DD`）

#### Scenario: 代號自動補 A 後綴
- **WHEN** 傳入不含 A 後綴的代號（如 `"00982"`）
- **THEN** 自動補為 `"00982A"` 再組 URL，行為與傳入 `"00982A"` 相同

#### Scenario: 僅保留 4 位數股票代號
- **WHEN** Pocket.tw 回傳含非股票列（如 ETF 代號、債券等）
- **THEN** 過濾後 DataFrame 只含 `code` 符合 `^\d{4}$` 的列

#### Scenario: 頁面無資料
- **WHEN** ETF 代號對應頁面無表格或表格為空
- **THEN** 回傳 `(None, None)`，不拋出例外

#### Scenario: 網路或 WebDriver 異常
- **WHEN** Selenium 拋出任何例外
- **THEN** 記錄 ERROR log，回傳 `(None, None)`，確保呼叫端不中斷
