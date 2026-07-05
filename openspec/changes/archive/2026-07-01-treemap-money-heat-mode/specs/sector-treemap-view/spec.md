## MODIFIED Requirements

### Requirement: Treemap data pipeline step
The ETF pipeline SHALL include `SyncTreemapStep` as an auxiliary step that runs daily after `SaveSnapshotStep`. It SHALL fetch all listed stocks' closing prices, market caps, industry classifications, and daily traded turnover (成交值) via FinLab API, compute `change_pct`, and upsert into `market_treemap_daily` including the `turnover` column. Records older than 90 days SHALL be deleted on each successful run.

#### Scenario: 正常執行
- **WHEN** `SyncTreemapStep.run()` executes successfully
- **THEN** `market_treemap_daily` is populated with today's records (one row per stock)
- **THEN** each row includes `turnover` sourced from FinLab `price:成交金額` for the same trade date
- **THEN** records older than 90 calendar days are removed

#### Scenario: 成交值缺值
- **WHEN** FinLab `price:成交金額` is unavailable or missing a stock's value
- **THEN** that row's `turnover` is written as null
- **THEN** the remaining columns (close, market_cap, change_pct) are still written normally

#### Scenario: 步驟失敗不中斷 Pipeline
- **WHEN** `SyncTreemapStep.run()` raises any exception
- **THEN** the error is logged at ERROR level
- **THEN** pipeline execution continues to the next step without re-raising

## ADDED Requirements

### Requirement: Treemap money-heat display mode
The `/investment/sectors` treemap SHALL provide a display-dimension toggle with two options: "市值" (market cap, the default) and "資金熱度" (money heat). In "資金熱度" mode, each stock cell's area SHALL be proportional to `abs(change_pct) × turnover`, while cell color SHALL continue to follow the Taiwan convention based on `change_pct` (red = positive, green = negative). The default mode on first load SHALL be "市值".

#### Scenario: 切換至資金熱度模式
- **WHEN** the user selects the "資金熱度" toggle
- **THEN** cell areas are recomputed using `abs(change_pct) × turnover`
- **THEN** cell colors remain based on `change_pct` (Taiwan convention)
- **THEN** a hint label states the size encodes 量能估算 and explicitly notes it is NOT 法人資金流向

#### Scenario: 預設模式
- **WHEN** the treemap first loads
- **THEN** the display dimension is "市值" and cell area is proportional to market cap

#### Scenario: turnover 缺值於資金熱度模式
- **WHEN** a stock's `turnover` is null or zero while in "資金熱度" mode
- **THEN** that cell is assigned a minimal positive area instead of zero
- **THEN** no NaN value is produced and the treemap renders without blank cells

#### Scenario: 切回市值模式
- **WHEN** the user selects the "市值" toggle after using 資金熱度
- **THEN** cell areas revert to being proportional to market cap
