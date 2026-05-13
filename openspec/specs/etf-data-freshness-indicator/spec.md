# Spec: ETF Data Freshness Indicator

## Purpose

Display the data date and source type of ETF holdings snapshots in the ETF holdings page header, with visual staleness indicators to alert users when data is outdated.

---

## Requirements

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
### Requirement: ETF page displays data source badge

The ETF holdings page SHALL display a badge indicating the data source type of the selected ETF. The badge text and color SHALL differ between `official_api` and `pocket` sources.

#### Scenario: Official API source

- **WHEN** the ETF's `dataSource` in `etfRegistry.ts` is `official_api`
- **THEN** a badge reading "官網 API" is shown in a neutral or green color

#### Scenario: Pocket.tw source

- **WHEN** the ETF's `dataSource` in `etfRegistry.ts` is `pocket`
- **THEN** a badge reading "Pocket.tw" is shown in a grey color indicating potentially less frequent updates


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
### Requirement: Server action returns freshness metadata

The `getHoldings()` server action SHALL return a `meta` object containing `dataDate: string` (ISO date) and `dataSource: 'official_api' | 'pocket'` alongside the existing holdings array.

#### Scenario: Holdings loaded successfully

- **WHEN** `getHoldings(etfCode)` completes
- **THEN** the returned object includes `meta.dataDate` as the max `data_date` from the snapshot and `meta.dataSource` from `etfRegistry.ts`

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