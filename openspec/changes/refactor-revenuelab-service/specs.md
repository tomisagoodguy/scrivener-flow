# Specs: Refactor Revenue Lab Service

## 1. Repositories (Data Access)

### `src/repositories/revenueRepo.ts`

**Function**: `fetchMonthlyRevenue(year: number, filters?: { low: number; high: number })`

- **Input**: `year` (number), `filters` (optional object with `low`, `high` thresholds)
- **Output**: `Promise<RevenueRow[]>`
- **Logic**:
  - Construct date ranges based on the input year (e.g., previous Dec to current Nov).
  - Query `stock_revenue_monthly` table via Supabase client.
  - Apply `gte`, `lte` on date and `revenue_yoy` filters.
  - Return raw data rows.

### `src/repositories/priceRepo.ts`

**Function**: `fetchPriceData(year: number)`

- **Input**: `year` (number)
- **Output**: `Promise<{ start: PriceRow[]; end: PriceRow[] }>`
- **Logic**:
  - Construct date ranges for H1 (Start) and H2 (End).
  - Query `stock_prices_daily` table.
  - Fetch 'Open' prices for the start period and 'Close' prices for the end period.
  - Return an object containing both datasets.

### `src/repositories/stockRepo.ts`

**Function**: `fetchStockNames(codes: string[])`

- **Input**: `codes` (string array)
- **Output**: `Promise<Map<string, string>>`
- **Logic**:
  - Query `stock_basic_info` table filtering by the provided stock codes.
  - Return a Map where key is `stock_code` and value is `name_short`.

## 2. Domain Calculators (Business Logic)

### `src/services/revenueLab/calculators/winRateCalculator.ts`

**Function**: `calculateWinRateBuckets(revenue: RevenueRow[], prices: {start, end}, names: Map, config)`

- **Input**: Raw data arrays and configuration.
- **Output**: `WinRateYearData`
- **Logic**:
  - Pure function.
  - Calculate burst counts for each stock from `revenue`.
  - Calculate annual returns from `prices`.
  - Group stocks by burst count.
  - Compute statistics (WinRate, AvgReturn, StdDev) for each group (Bucket).
  - Sort buckets and format the final `WinRateYearData` object.

### `src/services/revenueLab/calculators/heatmapCalculator.ts`

**Function**: `calculateHeatmapCells(revenue: RevenueRow[], prices: {start, end})`

- **Input**: Raw data arrays.
- **Output**: `HeatmapYearData`
- **Logic**:
  - Pure function.
  - Calculate annual returns for all stocks.
  - Classify stocks into Return Bins (e.g., "-10% to 0%").
  - Group revenue data by (Bin, Month).
  - Compute statistics (Median, Mean) for each cell.
  - Format `HeatmapYearData`.

## 3. Integration & Testing

### `src/services/revenueLab/index.ts`

- **Role**: Orchestrator (Facade)
- **Exports**: `fetchWinRateFromDB`, `fetchHeatmapFromDB`
- **Logic**:
  - Call Repositories to get data.
  - Call Calculators to transform data.
  - Return result.
  - Catch and log errors.

### Verification Criteria

- All database queries are isolated in `src/repositories`.
- All statistical implementation details are moved to `src/services/revenueLab/calculators`.
- `revenueLabService.ts` contains NO direct `supabase` calls and NO math logic.
- `yarn dev` runs without errors and the Revenue Lab tabs load data correctly.
- `yarn tsc` passes.
