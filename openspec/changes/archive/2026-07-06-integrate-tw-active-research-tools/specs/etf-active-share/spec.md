## ADDED Requirements

### Requirement: Load latest TW-stock holdings per ETF

The system SHALL read the most recent `data_date` from `etf_holdings_snapshot` for each of the 11 active ETFs. Holdings SHALL be filtered to TW stock codes matching `^\d{4}[A-Z]?$`. Cash markers (`C_NTD`, `M_NTD`, etc.) SHALL be excluded. Remaining weights SHALL be renormalized to sum to 100%.

#### Scenario: ETF with insufficient TW exposure

- **WHEN** TW stock weights sum to less than 50% of total portfolio
- **THEN** the ETF SHALL be excluded from Active Share computation and logged

### Requirement: Compute Active Share matrix

The system SHALL compute Active Share between every pair of ETFs as: `AS(A, B) = 0.5 × Σ|w_A(i) - w_B(i)|` across all stock codes present in either portfolio. The system SHALL also compute AS of each ETF against the industry-mean portfolio (equal-weight average of all 11 ETFs).

#### Scenario: Pairwise matrix size

- **WHEN** N ETFs pass the TW-exposure filter
- **THEN** the output SHALL contain N×(N-1)/2 pairwise records

##### Example: pairwise count

| N active ETFs | Expected pair count |
|---|---|
| 11 | 55 |
| 8 | 28 |

### Requirement: Persist results to etf_active_share

The system SHALL upsert into `etf_active_share` with columns: `computed_date`, `etf_a`, `etf_b`, `active_share_pct`, `as_vs_mean_a`, `as_vs_mean_b`. The unique key SHALL be `(computed_date, etf_a, etf_b)` where `etf_a < etf_b` lexicographically.

#### Scenario: Weekly recalculation

- **WHEN** the step runs on any day with fresh snapshot data
- **THEN** a new row SHALL be inserted or the existing row for that date updated

### Requirement: Step is auxiliary — failure must not halt pipeline

The step SHALL catch all exceptions, log them, and return without re-raising.

#### Scenario: DB read failure

- **WHEN** Supabase query for snapshot data fails
- **THEN** the step SHALL log the error and complete gracefully
