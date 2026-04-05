## ADDED Requirements

### Requirement: RankingTrendChart 從 etf_weight_history 讀取資料
`getRankingHistory()` SHALL 優先從 `etf_weight_history` 表讀取資料。當該表無資料時，SHALL fallback 至 `etf_holdings_snapshot` 並在 server side 補算 `rank` 欄位。

#### Scenario: etf_weight_history 有資料時
- **WHEN** `etf_weight_history` 的 row count > 0
- **THEN** `getRankingHistory()` 回傳 `etf_weight_history` 的資料，含 `rank` 欄位

#### Scenario: etf_weight_history 為空時 fallback
- **WHEN** `etf_weight_history` 的 row count = 0
- **THEN** `getRankingHistory()` 改從 `etf_holdings_snapshot` 撈取，並在 server side 依 weight 降序補算 `rank`（1 = 最大）

### Requirement: RankingTrendChart 支援 Top N 篩選 tab
RankingTrendChart 組件 SHALL 提供 Top5 / Top10 / Top15 / 全部 四個篩選 tab。

#### Scenario: 選擇 Top5
- **WHEN** 使用者點選「Top5」tab
- **THEN** 圖表只顯示最新日期 rank ≤ 5 的股票走勢線，排名列表同步更新

#### Scenario: 選擇 Top10（預設）
- **WHEN** 組件初始載入
- **THEN** 預設選中「Top10」tab，圖表顯示最新日期 rank ≤ 10 的股票

#### Scenario: 選擇全部
- **WHEN** 使用者點選「全部」tab
- **THEN** 圖表顯示所有成分股走勢線（數量可能超過 10 條）

### Requirement: 圖表利用預計算 rank 欄位
當資料來自 `etf_weight_history` 時，RankingTrendChart SHALL 直接使用 `rank` 欄位作為 Y 軸值，不在 client side 重新計算。

#### Scenario: 使用預計算 rank
- **WHEN** 資料包含非 null 的 `rank` 欄位
- **THEN** 圖表 Y 軸直接使用 `rank` 值，不依 weight 重新排序計算
