# etf-trade-date-precheck Specification

## Purpose

TBD — Provides a pre-flight check in the ETF pipeline to detect whether the holdings data is already up to date, allowing the pipeline to exit early without making FinLab API calls or writing to the database.

## Requirements

### Requirement: Pipeline checks latest data date before running

`CheckTradeDateStep` SHALL query `etf_holdings_snapshot` for the maximum `data_date` across all ETFs. If `max(data_date)` equals the expected last weekday (computed by `_last_weekday()`), the step SHALL set `ctx.skip_reason = "data_up_to_date"` and raise `EarlyExitSignal` to terminate the pipeline without error.

#### Scenario: Data is already up to date

- **WHEN** `max(data_date)` in `etf_holdings_snapshot` equals today's expected trading date
- **THEN** the pipeline logs "Data already up to date for <date>, skipping pipeline"
- **AND** the pipeline exits cleanly with no DB writes and no FinLab API calls

#### Scenario: Data needs updating

- **WHEN** `max(data_date)` is earlier than the expected trading date
- **THEN** `CheckTradeDateStep` completes normally and the pipeline continues

#### Scenario: No data exists yet

- **WHEN** `etf_holdings_snapshot` is empty (first run)
- **THEN** `max(data_date)` returns NULL
- **AND** the step treats NULL as "data not present" and allows the pipeline to continue


<!-- @trace
source: etf-scraper-resilience
updated: 2026-06-10
code:
  - ETF/pipeline/orchestrator.py
  - ETF/pipeline/signals.py
  - ETF/pipeline/steps/multi_etf_step.py
  - ETF/parsers/xlsx_parser.py
  - ETF/parsers/__pycache__/xlsx_parser.cpython-313.pyc
  - ETF/pipeline/context.py
  - ETF/pipeline/steps/base.py
  - ETF/pipeline/steps/__init__.py
  - ETF/pipeline/steps/check_trade_date_step.py
-->

---
### Requirement: Early exit is non-destructive

When the early exit is triggered, the pipeline SHALL complete without sending LINE notifications or writing any records.

#### Scenario: No notification on early exit

- **WHEN** `EarlyExitSignal` is raised by `CheckTradeDateStep`
- **THEN** `NotifyStep` SHALL NOT send any LINE message
- **AND** `SaveSnapshotStep` SHALL NOT write to the database

<!-- @trace
source: etf-scraper-resilience
updated: 2026-06-10
code:
  - ETF/pipeline/orchestrator.py
  - ETF/pipeline/signals.py
  - ETF/pipeline/steps/multi_etf_step.py
  - ETF/parsers/xlsx_parser.py
  - ETF/parsers/__pycache__/xlsx_parser.cpython-313.pyc
  - ETF/pipeline/context.py
  - ETF/pipeline/steps/base.py
  - ETF/pipeline/steps/__init__.py
  - ETF/pipeline/steps/check_trade_date_step.py
-->