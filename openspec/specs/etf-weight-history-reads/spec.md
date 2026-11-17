# etf-weight-history-reads Specification

## Purpose

Defines how the application reads ETF weight history so that every screen receives complete, current data despite the PostgREST 1000-row response cap, and so that large history pages load only the data the viewer asks for.

## Requirements

### Requirement: Paginated reads return every matching row

The shared paginated reader (`fetchAllRows`) SHALL request ranges of at most 1000 rows, in batches of `concurrency` consecutive ranges (default 1), until a page in range order returns fewer rows than the page size, and SHALL return the concatenation of all pages up to and including that page in range order. Pages after the first short page SHALL be discarded. If any requested page returns an error, the reader SHALL throw an `Error` whose message contains the caller-supplied table label and the error message, and SHALL NOT return partial results.

#### Scenario: Multiple pages are merged

- **WHEN** a query matches 2,905 rows
- **THEN** the reader requests ranges 0–999, 1000–1999, and 2000–2999 and returns 2,905 rows

##### Example: page boundaries

| Matching rows | Ranges requested | Rows returned |
| ------------- | ---------------- | ------------- |
| 0 | 0–999 | 0 |
| 1000 | 0–999, 1000–1999 | 1000 |
| 2905 | 0–999, 1000–1999, 2000–2999 | 2905 |

#### Scenario: Pages are requested in concurrent batches

- **WHEN** the reader is called with `concurrency` 4
- **THEN** it requests 4 consecutive ranges at a time, requests the next batch only when all 4 pages are full, and returns the rows in range order

##### Example: concurrent batch boundaries

| Matching rows | Concurrency | Ranges requested | Rows returned |
| ------------- | ----------- | ---------------- | ------------- |
| 0 | 4 | 0–999, 1000–1999, 2000–2999, 3000–3999 | 0 |
| 2905 | 4 | 0–999, 1000–1999, 2000–2999, 3000–3999 | 2905 |
| 4000 | 4 | 0–999 … 3000–3999, then 4000–4999 … 7000–7999 | 4000 |
| 8808 | 4 | 0–999 … 7000–7999, then 8000–8999 … 11000–11999 | 8808 |

#### Scenario: Page error is surfaced

- **WHEN** the second page returns an error with message "timeout" for label `etf_weight_history`
- **THEN** the reader throws an Error whose message contains `etf_weight_history` and `timeout`


<!-- @trace
source: parallel-weight-history-pages
updated: 2026-11-17
code:
  - src/lib/supabase/fetchAllRows.ts
  - src/lib/investment/etfPageData.ts
  - src/lib/investment/weightHistoryData.ts
tests:
  - src/lib/investment/__tests__/etfPageData.test.ts
  - src/lib/supabase/__tests__/fetchAllRows.test.ts
  - src/lib/investment/__tests__/weightHistoryData.test.ts
-->

---
### Requirement: Weight history queries use a stable order

Every paginated query SHALL order by a column set that is unique per row, so that consecutive pages neither repeat nor skip rows: queries against `etf_weight_history` SHALL order by `data_date`, then `etf_code`, then `stock_code`; queries against `etf_stock_overlap` (one row per stock per date, no `etf_code` column) SHALL order by `data_date`, then `stock_code`.

#### Scenario: Rows sharing a date are paginated deterministically

- **WHEN** more than 1000 rows share the same `data_date`
- **THEN** the combined result contains each `(etf_code, stock_code, data_date)` exactly once


<!-- @trace
source: fix-weight-history-row-cap
updated: 2026-11-15
code:
  - src/lib/investment/etfPageData.ts
  - src/components/features/investment/HoldingsPriceOverlayChart.tsx
  - src/app/actions/getFanBreakoutSignals.ts
  - src/lib/supabase/fetchAllRows.ts
  - src/app/investment/history/page.tsx
  - src/app/actions/getWeightHistory.ts
  - src/components/features/investment/StockWeightCrossEtfChart.tsx
  - src/components/features/investment/EtfRankingHistoryChart.tsx
  - src/hooks/investment/useOnDemandWeightHistory.ts
  - src/components/features/investment/HistoryTabs.tsx
  - src/lib/investment/weightHistoryData.ts
  - src/app/api/investment/etf-weight-history/route.ts
