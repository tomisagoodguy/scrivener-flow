## ADDED Requirements

### Requirement: ETF page displays data date

The ETF holdings page SHALL display the `data_date` of the currently loaded ETF snapshot in the header area. The date SHALL be sourced from the maximum `data_date` value in `etf_holdings_snapshot` for the selected ETF code.

#### Scenario: Data is current (today or yesterday)

- **WHEN** the `data_date` is within 2 trading days of today
- **THEN** the date is displayed in neutral style (e.g., "資料日期：2026-05-13")

#### Scenario: Data is moderately stale (3–5 trading days old)

- **WHEN** the `data_date` is 3 to 5 trading days before today
- **THEN** the date is displayed with an orange warning indicator

#### Scenario: Data is severely stale (more than 5 trading days old)

- **WHEN** the `data_date` is more than 5 trading days before today
- **THEN** the date is displayed with a red warning indicator

### Requirement: ETF page displays data source badge

The ETF holdings page SHALL display a badge indicating the data source type of the selected ETF. The badge text and color SHALL differ between `official_api` and `pocket` sources.

#### Scenario: Official API source

- **WHEN** the ETF's `dataSource` in `etfRegistry.ts` is `official_api`
- **THEN** a badge reading "官網 API" is shown in a neutral or green color

#### Scenario: Pocket.tw source

- **WHEN** the ETF's `dataSource` in `etfRegistry.ts` is `pocket`
- **THEN** a badge reading "Pocket.tw" is shown in a grey color indicating potentially less frequent updates

### Requirement: Server action returns freshness metadata

The `getHoldings()` server action SHALL return a `meta` object containing `dataDate: string` (ISO date) and `dataSource: 'official_api' | 'pocket'` alongside the existing holdings array.

#### Scenario: Holdings loaded successfully

- **WHEN** `getHoldings(etfCode)` completes
- **THEN** the returned object includes `meta.dataDate` as the max `data_date` from the snapshot and `meta.dataSource` from `etfRegistry.ts`
