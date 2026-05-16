## ADDED Requirements

### Requirement: 策略命中計算
`SectorStrengthStep` SHALL 在計算族群漲幅時，對每支成分股計算策略條件，並輸出 `is_strategy_hit` 與 `momentum_score`。

策略條件：
- `close > close.average(20)` 月線以上
- `close > close.average(60)` 季線以上
- `close > close.average(120)` 半年線以上
- `rev.average(3) > rev.average(12)` 月營收短期趨勢向上
- `momentum_score = (close / close.shift() - 1).rolling(5).mean().iloc[-1]`

#### Scenario: 四條件全部命中
- **WHEN** 個股滿足所有均線條件且月營收短期 > 長期
- **THEN** `is_strategy_hit = True`，`momentum_score` 為該股當日 5 日滾動均漲幅

#### Scenario: 任一條件不符或資料缺失
- **WHEN** 任一均線或月營收條件不成立，或相關欄位為 NaN
- **THEN** `is_strategy_hit = False`

#### Scenario: 月營收資料缺失（小型股）
- **WHEN** 該股無月營收資料（NaN）
- **THEN** 月營收條件視為 False，不影響其他族群的計算
