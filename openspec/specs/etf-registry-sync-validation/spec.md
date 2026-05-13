# Spec: ETF Registry Sync Validation

## Purpose

Prevent drift between the TypeScript and Python ETF registries by providing a validation script and a CI gate that blocks pipeline execution when the registries are out of sync.

---

## Requirements

### Requirement: Registry sync validation script exists

A Python script at `ETF/scripts/validate_registry_sync.py` SHALL parse the ETF code list from both `src/lib/investment/etfRegistry.ts` and `ETF/config/etf_registry.py`, compare them, and exit with a non-zero status code when any discrepancy is found.

#### Scenario: Registries are in sync

- **WHEN** both registries contain identical ETF code sets
- **THEN** the script exits with code 0 and prints "Registry sync OK: N ETFs"

#### Scenario: TypeScript has an ETF not in Python

- **WHEN** `etfRegistry.ts` contains a code absent from `etf_registry.py`
- **THEN** the script prints a diff showing the missing code and exits with code 1

#### Scenario: Python has an ETF not in TypeScript

- **WHEN** `etf_registry.py` contains a code absent from `etfRegistry.ts`
- **THEN** the script prints a diff showing the extra code and exits with code 1

##### Example: one-sided mismatch

| Scenario | TS codes | PY codes | Exit code | Output |
|----------|----------|----------|-----------|--------|
| In sync | {00981A, 00980A} | {00981A, 00980A} | 0 | "Registry sync OK: 2 ETFs" |
| TS extra | {00981A, 00980A, 00999A} | {00981A, 00980A} | 1 | "Only in TS: 00999A" |
| PY extra | {00981A} | {00981A, 00888A} | 1 | "Only in PY: 00888A" |


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
### Requirement: CI validates registry sync before pipeline runs

The `etf_daily.yml` GitHub Actions workflow SHALL include a `validate-registry` job that runs `validate_registry_sync.py` before the pipeline job starts. The pipeline job SHALL declare `needs: validate-registry` so that a sync failure blocks execution.

#### Scenario: Sync fails in CI

- **WHEN** the validate-registry job exits with code 1
- **THEN** the pipeline job is skipped and the workflow shows a failure status

#### Scenario: Sync passes in CI

- **WHEN** the validate-registry job exits with code 0
- **THEN** the pipeline job proceeds normally

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