tests:
  - src/app/api/investment/etf-weight-history/__tests__/route.test.ts
  - src/lib/supabase/__tests__/fetchAllRows.test.ts
  - src/lib/investment/__tests__/etfPageData.test.ts
  - src/lib/investment/__tests__/weightHistoryData.test.ts
  - src/hooks/investment/__tests__/useOnDemandWeightHistory.test.ts
  - src/components/features/investment/__tests__/WeightHistoryLoadStates.test.tsx
  - src/app/actions/__tests__/getWeightHistory.test.ts
-->

---
### Requirement: Stock weight history API returns complete history

`GET /api/investment/etf-weight-history?code=<stock>` SHALL return, for every registered ETF, all rows of `etf_weight_history` for that stock, and the latest date returned for each ETF SHALL equal that ETF's latest `data_date` for the stock in `etf_holdings_snapshot`.

#### Scenario: Stock with more than 1000 history rows

- **WHEN** the API is called for stock 2330, which has 2,905 rows across all ETFs
- **THEN** the response contains 2,905 data points in total and the latest date is the latest snapshot date for 2330


<!-- @trace
source: fix-weight-history-row-cap
updated: 2026-11-15
code:
  - src/lib/investment/etfPageData.ts
  - src/components/features/investment/HoldingsPriceOverlayChart.tsx
  - src/app/actions/getFanBreakoutSignals.ts
  - src/lib/supabase/fetchAllRows.ts
  - src/app/investment/history/page.tsx
  - src/app/actions/getWeightHistory.ts
  - src/components/features/investment/StockWeightCrossEtfChart.tsx
  - src/components/features/investment/EtfRankingHistoryChart.tsx
  - src/hooks/investment/useOnDemandWeightHistory.ts
  - src/components/features/investment/HistoryTabs.tsx
  - src/lib/investment/weightHistoryData.ts
  - src/app/api/investment/etf-weight-history/route.ts
tests:
  - src/app/api/investment/etf-weight-history/__tests__/route.test.ts
  - src/lib/supabase/__tests__/fetchAllRows.test.ts
  - src/lib/investment/__tests__/etfPageData.test.ts
  - src/lib/investment/__tests__/weightHistoryData.test.ts
  - src/hooks/investment/__tests__/useOnDemandWeightHistory.test.ts
  - src/components/features/investment/__tests__/WeightHistoryLoadStates.test.tsx
  - src/app/actions/__tests__/getWeightHistory.test.ts
-->

---
### Requirement: ETF ranking history returns complete history

`getRankingHistory(etfCode)` SHALL return all rows of `etf_weight_history` for the ETF, with the latest returned `data_date` equal to the ETF's latest `data_date` in `etf_holdings_snapshot`.

#### Scenario: ETF with more than 1000 history rows

- **WHEN** `getRankingHistory('00981A')` is called and the ETF has more than 1000 rows
- **THEN** the number of returned rows equals the ETF's row count in `etf_holdings_snapshot`


<!-- @trace
source: fix-weight-history-row-cap
updated: 2026-11-15
code:
  - src/lib/investment/etfPageData.ts
  - src/components/features/investment/HoldingsPriceOverlayChart.tsx
  - src/app/actions/getFanBreakoutSignals.ts
  - src/lib/supabase/fetchAllRows.ts
  - src/app/investment/history/page.tsx
  - src/app/actions/getWeightHistory.ts
  - src/components/features/investment/StockWeightCrossEtfChart.tsx
  - src/components/features/investment/EtfRankingHistoryChart.tsx
  - src/hooks/investment/useOnDemandWeightHistory.ts
  - src/components/features/investment/HistoryTabs.tsx
  - src/lib/investment/weightHistoryData.ts
  - src/app/api/investment/etf-weight-history/route.ts
