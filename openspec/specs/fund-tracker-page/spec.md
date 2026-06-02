# fund-tracker-page Specification

## Purpose

TBD — created by syncing change 'fund-momentum-tracker'. Update Purpose after implementation.

## Requirements

### Requirement: Fund tracker page route

The application SHALL expose a `/investment/fund-tracker` route that redirects all requests to `/investment/consensus-signal?tab=watchlist` using a server-side redirect.

The route SHALL be accessible to both authenticated and unauthenticated users (redirect occurs before auth check).

#### Scenario: Redirect preserves tab context

- **WHEN** a user navigates to `/investment/fund-tracker`
- **THEN** the server SHALL respond with a redirect to `/investment/consensus-signal?tab=watchlist`
- **THEN** the user SHALL land on the consensus-signal page with the 自選股 tab active

#### Scenario: Empty watch list

- **WHEN** the user's `watch_list` is empty AND `tab=watchlist` is active on the consensus-signal page
- **THEN** the page SHALL display a prompt directing the user to add stocks via `/investment/bare-k`


<!-- @trace
source: fund-momentum-tracker
updated: 2026-05-24
code:
  - ETF/pipeline/steps/fund_momentum_step.py
  - src/app/investment/fund-tracker/components/AccumulationCycleCard.tsx
  - src/app/investment/layout.tsx
  - src/app/investment/fund-tracker/components/EtfFundCrossSignal.tsx
  - src/app/investment/fund-tracker/components/FundHealthTable.tsx
  - ETF/pipeline/steps/__init__.py
  - ETF/strategies/shared_cache.py
  - src/types/index.ts
  - src/lib/investment/strategyUtils.ts
  - ETF/strategies/low_vol_cap.py
  - ETF/pipeline/orchestrator.py
  - src/app/investment/fund-tracker/page.tsx
  - src/app/actions/getFundMomentumSignals.ts
tests:
  - src/__tests__/actions/getFundMomentumSignals.test.ts
  - ETF/tests/test_fund_momentum_step.py
-->

---
### Requirement: Fund health table

`FundHealthTable` SHALL render a sortable table of watch-list stocks with investment trust buying health metrics sourced from `strategy_signals` where `strategy_id = 'fund_momentum'`.

Columns displayed (all sortable):
- 股票代號 / 名稱
- 1日買超（張）: `metadata.fund_1d / 1000`
- 5日累積（張）: `metadata.fund_5d / 1000`
- 20日累積（張）: `metadata.fund_20d / 1000`
- 連續天數: `metadata.consec_days`
- 買超比率（%）: `metadata.fund_ratio_5d * 100`
- 全市場排名: `score` displayed as percentile (e.g., "Top 5%")
- 建倉確認: badge shown when `is_selected = true`
- ETF共識: badge shown when ETF consensus flag is true

#### Scenario: Colour coding for consecutive days

- **WHEN** a stock has `consec_days >= 10`
- **THEN** the consecutive days cell SHALL display with green emphasis styling (`text-emerald-600`)
- **WHEN** a stock transitions from buying to selling (fund_1d < 0 after consec_days > 0 yesterday)
- **THEN** the 1-day net-buy cell SHALL display with red emphasis styling (`text-rose-600`)

#### Scenario: Default sort order

- **WHEN** the page first loads
- **THEN** the table SHALL be sorted by `score` descending (strongest relative buying first)


<!-- @trace
source: fund-momentum-tracker
updated: 2026-05-24
code:
  - ETF/pipeline/steps/fund_momentum_step.py
  - src/app/investment/fund-tracker/components/AccumulationCycleCard.tsx
  - src/app/investment/layout.tsx
  - src/app/investment/fund-tracker/components/EtfFundCrossSignal.tsx
  - src/app/investment/fund-tracker/components/FundHealthTable.tsx
  - ETF/pipeline/steps/__init__.py
  - ETF/strategies/shared_cache.py
  - src/types/index.ts
  - src/lib/investment/strategyUtils.ts
  - ETF/strategies/low_vol_cap.py
  - ETF/pipeline/orchestrator.py
  - src/app/investment/fund-tracker/page.tsx
  - src/app/actions/getFundMomentumSignals.ts
tests:
  - src/__tests__/actions/getFundMomentumSignals.test.ts
  - ETF/tests/test_fund_momentum_step.py
-->

---
### Requirement: Accumulation cycle detection card

`AccumulationCycleCard` SHALL display a summary panel per stock that is currently in an accumulation cycle (`consec_days >= 3`).

