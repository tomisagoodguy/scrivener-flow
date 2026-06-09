# etf-divergence-detection Specification

## Purpose

Detects stocks where different ETFs take opposing actions (one buying while another sells) on the same trading day. Results are persisted to `etf_stock_divergence` and surfaced in the frontend consensus page as a "分歧" tab.

## Requirements

### Requirement: DivergenceDetectStep identifies same-day opposing ETF actions

`ETF/pipeline/steps/divergence_detect_step.py` SHALL be an auxiliary pipeline step (inheriting `BaseStep`) that reads `etf_diff_logs` rows for the current pipeline `data_date` from Supabase. It SHALL group rows by `stock_code` and identify stocks where at least one ETF has a `change_type` of `BUY` or `IN` AND at least one different ETF has a `change_type` of `SELL` or `OUT` on the same `data_date`.

The step SHALL be classified as auxiliary: its `execute()` method SHALL wrap all logic in `try/except`, log errors, and NOT re-raise, ensuring pipeline continuity.

#### Scenario: Divergence detected for a stock

- **WHEN** `data_date` is `2026-06-09`
- **AND** `etf_diff_logs` contains stock `2330` with ETF `00981A` at `change_type=BUY` and ETF `00991A` at `change_type=SELL`
- **THEN** stock `2330` is included in the divergence result set with `buy_etfs=[{etfid:"00981A",...}]` and `sell_etfs=[{etfid:"00991A",...}]`

#### Scenario: No divergence when all ETFs agree

- **WHEN** all ETFs with `data_date=2026-06-09` show `BUY` or `IN` for stock `2330`
- **THEN** stock `2330` is NOT included in the divergence result set

#### Scenario: Step failure does not break pipeline

- **WHEN** the Supabase query raises an exception
- **THEN** the step logs an error and returns `ctx` unmodified; no exception propagates to the orchestrator

---
### Requirement: etf_stock_divergence table stores daily divergence results

A migration SHALL create the `etf_stock_divergence` table with the following schema:

```sql
CREATE TABLE IF NOT EXISTS etf_stock_divergence (
    id           bigserial   PRIMARY KEY,
    data_date    date        NOT NULL,
    stock_code   text        NOT NULL,
    stock_name   text,
    buy_etfs     jsonb       NOT NULL DEFAULT '[]',
    sell_etfs    jsonb       NOT NULL DEFAULT '[]',
    buy_count    int         NOT NULL DEFAULT 0,
    sell_count   int         NOT NULL DEFAULT 0,
    created_at   timestamptz NOT NULL DEFAULT now(),
    UNIQUE (data_date, stock_code)
);
```

`buy_etfs` and `sell_etfs` SHALL be JSON arrays of objects with shape `{"etfid": string, "fund_name": string, "diff_shares": number}`.

The step SHALL upsert divergence records using `(data_date, stock_code)` as the conflict key, overwriting `buy_etfs`, `sell_etfs`, `buy_count`, `sell_count` on conflict.

#### Scenario: Upsert on re-run

- **WHEN** `DivergenceDetectStep` runs twice for the same `data_date`
- **THEN** the second run overwrites the first with current values; no duplicate rows exist

#### Scenario: No divergence results

- **WHEN** no stocks meet the divergence criteria for `data_date`
- **THEN** the step writes zero rows and logs an info message; it does NOT delete existing rows for other dates

---
### Requirement: Orchestrator registers DivergenceDetectStep after OverlapComputeStep

`ETF/pipeline/orchestrator.py` SHALL include `DivergenceDetectStep` in the step sequence, positioned after `OverlapComputeStep` and before `FlowComputeStep`. The step SHALL receive `ctx` and return `ctx`.

#### Scenario: Step executed in correct order

- **WHEN** the pipeline runs successfully
- **THEN** `DivergenceDetectStep.execute()` is called after `OverlapComputeStep.execute()` completes

---
### Requirement: Frontend consensus page displays divergence tab

`src/app/investment/consensus/page.tsx` SHALL display a "分歧" (Divergence) tab alongside existing consensus tabs. The tab SHALL fetch `etf_stock_divergence` rows for the most recent `data_date` available in the table (using the Supabase service client). Each row SHALL display: stock code, stock name, buying ETF list (with ETF name and diff_shares in 張), selling ETF list (with ETF name and diff_shares in 張). Stocks SHALL be sorted by total ETF count (`buy_count + sell_count`) descending.

`diff_shares` in the `buy_etfs`/`sell_etfs` JSON is raw shares (股); the UI SHALL convert to 張 by dividing by 1000 and rounding.

#### Scenario: Divergence tab renders with data

- **WHEN** `etf_stock_divergence` has rows for the latest date
- **THEN** the "分歧" tab shows each stock with color-coded buying ETFs (rose) and selling ETFs (emerald), sorted by total count descending

#### Scenario: Divergence tab renders empty state

- **WHEN** `etf_stock_divergence` has no rows for the latest date
- **THEN** the tab shows an empty state message: "今日無跨 ETF 分歧標的"

#### Scenario: Color convention follows Taiwan stock convention

- **WHEN** displaying buying ETF entries
- **THEN** buying ETFs use `text-rose-600` (red = bullish)
- **AND** selling ETFs use `text-emerald-600` (green = bearish)
