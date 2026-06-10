# etf-diff-category-field Specification

## Purpose

Adds a `change_category` column to `etf_diff_logs` that provides a four-value semantic classification (`added`, `removed`, `increased`, `decreased`) for each diff event. This column is computed by `diff_engine.py` and persisted by `sql_storage.py`, enabling richer filtering and display on the frontend without requiring client-side derivation from `change_type`.

## Requirements

### Requirement: etf_diff_logs table has change_category column

The `etf_diff_logs` table SHALL have a `change_category` column of type `VARCHAR(20)` that provides a four-value semantic classification of each diff event.

The column SHALL be added via a DB migration file under `supabase/migrations/` with the `IF NOT EXISTS` guard.

#### Scenario: Migration adds column without error on clean schema

- **WHEN** the SQL migration is applied to a database without `change_category`
- **THEN** the column is created as `VARCHAR(20) NULL` with no default

#### Scenario: Migration is idempotent

- **WHEN** the SQL migration is applied twice
- **THEN** no error is raised (due to `IF NOT EXISTS`)

---
### Requirement: diff_engine computes change_category for every log entry

`compute_diff()` in `ETF/processors/diff_engine.py` SHALL populate `change_category` in every log dict it returns, according to the following mapping:

| change_type | change_category |
|-------------|-----------------|
| `IN`        | `added`         |
| `OUT`       | `removed`       |
| `CLOSE`     | `removed`       |
| `BUY`       | `increased`     |
| `SELL`      | `decreased`     |
| `TRIM`      | `decreased`     |

#### Scenario: IN event produces change_category = added

- **WHEN** `compute_diff()` produces a log with `change_type = "IN"`
- **THEN** that log's `change_category` SHALL equal `"added"`

#### Scenario: All six change_type values map correctly

- **WHEN** `compute_diff()` produces logs covering all six `change_type` values
- **THEN** the `change_category` values match the mapping table above

---
### Requirement: sql_storage persists change_category to etf_diff_logs

`sql_storage.save_diff_logs()` SHALL include `change_category` in the UPSERT column list so that every newly written row has the field populated.

#### Scenario: UPSERT includes change_category

- **WHEN** `save_diff_logs()` is called with a list of logs that have `change_category` set
- **THEN** the rows inserted or updated in `etf_diff_logs` have the corresponding `change_category` value stored

<!-- @trace
source: expand-etf-coverage-and-diff-schema
updated: 2026-06-10
-->
