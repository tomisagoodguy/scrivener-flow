## ADDED Requirements

### Requirement: Sector list supports ETF buying sort mode

The `/investment/sectors` page list view SHALL include an `'etf'` sort tab labeled `🏦 ETF買`.

When this tab is active, sectors SHALL be sorted descending by the count of distinct stock codes in that sector's ETF activity map (`etfActivity[category]?.stock_codes.length ?? 0`).

Sectors with no ETF buying activity SHALL appear at the bottom of the list.

The `'etf'` tab SHALL be hidden when the view mode is `heatmap` or `grouped`, matching the behavior of the existing `hit` tab.

#### Scenario: ETF buying sort orders sectors by signal count

- **WHEN** user clicks the `🏦 ETF買` tab
- **AND** sector `'半導體'` has 3 stocks bought by ETF managers and sector `'金融業'` has 1
- **THEN** `'半導體'` appears above `'金融業'` in the list

#### Scenario: ETF buy tab hidden in heatmap mode

- **WHEN** view mode is `heatmap`
- **THEN** the `🏦 ETF買` tab SHALL NOT be visible

### Requirement: ETF activity data passed to sector components from page

The `/investment/sectors` page Server Component SHALL fetch ETF sector activity data using `getEtfSectorActivity(sectorData.date)` and pass the resulting `EtfSectorActivityMap` to `SectorDashboard` as an `etfActivity` prop.

The fetch SHALL occur after `getSectorStrength()` resolves (to obtain the canonical date), then in parallel with `getFactorIC`.

#### Scenario: Page loads ETF activity in parallel with IC data

- **WHEN** the page renders
- **THEN** `getEtfSectorActivity` and `getFactorIC` are called concurrently after `getSectorStrength` completes
- **THEN** `SectorDashboard` receives both `etfActivity` and `icData` props