The card SHALL show: stock name, consecutive days count, 20-day cumulative (張), market rank badge, and ETF consensus indicator.

#### Scenario: Card visibility

- **WHEN** no watch-list stock has `consec_days >= 3`
- **THEN** the accumulation cycle section SHALL display the message "目前無持倉進入建倉週期"
- **WHEN** one or more stocks have `consec_days >= 3`
- **THEN** one card per qualifying stock SHALL be rendered, sorted by `consec_days` descending


<!-- @trace
source: fund-momentum-tracker
updated: 2026-05-24
code:
  - ETF/pipeline/steps/fund_momentum_step.py
  - src/app/investment/fund-tracker/components/AccumulationCycleCard.tsx
  - src/app/investment/layout.tsx
  - src/app/investment/fund-tracker/components/EtfFundCrossSignal.tsx
  - src/app/investment/fund-tracker/components/FundHealthTable.tsx
  - ETF/pipeline/steps/__init__.py
  - ETF/strategies/shared_cache.py
  - src/types/index.ts
  - src/lib/investment/strategyUtils.ts
  - ETF/strategies/low_vol_cap.py
  - ETF/pipeline/orchestrator.py
  - src/app/investment/fund-tracker/page.tsx
  - src/app/actions/getFundMomentumSignals.ts
tests:
  - src/__tests__/actions/getFundMomentumSignals.test.ts
  - ETF/tests/test_fund_momentum_step.py
-->

---
### Requirement: ETF × fund cross-signal detection

`getFundMomentumSignals` Server Action SHALL cross-reference investment trust buying with ETF position changes to produce a consensus flag.

A stock SHALL receive `etf_consensus = true` when, on the same date:
- `strategy_signals.score >= 70` (strategy_id = `fund_momentum`)
- At least one row exists in `etf_diff_logs` with matching `stock_code` and `change_type IN ('BUY', 'IN')`

This cross-reference SHALL be computed server-side and SHALL NOT be persisted to the database.

#### Scenario: Consensus flag computed correctly

- **WHEN** stock "2330" has score = 85 on 2026-05-24 AND `etf_diff_logs` contains a BUY entry for "2330" on 2026-05-24
- **THEN** `getFundMomentumSignals` SHALL return `etf_consensus: true` for "2330"
- **WHEN** stock "2454" has score = 85 on 2026-05-24 BUT no ETF diff entry exists for that date
- **THEN** `getFundMomentumSignals` SHALL return `etf_consensus: false` for "2454"


<!-- @trace
source: fund-momentum-tracker
updated: 2026-05-24
code:
  - ETF/pipeline/steps/fund_momentum_step.py
  - src/app/investment/fund-tracker/components/AccumulationCycleCard.tsx
  - src/app/investment/layout.tsx
  - src/app/investment/fund-tracker/components/EtfFundCrossSignal.tsx
  - src/app/investment/fund-tracker/components/FundHealthTable.tsx
  - ETF/pipeline/steps/__init__.py
  - ETF/strategies/shared_cache.py
  - src/types/index.ts
  - src/lib/investment/strategyUtils.ts
  - ETF/strategies/low_vol_cap.py
  - ETF/pipeline/orchestrator.py
  - src/app/investment/fund-tracker/page.tsx
  - src/app/actions/getFundMomentumSignals.ts
tests:
  - src/__tests__/actions/getFundMomentumSignals.test.ts
  - ETF/tests/test_fund_momentum_step.py
-->

---
### Requirement: Navigation entry

The sidebar navigation SHALL update the "投信追蹤" link to point to `/investment/consensus-signal?tab=watchlist` instead of `/investment/fund-tracker`.

The "投信追蹤" navigation item SHALL be merged with or placed adjacent to the "共識掃描" item to reflect that both features now reside on the same page.

#### Scenario: Navigation link targets merged page

- **WHEN** an authenticated user views any investment page
- **THEN** the sidebar SHALL display a navigation item pointing to `/investment/consensus-signal?tab=watchlist` with label "共識掃描 / 投信追蹤" or equivalent combined label

<!-- @trace
source: merge-consensus-fund-tracker
updated: 2026-06-02
code:
  - tsconfig.tsbuildinfo
  - src/app/investment/consensus-signal/components/TabSwitcher.tsx
  - src/app/investment/layout.tsx
  - next-env.d.ts
  - src/app/investment/consensus-signal/page.tsx
  - src/app/investment/fund-tracker/page.tsx
-->