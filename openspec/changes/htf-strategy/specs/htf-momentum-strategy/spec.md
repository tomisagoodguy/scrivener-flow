## ADDED Requirements

### Requirement: HTF 型態選股條件
系統 SHALL 篩選同時符合旗桿夠高、旗面收窄、量能萎縮、均線支撐四個條件的台股標的。

具體條件定義：
1. **旗桿**：`close / close.shift(20) - 1 > 0.30`（近 20 交易日漲幅 > 30%）
2. **旗面收窄**：`std(daily_pct_change, 10) < std(daily_pct_change, 20) × 0.70`
3. **量能萎縮**：`vol.rolling(10).mean() < vol.rolling(20).mean() × 0.80`
4. **均線支撐**：`close > close.rolling(20).mean()`
5. **流動性**：`amt > 3 × 10^7`（每日成交金額 > 3000 萬）

#### Scenario: 全部條件成立
- **WHEN** 某標的近 20 日漲逾 30%、近 10 日波幅比近 20 日波幅小 30% 以上、近 10 日均量低於近 20 日均量 80%、收盤在 MA20 以上、且成交金額 > 3000 萬
- **THEN** 該標的被納入候選池

#### Scenario: 任一條件不成立
- **WHEN** 旗桿、旗面、量能、均線或流動性任一條件不符合
- **THEN** 該標的不被選入，即使其餘條件全部成立

### Requirement: 最終持倉輸出
系統 SHALL 從候選池中依旗桿漲幅（`close / close.shift(20) - 1`）由大至小取前 15 名，回傳 Boolean FinlabDataFrame。

#### Scenario: 候選池 ≥ 15 支
- **WHEN** 同一日符合條件的標的達 15 支以上
- **THEN** 回傳旗桿漲幅最大的前 15 支，值為 True

#### Scenario: 候選池 < 15 支
- **WHEN** 同一日符合條件的標的不足 15 支
- **THEN** 回傳所有符合條件的標的，不補足至 15

#### Scenario: 候選池為空
- **WHEN** 某日沒有任何標的同時符合全部條件
- **THEN** 該日所有 columns 為 False（不回傳 None）

### Requirement: 策略識別符與描述
系統 SHALL 使用 `strategy_id = "htf_momentum"`、`description = "HTF 動能旗型選股"` 作為策略識別符。

#### Scenario: strategy_id 唯一
- **WHEN** `ALL_STRATEGIES` 清單初始化時
- **THEN** 不存在任何其他策略的 `strategy_id` 等於 `"htf_momentum"`

### Requirement: 資料 universe
系統 SHALL 在 `data.universe('TSE_OTC')` context 內取得所有所需資料（收盤價、成交量、成交金額）。

#### Scenario: universe 隔離
- **WHEN** `_build_position()` 執行
- **THEN** 所有 `data.get()` 呼叫均在 `with data.universe('TSE_OTC'):` 區塊內，避免污染共用快取
