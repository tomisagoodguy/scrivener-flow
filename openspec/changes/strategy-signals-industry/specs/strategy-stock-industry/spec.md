## ADDED Requirements

### Requirement: Strategy stock displays name and industry tag
The `getStrategySignals` Server Action SHALL return `name` and `industry` fields for each stock by performing a LEFT JOIN with `stock_basic_info` on `stock_code = stock_id`. Both fields SHALL be `string | null`.

#### Scenario: Stock exists in stock_basic_info
- **WHEN** a strategy signal stock_id matches a row in `stock_basic_info`
- **THEN** the returned `StrategyStock` contains `name` (name_short) and `industry` from that row

#### Scenario: Stock not in stock_basic_info
- **WHEN** a strategy signal stock_id has no matching row in `stock_basic_info`
- **THEN** the returned `StrategyStock` has `name: null` and `industry: null`

#### Scenario: industry is null in stock_basic_info
- **WHEN** the matching row exists but `industry` column is NULL
- **THEN** the returned `StrategyStock` has `industry: null` and the UI does not render an industry tag

### Requirement: StrategySignalCard displays name and industry tag
`StrategySignalCard` SHALL display each stock's `name_short` beside the stock code and an industry tag badge when `industry` is non-null.

#### Scenario: Both name and industry available
- **WHEN** a StrategyStock has non-null name and industry
- **THEN** the card shows: `<stock_code> <name>` and a small badge `<industry>` styled with blue tones

#### Scenario: Only stock code available
- **WHEN** name is null and industry is null
- **THEN** the card shows only the stock code with no badge

### Requirement: SyncCompanyStep writes industry to stock_basic_info
`SyncCompanyStep` SHALL write the `industry` field from FinLab `company_basic_info` into `stock_basic_info.industry` during each pipeline run.

#### Scenario: FinLab company_basic_info has industry column
- **WHEN** FinLab returns a DataFrame with an `industry` column
- **THEN** the value is upserted into `stock_basic_info.industry` for each stock_code

#### Scenario: FinLab company_basic_info missing industry column
- **WHEN** the returned DataFrame does not contain an `industry` column
- **THEN** `SyncCompanyStep` logs a warning and proceeds without writing `industry`, leaving existing values unchanged

##### Example: industry values
| stock_code | industry |
|-----------|----------|
| 2330 | 半導體 |
| 2454 | 半導體 |
| 2382 | 電腦及週邊設備 |
| 2317 | 電子零組件 |
