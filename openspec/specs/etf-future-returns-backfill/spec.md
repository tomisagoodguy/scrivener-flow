# Spec: ETF Future Returns Backfill

## Purpose

Ensure `etf_buying_patterns.future_returns` is kept complete by automatically backfilling missing horizon values after each pipeline run and providing a standalone disaster-recovery script.

---

## Requirements

### Requirement: BuyingPatternStep auto-backfills incomplete future_returns

At the end of each `BuyingPatternStep.run()` execution, the step SHALL query `etf_buying_patterns` for records from the past 30 days where `future_returns` contains null-valued keys for any standard horizon (1, 5, 10, 20 trading days). For each such record, the step SHALL attempt to fill the missing return values from `stock_prices_daily`, using the incremental merge pattern `future_returns = COALESCE(future_returns, '{}') || :new_data`. Records with insufficient price history SHALL be skipped without error.

#### Scenario: Prior day has missing 1-day return

- **WHEN** yesterday's buying pattern record has `future_returns = {"1": null, "5": 0.03, "10": null, "20": null}`
- **THEN** the step queries `stock_prices_daily` for day +1 close and fills `future_returns["1"]`; keys where price data exists are updated; keys still lacking price data remain null

#### Scenario: All returns already populated

- **WHEN** a record has all four horizon keys with non-null values
- **THEN** the record is skipped; no UPDATE is issued

#### Scenario: SyncOHLCVStep failed the prior day

- **WHEN** `stock_prices_daily` has no entry for a required date due to a prior step failure
- **THEN** the backfill skips that horizon key without error, to be retried on the next pipeline run


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

---
### Requirement: Standalone backfill script exists

A standalone script at `ETF/pipeline/steps/backfill_future_returns.py` SHALL implement a full-history backfill of `etf_buying_patterns.future_returns`. When executed, it SHALL scan all records where any horizon key is null, query `stock_prices_daily` for the required dates, and apply incremental merges. The script SHALL be safe to run multiple times (idempotent).

#### Scenario: Manual disaster recovery run

- **WHEN** the script is executed via `uv run python ETF/pipeline/steps/backfill_future_returns.py`
- **THEN** it processes all historical records with missing returns, prints a summary of updated records, and exits with code 0

#### Scenario: No records need backfill

- **WHEN** all `etf_buying_patterns` records have complete `future_returns`
- **THEN** the script prints "No records need backfill" and exits with code 0


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