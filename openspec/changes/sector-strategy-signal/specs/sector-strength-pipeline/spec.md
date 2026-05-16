## MODIFIED Requirements

### Requirement: DB Schema - sector_strength_stocks
`sector_strength_stocks` table SHALL 包含欄位：`id`, `date`, `category`, `stock_id`, `stock_name`, `ret_1d`, `ret_5d`, `ret_20d`, `is_strategy_hit`, `momentum_score`, `created_at`。

#### Scenario: Upsert 包含策略欄位
- **WHEN** SectorStrengthStep 執行 upsert
- **THEN** `is_strategy_hit` 與 `momentum_score` 一併寫入
- **WHEN** 同一 date + category + stock_id 已存在
- **THEN** ON CONFLICT DO UPDATE 更新所有欄位含新欄位
