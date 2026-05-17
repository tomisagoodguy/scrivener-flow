## ADDED Requirements

### Requirement: 計算族群品質指標並寫入 DB
Pipeline `SectorStrengthStep` SHALL compute three quality metrics per sector and store them in `sector_strength` table alongside existing return columns.

Metrics:
- `breadth`: ratio of constituent stocks with `ret_1d > 0` (0.0–1.0, 4 decimal places)
- `avg_amount_5d`: sum of constituent stocks 5-day average trading amount (NT dollars, integer)
- `strength_score`: `ret_1d × breadth` (signed float, represents both magnitude and breadth)

#### Scenario: 正常計算三項品質指標
- **WHEN** `SectorStrengthStep._run()` executes successfully
- **THEN** for each valid sector (stock_count >= 5), `breadth` SHALL be computed as count(ret_1d > 0) / stock_count
- **THEN** `avg_amount_5d` SHALL be computed as the sum of each constituent stock's 5-trading-day average amount (using `price:成交金額` iloc[-6:-1].mean())
- **THEN** `strength_score` SHALL be computed as `ret_1d × breadth`
- **THEN** all three values SHALL be upserted into `sector_strength` alongside existing columns

##### Example: breadth calculation
| Sector stocks ret_1d | breadth result |
|----------------------|----------------|
| [+2%, +1%, -0.5%, +0.3%, -1%] | 3/5 = 0.60 |
| [+0.1%, +0.2%, +0.5%, +1%, +0.8%] | 5/5 = 1.00 |
| [-1%, -2%, -0.5%, -0.1%, +0.1%] | 1/5 = 0.20 |

##### Example: strength_score calculation
| ret_1d | breadth | strength_score |
|--------|---------|----------------|
| 0.018  | 0.60    | 0.0108         |
| -0.005 | 0.20    | -0.0010        |
| 0.007  | 1.00    | 0.0070         |

#### Scenario: 成交金額資料不足時的處理
- **WHEN** a constituent stock has fewer than 5 trading days of `price:成交金額` data
- **THEN** that stock's avg_5d SHALL be NaN and SHALL be excluded from the sector `avg_amount_5d` sum
- **WHEN** all constituent stocks in a sector have NaN avg_5d
- **THEN** `avg_amount_5d` SHALL be stored as NULL in DB

#### Scenario: DB upsert 包含新欄位
- **WHEN** `_upsert_sectors()` is called
- **THEN** the INSERT statement SHALL include `breadth`, `avg_amount_5d`, `strength_score` columns
- **THEN** the ON CONFLICT DO UPDATE clause SHALL also update all three new columns