tests:
  - src/app/api/investment/etf-weight-history/__tests__/route.test.ts
  - src/lib/supabase/__tests__/fetchAllRows.test.ts
  - src/lib/investment/__tests__/etfPageData.test.ts
  - src/lib/investment/__tests__/weightHistoryData.test.ts
  - src/hooks/investment/__tests__/useOnDemandWeightHistory.test.ts
  - src/components/features/investment/__tests__/WeightHistoryLoadStates.test.tsx
  - src/app/actions/__tests__/getWeightHistory.test.ts
-->

---
### Requirement: Holdings price overlay chart reads the full period

`HoldingsPriceOverlayChart` SHALL load all `etf_weight_history` rows for the selected stock, ETFs, and period (30, 60, or 90 days), so that each ETF line ends at its latest `data_date` within the period.

#### Scenario: Popular stock over 90 days

- **WHEN** the chart loads 90 days for a stock with 1,272 rows in that period
- **THEN** all 1,272 rows are loaded and each ETF line ends on its latest snapshot date


<!-- @trace
source: fix-weight-history-row-cap
updated: 2026-11-15
code:
  - src/lib/investment/etfPageData.ts
  - src/components/features/investment/HoldingsPriceOverlayChart.tsx
  - src/app/actions/getFanBreakoutSignals.ts
  - src/lib/supabase/fetchAllRows.ts
  - src/app/investment/history/page.tsx
  - src/app/actions/getWeightHistory.ts
  - src/components/features/investment/StockWeightCrossEtfChart.tsx
  - src/components/features/investment/EtfRankingHistoryChart.tsx
  - src/hooks/investment/useOnDemandWeightHistory.ts
  - src/components/features/investment/HistoryTabs.tsx
  - src/lib/investment/weightHistoryData.ts
  - src/app/api/investment/etf-weight-history/route.ts
tests:
  - src/app/api/investment/etf-weight-history/__tests__/route.test.ts
  - src/lib/supabase/__tests__/fetchAllRows.test.ts
  - src/lib/investment/__tests__/etfPageData.test.ts
  - src/lib/investment/__tests__/weightHistoryData.test.ts
  - src/hooks/investment/__tests__/useOnDemandWeightHistory.test.ts
  - src/components/features/investment/__tests__/WeightHistoryLoadStates.test.tsx
  - src/app/actions/__tests__/getWeightHistory.test.ts
-->

---
### Requirement: History page loads data on demand

`/investment/history` SHALL load on the server only the holdings of each ETF's latest `data_date`, used for the stock list and the consensus holding counts. When the viewer selects an ETF in the ranking tab, the page SHALL load that ETF's weight history for the last 90 days; when the viewer selects a stock in the cross-ETF tab, the page SHALL load that stock's weight history across all ETFs for the last 90 days. While a selection is loading, the chart area SHALL show a loading state, and a failed load SHALL show an error message instead of an empty chart. The header SHALL show the number of market trading days in the last 90 days.

#### Scenario: Initial page load stays small

- **WHEN** the page is rendered on the server
- **THEN** weight history queries fetch at most 2,000 rows in total

#### Scenario: Selecting an ETF loads its 90-day history

- **WHEN** the viewer selects ETF 00981A in the ranking tab
- **THEN** the chart covers every `data_date` of 00981A within the last 90 days

#### Scenario: Selecting a stock loads its cross-ETF history

- **WHEN** the viewer selects stock 2330 in the cross-ETF tab
- **THEN** the chart covers every `data_date` of 2330 across all ETFs within the last 90 days

#### Scenario: Load failure is visible

- **WHEN** loading the selected ETF's history fails
- **THEN** the chart area shows an error message and no empty chart is presented as data


