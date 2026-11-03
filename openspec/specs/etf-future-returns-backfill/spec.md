# Spec: ETF Future Returns Backfill

## Purpose

Ensure `etf_buying_patterns.future_returns` is kept complete by automatically backfilling missing horizon values after each pipeline run and providing a standalone disaster-recovery script.

---

## Requirements

### Requirement: BuyingPatternStep auto-backfills incomplete future_returns

At the end of each `BuyingPatternStep.run()` execution, the step SHALL read `etf_buying_patterns` records from the past 35 days and select every record that has at least one due horizon missing, where a horizon h (1, 2, 3, 5, 7, 10, 15, 20, 25, 30 calendar days) is due when `event_date + h <= today`. The step SHALL process all selected records without truncating the selection to a fixed batch size. For each record, the step SHALL fill missing values using the shared `forward_return` function: the target day is `event_date + h`, and when it lacks a close price in `stock_prices_daily` the next 2 calendar days are tried. Updates SHALL be written in batches of at most 1000 records per database round trip, using the incremental merge pattern `future_returns = COALESCE(future_returns, '{}') || :new_data`. Horizons with insufficient price data SHALL be skipped without error.

#### Scenario: Old events are not starved by new events

- **WHEN** the 35-day window holds 1,500 events and the 300 oldest events lack their 20-day return while their prices exist
- **THEN** all 300 oldest events receive key `"20"` in the same run

#### Scenario: All returns already populated

- **WHEN** a record has values for every due horizon
- **THEN** the record is not selected and no UPDATE is issued for it

#### Scenario: Target day falls on a weekend

- **WHEN** an event on Friday 2026-07-03 needs horizon 1 and the next close is Monday 2026-07-06
- **THEN** key `"1"` is filled from the Monday close

#### Scenario: SyncOHLCVStep failed the prior day

- **WHEN** `stock_prices_daily` has no entry for a required date or the following 2 days due to a prior step failure
- **THEN** the backfill skips that horizon key without error, to be retried on the next pipeline run while the event is inside the window


<!-- @trace
source: buying-pattern-baseline-ci
updated: 2026-11-03
code:
  - ETF/scripts/backfill_buying_pattern_returns.py
  - src/app/investment/breadth/components/TaiexRegimeCard.tsx
  - ETF/database/__pycache__/storage.cpython-313.pyc
  - src/app/actions/getTaiexRegime.ts
  - ETF/pipeline/steps/buying_pattern_step.py
  - src/app/actions/getBuyingPatternStats.ts
  - supabase/migrations/20261101120100_add_taiex_ma60_regime_daily.sql
  - ETF/pipeline/steps/backfill_future_returns.py
  - supabase/migrations/20261101120000_add_etf_buying_pattern_stats.sql
  - ETF/CLAUDE.md
  - src/lib/investment/taiexRegime.ts
  - src/app/investment/buying-patterns/page.tsx
  - ETF/pipeline/orchestrator.py
  - ETF/pipeline/steps/taiex_ma60_regime_step.py
  - src/app/investment/buying-patterns/PatternBaselineTable.tsx
  - src/lib/investment/buyingPatternStats.ts
  - src/app/investment/breadth/page.tsx
  - ETF/analysis/buying_pattern_stats.py
tests:
  - src/app/actions/__tests__/getBuyingPatternStats.test.ts
  - ETF/tests/test_buying_pattern_stats.py
  - src/app/investment/breadth/__tests__/page.test.tsx
  - ETF/tests/test_backfill_future_returns.py
  - src/app/investment/breadth/components/__tests__/TaiexRegimeCard.test.tsx
  - src/app/actions/__tests__/getTaiexRegime.test.ts
  - src/lib/investment/__tests__/taiexRegime.test.ts
  - ETF/tests/fixtures/taiex_close_low_19990101_20261016.csv
  - src/app/investment/buying-patterns/__tests__/PatternBaselineTable.test.tsx
  - ETF/tests/test_taiex_ma60_regime_step.py
-->

---
### Requirement: Standalone backfill script exists

A standalone script at `ETF/pipeline/steps/backfill_future_returns.py` SHALL implement a full-history backfill of `etf_buying_patterns.future_returns` for all ten horizons using the same shared `forward_return` function as `BuyingPatternStep`. It SHALL page through the whole table by ascending `id` (at most 1000 records per page) until no records remain, select records with at least one due horizon missing, query `stock_prices_daily` for the stocks on that page, and apply incremental merges in batches. The script SHALL be safe to run multiple times (idempotent).

#### Scenario: Manual disaster recovery run

- **WHEN** the script is executed via `uv run python ETF/pipeline/steps/backfill_future_returns.py`
- **THEN** it processes every historical record with missing due horizons across all pages, prints a summary of updated records, and exits with code 0

#### Scenario: More than one page of incomplete records

