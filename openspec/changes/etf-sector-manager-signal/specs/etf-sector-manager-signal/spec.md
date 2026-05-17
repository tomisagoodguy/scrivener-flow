## ADDED Requirements

### Requirement: getEtfSectorActivity returns ETF buying activity per sector

The `getEtfSectorActivity(sectorDate: string)` Server Action SHALL query `etf_diff_logs` for BUY/IN events within the 14 calendar days ending on `sectorDate` (inclusive), where `abs(diff_weight) >= 0.05`, and cross-reference with `sector_strength_stocks` to produce a mapping of sector category to the distinct ETF codes and stock codes involved.

The return type SHALL be `EtfSectorActivityMap = Record<string, { etf_codes: string[]; stock_codes: string[] }>`.

If `sectorDate` is an empty string, the function SHALL return an empty object without querying the database.

#### Scenario: Sector with ETF buying activity

- **WHEN** `getEtfSectorActivity('2026-05-15')` is called
- **AND** `etf_diff_logs` contains rows for stock `2330` with `etf_code = '00981A'`, `change_type = 'BUY'`, `diff_weight = 0.12`, `data_date = '2026-05-14'`
- **AND** `sector_strength_stocks` contains a row for `stock_id = '2330'`, `category = '半導體', date = '2026-05-15'`
- **THEN** the returned map contains key `'半導體'` with `etf_codes` including `'00981A'` and `stock_codes` including `'2330'`

##### Example: multi-ETF multi-stock sector

- **GIVEN** category `'半導體'` contains stocks `2330`, `2303`
- **AND** `etf_diff_logs` (14-day window): 00981A BUY 2330 (diff_weight=0.12), 00980A IN 2303 (diff_weight=0.30), 00981A BUY 2303 (diff_weight=0.08)
- **WHEN** `getEtfSectorActivity` runs
- **THEN** result `'半導體'` = `{ etf_codes: ['00981A', '00980A'], stock_codes: ['2330', '2303'] }`

#### Scenario: ETF event below threshold is excluded

- **WHEN** an `etf_diff_logs` row has `change_type = 'BUY'` but `abs(diff_weight) = 0.03`
- **THEN** this row SHALL NOT contribute to any sector's `etf_codes` or `stock_codes`

#### Scenario: Empty sectorDate

- **WHEN** `getEtfSectorActivity('')` is called
- **THEN** the function returns `{}` without executing any database query

### Requirement: Sector row displays ETF manager buying badges

Each sector row in the list view SHALL display ETF manager issuer labels (e.g., 「統一」「野村」) for ETFs that have executed qualifying BUY/IN events on stocks in that sector within the 14-day window.

At most 3 issuer labels SHALL be shown. If more than 3 distinct issuers are active, the display SHALL show the first 3 plus a `+N` overflow indicator.

The labels SHALL use rose-colored styling (`bg-rose-100 text-rose-700`) to signal buying activity, consistent with Taiwan stock market convention (red = bullish).

If no ETF is buying in the sector, no badge SHALL be rendered (the row appears as before).

#### Scenario: Sector with two active ETF managers

- **WHEN** the sector `'半導體'` has `etf_codes = ['00981A', '00980A']` in its activity data
- **AND** `00981A` maps to issuer `'統一'` and `00980A` maps to issuer `'野村'`
- **THEN** the sector row displays badges `統一` and `野村` in rose style

#### Scenario: Sector with more than 3 active ETF managers

- **WHEN** a sector has 5 distinct issuer names in its ETF activity
- **THEN** the sector row displays the first 3 issuer badges plus `+2`

#### Scenario: Sector with no ETF buying activity

- **WHEN** a sector's category has no entry in the ETF activity map
- **THEN** the sector row displays no ETF badges

### Requirement: Expanded stock list marks ETF-bought stocks

When a sector is expanded to show its component stocks, each stock that appears in the sector's `etf_codes` activity data SHALL display a small ETF issuer label next to its name.

The label SHALL identify which specific ETF issuers bought that individual stock (not all ETFs buying in the broader sector).

#### Scenario: Stock bought by one ETF

- **WHEN** stock `2330` is in sector `'半導體'` and `getEtfSectorActivity` shows `stock_codes` includes `'2330'` with `etf_codes = ['00981A']`
- **THEN** the expanded row for `2330` displays the badge `統一`

#### Scenario: Stock not bought by any ETF

- **WHEN** a stock's `stock_id` does not appear in the sector's activity `stock_codes`
- **THEN** no ETF badge is rendered for that stock row
