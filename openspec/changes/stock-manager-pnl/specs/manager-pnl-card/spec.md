## ADDED Requirements

### Requirement: 損益摘要卡片顯示四項指標
卡片 SHALL 顯示：損益額（億元）、報酬率（%）、目前市值（億元）、累計買入成本（億元）。
損益為正時以紅色（`text-rose-600`）顯示，為負時以綠色（`text-emerald-600`）顯示（台股慣例）。

#### Scenario: 有完整資料
- **WHEN** `etf_weight_history` 有 shares 且 `stock_prices_daily` 有收盤價
- **THEN** 卡片顯示四項數字，損益正負以對應顏色標示

#### Scenario: 缺收盤價資料
- **WHEN** `stock_prices_daily` 無此股票資料
- **THEN** 卡片顯示「N/A — 無收盤價資料」，不顯示數字

#### Scenario: shares 欄位為 null
- **WHEN** `etf_weight_history.shares` 全為 null
- **THEN** 卡片顯示「N/A — 無股數資料」

---

### Requirement: P&L 曲線圖
卡片底部 SHALL 附一條累計損益曲線（時間軸 x，億元 y），與 reference 的黑線設計對齊。
曲線正值區填充淺紅色，負值區填充淺綠色。

#### Scenario: 曲線正常渲染
- **WHEN** 有損益序列資料（≥ 2 筆日期）
- **THEN** 顯示折線圖，x 為日期，y 為當日累計損益（億元）

#### Scenario: 資料不足
- **WHEN** 損益序列少於 2 筆
- **THEN** 不顯示曲線，僅顯示摘要數字

---

### Requirement: 資料起算日免責說明
卡片 SHALL 在底部顯示資料起算日，格式：`損益計算自 YYYY-MM-DD 起`。

#### Scenario: 顯示起算日
- **WHEN** 卡片渲染完成
- **THEN** 底部顯示 `etf_weight_history` 該 ETF × 該股票的最早 `data_date`