<!-- @trace
source: fix-weight-history-row-cap
updated: 2026-11-15
code:
  - src/lib/investment/etfPageData.ts
  - src/components/features/investment/HoldingsPriceOverlayChart.tsx
  - src/app/actions/getFanBreakoutSignals.ts
  - src/lib/supabase/fetchAllRows.ts
  - src/app/investment/history/page.tsx
  - src/app/actions/getWeightHistory.ts
  - src/components/features/investment/StockWeightCrossEtfChart.tsx
  - src/components/features/investment/EtfRankingHistoryChart.tsx
  - src/hooks/investment/useOnDemandWeightHistory.ts
  - src/components/features/investment/HistoryTabs.tsx
  - src/lib/investment/weightHistoryData.ts
  - src/app/api/investment/etf-weight-history/route.ts
tests:
  - src/app/api/investment/etf-weight-history/__tests__/route.test.ts
  - src/lib/supabase/__tests__/fetchAllRows.test.ts
  - src/lib/investment/__tests__/etfPageData.test.ts
  - src/lib/investment/__tests__/weightHistoryData.test.ts
  - src/hooks/investment/__tests__/useOnDemandWeightHistory.test.ts
  - src/components/features/investment/__tests__/WeightHistoryLoadStates.test.tsx
  - src/app/actions/__tests__/getWeightHistory.test.ts
-->

---
### Requirement: Consensus trend aggregates every overlap row

The consensus trend on `/investment/history` SHALL aggregate all `etf_stock_overlap` rows of the last 90 days, so that the trend contains one point per distinct `data_date` in that period.

#### Scenario: Overlap rows exceed 1000

- **WHEN** the last 90 days contain 25,730 overlap rows across 64 dates
- **THEN** the consensus trend contains 64 points

<!-- @trace
source: fix-weight-history-row-cap
updated: 2026-11-15
code:
  - src/lib/investment/etfPageData.ts
  - src/components/features/investment/HoldingsPriceOverlayChart.tsx
  - src/app/actions/getFanBreakoutSignals.ts
  - src/lib/supabase/fetchAllRows.ts
  - src/app/investment/history/page.tsx
  - src/app/actions/getWeightHistory.ts
  - src/components/features/investment/StockWeightCrossEtfChart.tsx
  - src/components/features/investment/EtfRankingHistoryChart.tsx
  - src/hooks/investment/useOnDemandWeightHistory.ts
  - src/components/features/investment/HistoryTabs.tsx
  - src/lib/investment/weightHistoryData.ts
  - src/app/api/investment/etf-weight-history/route.ts
tests:
  - src/app/api/investment/etf-weight-history/__tests__/route.test.ts
  - src/lib/supabase/__tests__/fetchAllRows.test.ts
  - src/lib/investment/__tests__/etfPageData.test.ts
  - src/lib/investment/__tests__/weightHistoryData.test.ts
  - src/hooks/investment/__tests__/useOnDemandWeightHistory.test.ts
  - src/components/features/investment/__tests__/WeightHistoryLoadStates.test.tsx
  - src/app/actions/__tests__/getWeightHistory.test.ts
-->

---
### Requirement: ETF ranking history is cached

`getRankingHistory(etfCode)` SHALL read through a cache keyed by the ETF code with a one-hour lifetime, using the public read client, so that repeated loads of the same ETF page within that hour do not query the database. A failed read SHALL throw and SHALL NOT store a result in the cache.

#### Scenario: Repeated load within the hour

- **WHEN** `getRankingHistory('00981A')` is called twice within one hour
- **THEN** the second call returns the same rows without issuing database requests

<!-- @trace
source: parallel-weight-history-pages
updated: 2026-11-17
code:
  - src/lib/supabase/fetchAllRows.ts
  - src/lib/investment/etfPageData.ts
  - src/lib/investment/weightHistoryData.ts
tests:
  - src/lib/investment/__tests__/etfPageData.test.ts
  - src/lib/supabase/__tests__/fetchAllRows.test.ts
  - src/lib/investment/__tests__/weightHistoryData.test.ts
-->