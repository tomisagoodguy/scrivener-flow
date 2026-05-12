## ADDED Requirements

### Requirement: Identify overlap stocks between active and passive ETF add events

The system SHALL collect add events for both the 11 active ETFs (from `etf_holdings_snapshot`) and passive ETF benchmark components derived from FinLab index composition data (`data.get("index_components:成分股")`). Passive "add events" SHALL be defined by the same delta thresholds as active events. The system SHALL identify stock codes appearing in both active and passive event sets.

#### Scenario: Overlap stock qualifies for pairing

- **WHEN** a stock has ≥2 active add events AND ≥2 passive add events within the analysis window
- **THEN** it SHALL be included in the matched pairs output

#### Scenario: Below minimum event threshold

- **WHEN** a stock has fewer than 2 active OR fewer than 2 passive events
- **THEN** it SHALL be excluded from paired analysis

### Requirement: Compute paired abnormal vol difference per stock

For each overlap stock, the system SHALL compute:
- `active_median_r`: median of `r_t0` across all active add events for that stock
- `passive_median_r`: median of `r_t0` across all passive add events for that stock
- `diff_median`: `active_median_r - passive_median_r`

Positive `diff_median` indicates active abnormal vol is higher; negative indicates passive is higher.

#### Scenario: Summary sign count

- **WHEN** pairs are computed
- **THEN** the output SHALL include `n_active_higher`, `n_passive_higher`, and `median_of_diffs` across all overlap stocks

##### Example: interpretation

| median_of_diffs | Interpretation |
|---|---|
| > +0.05 | Active abnormal vol higher even after stock-mix control |
| < -0.05 | Passive abnormal vol higher; H1v2 conclusion holds |
| -0.05 to +0.05 | No significant difference |

### Requirement: Persist results to etf_matched_pairs

The system SHALL upsert per-stock records into `etf_matched_pairs` with columns: `computed_date`, `stock_code`, `stock_name`, `n_active_events`, `n_passive_events`, `active_median_r`, `passive_median_r`, `diff_median`. Unique key: `(computed_date, stock_code)`. A summary row SHALL also be upserted into `etf_matched_pairs_summary` with `computed_date`, `n_pairs`, `n_active_higher`, `n_passive_higher`, `median_of_diffs`.

#### Scenario: Summary updated on re-run

- **WHEN** step runs again for the same computed_date
- **THEN** both detail and summary rows SHALL be updated via upsert

### Requirement: Step is auxiliary — failure must not halt pipeline

The step SHALL catch all exceptions, log them, and return without re-raising.

#### Scenario: FinLab index composition fetch failure

- **WHEN** FinLab passive index component fetch fails
- **THEN** the step SHALL log the error and return gracefully without crashing the pipeline
