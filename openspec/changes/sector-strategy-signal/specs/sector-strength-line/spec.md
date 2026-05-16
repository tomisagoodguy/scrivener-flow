## MODIFIED Requirements

### Requirement: LINE 族群摘要附加策略命中清單
`build_sector_summary()` SHALL 在族群摘要後，附加全市場 `is_strategy_hit = True` 且在強勢族群（ret_1d 前 15 名）內的個股，按 `momentum_score` 降序取前 10 名。

#### Scenario: 有命中股
- **WHEN** 當日 sector_strength_stocks 有 is_strategy_hit = True 的記錄
- **THEN** 在族群摘要之後附加：
  ```
  ⚡ 族群策略命中（均線多頭＋月營收成長）
  1. 群創光電 3481  [半導體:記憶體IC]  +2.1%
  2. ...
  ```

#### Scenario: 無命中股
- **WHEN** 當日無任何命中股
- **THEN** 跳過此區塊，不顯示標題
