## ADDED Requirements

### Requirement: 持股比重 + 股價雙軸疊圖元件

`/investment/[etf]` 深潛頁的「持股明細」Tab SHALL 新增 `HoldingsPriceOverlayChart` 元件，對選定個股繪製雙軸折線圖：左軸為該股在此 ETF 的持股比重歷史（來自 `etf_weight_history`），右軸為股價走勢（來自 `stock_prices_daily`）。

#### Scenario: 選定個股後顯示圖表
- **WHEN** 使用者在持股列表點擊某支個股
- **THEN** 顯示雙軸折線圖：左軸（紫色線）= 持股比重 %，右軸（灰色細線）= 股價 NT$，X 軸 = 近 90 天日期

#### Scenario: 左右軸標籤清楚標示
- **WHEN** 圖表渲染完成
- **THEN** 左軸標籤顯示「持股比重 (%)」，右軸標籤顯示「股價 (NT$)」，圖例清楚區分兩條線

#### Scenario: 資料不足時的降級顯示
- **WHEN** 某支個股的 `etf_weight_history` 資料少於 7 天
- **THEN** 顯示「歷史資料不足」提示，不渲染圖表

---

### Requirement: 圖表時間區間可調整

使用者 SHALL 能切換圖表顯示的時間區間（30 天 / 60 天 / 90 天）。

#### Scenario: 切換時間區間
- **WHEN** 使用者點擊時間區間按鈕（30D / 60D / 90D）
- **THEN** 圖表重新渲染，X 軸範圍對應所選區間的資料

---

### Requirement: 圖表資料來源

前端 SHALL 透過現有 `etf_weight_history` 和 `stock_prices_daily` 表查詢資料，不新增資料表或 API endpoint。

#### Scenario: 資料 join 方式
- **WHEN** `HoldingsPriceOverlayChart` 載入
- **THEN** 以 `stock_code` + `data_date` 為 key，在前端 merge 兩組資料，對齊相同日期的比重與股價

#### Scenario: 股價資料缺漏日期
- **WHEN** 某日有持股比重但無對應股價（非交易日）
- **THEN** 股價折線在該日斷點，不以 0 或內插值填補
