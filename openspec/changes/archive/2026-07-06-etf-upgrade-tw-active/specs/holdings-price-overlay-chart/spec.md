## ADDED Requirements

### Requirement: 跨 ETF 持股比重 + 股價雙軸疊圖

`HoldingsPriceOverlayChart` SHALL 以**個股為中心**，在同一圖表上呈現所有持有該股的 ETF 的比重走勢（多條彩色折線，左軸）+ 股價走勢（單條灰色細線，右軸）。

此元件在 `StockDetailPanel` 內渲染，資料來源：
- 持股比重：`etf_weight_history`（每支持有此股的 ETF 各一條線）
- 股價：`stock_prices_daily`（單條）

#### Scenario: 多 ETF 持股比重同時顯示
- **WHEN** 點開某支被 3 支 ETF 持有的個股
- **THEN** 圖表左軸顯示 3 條彩色折線（每支 ETF 使用 etfRegistry 對應的顏色），右軸顯示 1 條股價線

#### Scenario: 左右軸語意清楚
- **WHEN** 圖表渲染完成
- **THEN** 左軸標籤「持股比重 (%)」，右軸標籤「股價 (NT$)」；圖例列出各 ETF 代號與顏色對應

#### Scenario: 資料 merge 對齊
- **WHEN** 前端 merge `etf_weight_history` 與 `stock_prices_daily`
- **THEN** 以 `data_date` 為 key join；股價非交易日斷線不填補；無持股比重資料的日期不補 0

#### Scenario: 時間區間切換
- **WHEN** 使用者點擊 30D / 60D / 90D 按鈕
- **THEN** 所有折線（比重 + 股價）同步縮放至對應區間

#### Scenario: 資料不足降級
- **WHEN** 該股在任一 ETF 的 `etf_weight_history` 均少於 7 天
- **THEN** 顯示「歷史資料不足，待累積後顯示」提示，不渲染圖表

#### Scenario: 僅被 1 支 ETF 持有
- **WHEN** 個股只被 1 支 ETF 持有
- **THEN** 左軸僅顯示 1 條比重線，圖例仍標示 ETF 代號，行為正常
