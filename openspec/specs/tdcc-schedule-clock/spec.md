# tdcc-schedule-clock Specification

## Purpose

TBD - created by archiving change 'fix-tdcc-freshness-test-clock'. Update Purpose after archive.

## Requirements

### Requirement: Single clock source for TDCC schedule helpers

The TDCC schedule helper module (`ETF/utils/tdcc_schedule.py`) SHALL obtain the current date exclusively through a module-level function `_today()` that returns `date.today()`. `expected_tdcc_friday(today=None)` SHALL call `_today()` when `today` is None, and `is_tdcc_data_fresh(db_max_date, today=None)` SHALL resolve its default through `expected_tdcc_friday`, so that replacing `_today` controls every no-argument call path. The public signatures and the returned values for explicitly passed `today` arguments MUST remain unchanged.

#### Scenario: Frozen clock controls both helpers

- **WHEN** `ETF.utils.tdcc_schedule._today` is replaced to return 2026-07-10
- **THEN** `expected_tdcc_friday()` SHALL return 2026-07-10 and `is_tdcc_data_fresh("2026-07-10")` SHALL return True, regardless of the real system date

##### Example: frozen clock results

| Call (no today argument) | Frozen `_today` | Expected |
| ------------------------ | --------------- | -------- |
| `expected_tdcc_friday()` | 2026-07-10 (Fri) | 2026-07-10 |
| `is_tdcc_data_fresh("2026-07-10")` | 2026-07-10 | True |
| `is_tdcc_data_fresh("2026-07-03")` | 2026-07-10 | False |

#### Scenario: Explicit today argument is unaffected

- **WHEN** `expected_tdcc_friday(date(2026, 7, 12))` is called while `_today` is frozen to any other date
- **THEN** it SHALL return 2026-07-10, computed from the explicit argument

---
### Requirement: Shared frozen-clock test fixture

`ETF/tests/conftest.py` SHALL provide a pytest fixture `frozen_tdcc_today` that replaces `ETF.utils.tdcc_schedule._today` to return `date(2026, 7, 10)` for the duration of a test. Every test under `ETF/tests` whose assertions depend on the TDCC expected Friday SHALL use this fixture, and tests MUST NOT monkeypatch `expected_tdcc_friday` directly.

#### Scenario: Freshness tests pass on any execution date

- **WHEN** `uv run pytest ETF/tests/test_sync_equity_distribution.py ETF/tests/test_sync_stock_financials.py` runs on a real date later than 2026-07-17
- **THEN** `test_main_always_calls_finlab_even_if_previous_snapshot_fully_synced`, `test_main_skips_when_skip_if_fresh_and_db_current` and `test_check_shareholder_freshness_ok_when_finlab_has_expected_week` SHALL pass

#### Scenario: No direct patch of expected_tdcc_friday remains

- **WHEN** the files under `ETF/tests` are searched for monkeypatching `expected_tdcc_friday`
- **THEN** no occurrence SHALL be found; date freezing SHALL go through `frozen_tdcc_today`
