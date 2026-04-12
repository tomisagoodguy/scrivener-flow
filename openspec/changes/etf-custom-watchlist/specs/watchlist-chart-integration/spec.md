## ADDED Requirements

### Requirement: 裸K報告包含自選股
`stock_chart_report.py` SHALL 在產生報告時，合併讀取所有使用者的自選清單，將自選股納入圖表產生範圍。

#### Scenario: 有自選股時
- **WHEN** `custom_watchlist` 表中有資料，且執行 `stock_chart_report.py`
- **THEN** 報告包含自選股的 K 線圖，並在圖表標題標記「自選」來源

#### Scenario: 自選股代號不在價格資料庫
- **WHEN** 自選股代號在 `stock_prices_daily` 查無資料
- **THEN** 腳本跳過該股並輸出 warning log，不中斷整體報告產生

#### Scenario: 自選清單為空時
- **WHEN** `custom_watchlist` 表無任何資料
- **THEN** 報告只包含 ETF union pool 的股票，行為與原本一致

### Requirement: 去重合併
自選股與 ETF union pool 重疊的股票 SHALL 只產生一份圖表，不重複。

#### Scenario: 自選股已在 ETF 池
- **WHEN** 某股票同時在 `etf_holdings_snapshot` 和 `custom_watchlist`
- **THEN** 該股的圖表只出現一次，來源標記同時顯示「ETF」與「自選」
