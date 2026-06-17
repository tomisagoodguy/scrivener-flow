# etf-streak-analysis Specification

## Purpose

TBD - created by archiving change 'etf-streaks-page'. Update Purpose after archive.

## Requirements

### Requirement: Trading-Day Consecutive Streak Computation

The system SHALL compute, for each `(etf_code, stock_code)` pair, the length of the current consecutive same-direction run measured along the ETF's reporting-day axis. The reporting-day axis SHALL be the ordered sequence of distinct `data_date` values present in `etf_diff_logs` for that ETF. A run SHALL break when a reporting day has no change for that stock or has the opposite direction. The system MUST NOT count consecutive diff rows while ignoring intervening reporting days.

Direction SHALL be derived from the sign of `diff_shares`: positive is a buy, negative is a sell. Rows where `diff_shares = 0` SHALL be excluded.

#### Scenario: Stationary reporting day breaks the streak

- **WHEN** a stock is bought on reporting days 1, 2, and 3, has no change on day 4, and is bought again on day 5
- **THEN** the streak ending on day 5 SHALL have length 1, not 4

##### Example: Diff-row count must not overstate a sparse streak

- **GIVEN** ETF 00981A has 90 reporting days from 2026-02-03 to 2026-06-12, and stock 3665 has buy rows on only 23 of those days with no sell rows in between
- **WHEN** the streak is computed along the reporting-day axis
- **THEN** the result SHALL NOT report a single 23-day consecutive streak spanning the full range, because the unchanged days between buy rows break consecutiveness


<!-- @trace
source: etf-streaks-page
updated: 2026-06-17
code:
  - src/app/investment/layout.tsx
  - src/app/investment/page.tsx
  - src/app/investment/streaks/page.tsx
  - next-env.d.ts
  - src/app/actions/getStreaks.ts
  - src/lib/investment/streakUtils.ts
tests:
  - src/__tests__/lib/streakUtils.test.ts
-->

---
### Requirement: Current-Streak Selection

The system SHALL classify a streak as currently in progress only when its last reporting day equals the latest reporting day of that ETF. The system SHALL return only currently-in-progress streaks whose length is at least 3 reporting days.

#### Scenario: Streak that ended before the latest reporting day is excluded

- **WHEN** a stock's most recent buy run ends two reporting days before the ETF's latest reporting day
- **THEN** that run SHALL NOT appear in the in-progress streak results


<!-- @trace
source: etf-streaks-page
updated: 2026-06-17
code:
  - src/app/investment/layout.tsx
  - src/app/investment/page.tsx
  - src/app/investment/streaks/page.tsx
  - next-env.d.ts
  - src/app/actions/getStreaks.ts
  - src/lib/investment/streakUtils.ts
tests:
  - src/__tests__/lib/streakUtils.test.ts
-->

---
### Requirement: Four-Perspective Streak Presentation

The system SHALL present streak results in four perspectives: individual stocks being consecutively bought, individual stocks being consecutively sold, ETFs and the stocks they are consecutively buying, and ETFs and the stocks they are consecutively selling. Each row SHALL include ETF code, stock code, stock name, streak length in reporting days, net shares over the run, start date, end date, and average shares per reporting day.

#### Scenario: Buy and sell perspectives are separated

- **WHEN** the streaks page renders
- **THEN** consecutive-buy rows and consecutive-sell rows SHALL appear in distinct sections


<!-- @trace
source: etf-streaks-page
updated: 2026-06-17
code:
  - src/app/investment/layout.tsx
  - src/app/investment/page.tsx
  - src/app/investment/streaks/page.tsx
  - next-env.d.ts
  - src/app/actions/getStreaks.ts
  - src/lib/investment/streakUtils.ts
tests:
  - src/__tests__/lib/streakUtils.test.ts
-->

---
### Requirement: Taiwan Market Color Convention

Consecutive-buy values SHALL be displayed in red (`text-rose-600` in light mode, `text-rose-400` in dark mode) and consecutive-sell values in green (`text-emerald-600` in light mode, `text-emerald-400` in dark mode), following the Taiwan market convention where red is up and green is down.

#### Scenario: Buy streak shown in red

- **WHEN** a consecutive-buy row is rendered
- **THEN** its streak metrics SHALL use the rose color class, not emerald


<!-- @trace
source: etf-streaks-page
updated: 2026-06-17
code:
  - src/app/investment/layout.tsx
  - src/app/investment/page.tsx
  - src/app/investment/streaks/page.tsx
  - next-env.d.ts
  - src/app/actions/getStreaks.ts
  - src/lib/investment/streakUtils.ts
tests:
  - src/__tests__/lib/streakUtils.test.ts
-->

---
### Requirement: Sparse-Source Frequency Annotation

For ETFs whose holdings source updates only on announcement days (the `pocket` source in the ETF registry), each streak row SHALL carry a sparse-source flag, and the UI SHALL annotate that the count reflects reporting days rather than guaranteed trading days.

#### Scenario: Pocket-source ETF row is annotated

- **WHEN** a streak row belongs to an ETF whose registry source is `pocket`
- **THEN** the row SHALL be marked as sparse-source and the UI SHALL indicate the count is in reporting days


<!-- @trace
source: etf-streaks-page
updated: 2026-06-17
code:
  - src/app/investment/layout.tsx
  - src/app/investment/page.tsx
  - src/app/investment/streaks/page.tsx
  - next-env.d.ts
  - src/app/actions/getStreaks.ts
  - src/lib/investment/streakUtils.ts
tests:
  - src/__tests__/lib/streakUtils.test.ts
-->

---
### Requirement: Empty and Failure Handling

When no in-progress streaks exist or the underlying query fails, the system SHALL return empty perspective lists without throwing, and the page SHALL display an empty-state message indicating there are no current consecutive buy/sell streaks.

#### Scenario: No qualifying streaks

- **WHEN** no `(etf_code, stock_code)` pair has an in-progress streak of at least 3 reporting days
- **THEN** all four perspective lists SHALL be empty and the page SHALL show the empty-state message

<!-- @trace
source: etf-streaks-page
updated: 2026-06-17
code:
  - src/app/investment/layout.tsx
  - src/app/investment/page.tsx
  - src/app/investment/streaks/page.tsx
  - next-env.d.ts
  - src/app/actions/getStreaks.ts
  - src/lib/investment/streakUtils.ts
tests:
  - src/__tests__/lib/streakUtils.test.ts
-->