- **WHEN** 2,500 records lack due horizons and their prices exist
- **THEN** a single run updates all 2,500 records

#### Scenario: No records need backfill

- **WHEN** all `etf_buying_patterns` records have values for every due horizon that has price data
- **THEN** the script prints "No records need backfill" and exits with code 0


<!-- @trace
source: buying-pattern-baseline-ci
updated: 2026-11-03
code:
  - ETF/scripts/backfill_buying_pattern_returns.py
  - src/app/investment/breadth/components/TaiexRegimeCard.tsx
  - ETF/database/__pycache__/storage.cpython-313.pyc
  - src/app/actions/getTaiexRegime.ts
  - ETF/pipeline/steps/buying_pattern_step.py
  - src/app/actions/getBuyingPatternStats.ts
  - supabase/migrations/20261101120100_add_taiex_ma60_regime_daily.sql
  - ETF/pipeline/steps/backfill_future_returns.py
  - supabase/migrations/20261101120000_add_etf_buying_pattern_stats.sql
  - ETF/CLAUDE.md
  - src/lib/investment/taiexRegime.ts
  - src/app/investment/buying-patterns/page.tsx
  - ETF/pipeline/orchestrator.py
  - ETF/pipeline/steps/taiex_ma60_regime_step.py
  - src/app/investment/buying-patterns/PatternBaselineTable.tsx
  - src/lib/investment/buyingPatternStats.ts
  - src/app/investment/breadth/page.tsx
  - ETF/analysis/buying_pattern_stats.py
tests:
  - src/app/actions/__tests__/getBuyingPatternStats.test.ts
  - ETF/tests/test_buying_pattern_stats.py
  - src/app/investment/breadth/__tests__/page.test.tsx
  - ETF/tests/test_backfill_future_returns.py
  - src/app/investment/breadth/components/__tests__/TaiexRegimeCard.test.tsx
  - src/app/actions/__tests__/getTaiexRegime.test.ts
  - src/lib/investment/__tests__/taiexRegime.test.ts
  - ETF/tests/fixtures/taiex_close_low_19990101_20261016.csv
  - src/app/investment/buying-patterns/__tests__/PatternBaselineTable.test.tsx
  - ETF/tests/test_taiex_ma60_regime_step.py
-->

---
### Requirement: Incremental merge preserves existing values

All backfill UPDATE statements SHALL use `COALESCE(future_returns, '{}') || :new_data` to merge only new keys, never overwriting existing non-null values.

#### Scenario: Partial overwrite is rejected

- **WHEN** a record already has `future_returns = {"1": 0.02}` and backfill computes `{"1": 0.03, "5": 0.07}`
- **THEN** the final stored value is `{"1": 0.02, "5": 0.07}` (existing key preserved, new key added)

<!-- @trace
source: etf-design-improvements
updated: 2026-05-13
code:
  - ETF/pipeline/steps/scrape_step.py
  - ETF/pipeline/steps/shareholder_signal_step.py
  - ETF/pipeline/steps/signal_detect_step.py
  - ETF/pipeline/steps/cumulative_drag_step.py
  - ETF/pipeline/steps/matched_pairs_step.py
  - ETF/pipeline/steps/notify_step.py
  - ETF/pipeline/steps/overlap_compute_step.py
  - ETF/pipeline/steps/cleanup_step.py
  - ETF/pipeline/services.py
  - ETF/pipeline/steps/buying_pattern_step.py
  - ETF/pipeline/steps/frontrunning_step.py
  - ETF/pipeline/orchestrator.py
  - ETF/pipeline/steps/flow_compute_step.py
  - ETF/pipeline/steps/backfill_future_returns.py
  - ETF/pipeline/steps/active_share_step.py
  - ETF/pipeline/steps/save_snapshot_step.py
  - ETF/pipeline/steps/multi_etf_step.py
  - ETF/scripts/validate_registry_sync.py
  - src/app/investment/[etf]/page.tsx
  - ETF/pipeline/steps/news_context_step.py
  - ETF/pipeline/steps/sync_bare_k_step.py
  - src/components/features/investment/EtfHeader.tsx
  - ETF/pipeline/steps/aum_sync_step.py
  - ETF/pipeline/steps/sync_company_step.py
  - ETF/pipeline/context.py
  - ETF/pipeline/steps/weight_history_step.py
  - src/lib/investment/etfPageData.ts
  - ETF/pipeline/steps/sync_ohlcv_step.py
  - ETF/pipeline/steps/base.py
  - .github/workflows/etf_daily.yml
  - ETF/pipeline/steps/position_summary_step.py
  - ETF/pipeline/steps/diff_compute_step.py
  - ETF/pipeline/steps/price_attach_step.py
tests:
  - ETF/tests/test_backfill_future_returns.py
  - ETF/tests/test_validate_registry_sync.py
  - src/__tests__/components/EtfHeader.test.tsx
-->