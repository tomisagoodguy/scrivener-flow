## ADDED Requirements

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

### Requirement: CI validates registry sync before pipeline runs

The `etf_daily.yml` GitHub Actions workflow SHALL include a `validate-registry` job that runs `validate_registry_sync.py` before the pipeline job starts. The pipeline job SHALL declare `needs: validate-registry` so that a sync failure blocks execution.

#### Scenario: Sync fails in CI

- **WHEN** the validate-registry job exits with code 1
- **THEN** the pipeline job is skipped and the workflow shows a failure status

#### Scenario: Sync passes in CI

- **WHEN** the validate-registry job exits with code 0
- **THEN** the pipeline job proceeds normally
