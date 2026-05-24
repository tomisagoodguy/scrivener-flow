# strategy-signal-compute Specification

## Purpose

TBD - created by archiving change 'sector-strategy-signal'. Update Purpose after archive.

## Requirements

### Requirement: 策略命中計算
`SectorStrengthStep` SHALL 在計算族群漲幅時，對每支成分股計算策略條件，並輸出 `is_strategy_hit` 與 `momentum_score`。

策略條件：
- `close > close.average(20)` 月線以上
- `close > close.average(60)` 季線以上
- `close > close.average(120)` 半年線以上
- `rev.average(3) > rev.average(12)` 月營收短期趨勢向上
- `momentum_score = (close / close.shift() - 1).rolling(5).mean().iloc[-1]`

#### Scenario: 四條件全部命中
- **WHEN** 個股滿足所有均線條件且月營收短期 > 長期
- **THEN** `is_strategy_hit = True`，`momentum_score` 為該股當日 5 日滾動均漲幅

#### Scenario: 任一條件不符或資料缺失
- **WHEN** 任一均線或月營收條件不成立，或相關欄位為 NaN
- **THEN** `is_strategy_hit = False`

#### Scenario: 月營收資料缺失（小型股）
- **WHEN** 該股無月營收資料（NaN）
- **THEN** 月營收條件視為 False，不影響其他族群的計算

---
### Requirement: SyncBareKStep includes strategy stocks

`SyncBareKStep` SHALL, after fetching `watch_list` stocks, additionally query `strategy_signals` for the most recent date's `is_selected = true` stock codes, and merge them (de-duplicated) into the sync batch. `watch_list` stocks SHALL be placed before strategy stocks so that, when truncated to `MAX_STOCKS`, watch_list entries are prioritized.

#### Scenario: Strategy stocks merged into BareK sync

- **WHEN** `strategy_signals` contains selected stocks for the latest date
- **THEN** those stock codes SHALL be appended after watch_list stocks and synced to `bare_k_snapshots` within the same `BareKService` session

#### Scenario: MAX_STOCKS limit exceeded

- **WHEN** total of watch_list + strategy stocks exceeds `MAX_STOCKS` (50)
- **THEN** the list SHALL be truncated to the first 50 entries, preserving all watch_list stocks and as many strategy stocks as fit

#### Scenario: No strategy_signals data for latest date

- **WHEN** `strategy_signals` table has no rows for the most recent date
- **THEN** `SyncBareKStep` SHALL proceed with watch_list stocks only, logging a warning

#### Scenario: strategy_signals query failure

- **WHEN** the `strategy_signals` query raises an exception
- **THEN** `SyncBareKStep` SHALL log the error and proceed with watch_list stocks only, without raising (step remains non-blocking for this secondary query)

##### Example: stock list merge and truncation

| watch_list count | strategy_signals count | merged total | after truncation                    |
| ---------------- | ---------------------- | ------------ | ----------------------------------- |
| 20               | 10                     | 30 (unique)  | 30 (no truncation)                  |
| 40               | 20                     | 55 (unique)  | 50 (5 strategy stocks dropped)      |
| 50               | 15                     | 60 (unique)  | 50 (all 15 strategy stocks dropped) |

<!-- @trace
source: sector-strategy-signal
updated: 2026-05-16
code:
  - ETF/CLAUDE.md
  - tsconfig.tsbuildinfo
  - CLAUDE.md
-->

<!-- @trace
source: strategy-chart-view
updated: 2026-05-24
code:
  - .playwright-mcp/page-2026-05-24T08-22-21-332Z.yml
  - .playwright-mcp/page-2026-05-24T08-23-33-995Z.yml
  - .playwright-mcp/page-2026-05-24T08-24-09-101Z.png
  - src/app/actions/getStrategySnapshots.ts
  - ETF/pipeline/steps/sync_bare_k_step.py
  - src/components/features/strategy/StrategySectorRanking.tsx
  - .playwright-mcp/page-2026-05-24T08-22-37-363Z.yml
  - .playwright-mcp/page-2026-05-24T08-24-05-102Z.yml
  - .playwright-mcp/page-2026-05-24T08-22-24-741Z.png
  - src/app/investment/strategy/page.tsx
  - .playwright-mcp/page-2026-05-24T08-22-40-524Z.png
  - .playwright-mcp/page-2026-05-24T08-23-55-942Z.png
  - src/components/features/investment/BareKScrollViewer.tsx
  - src/components/features/strategy/StrategyChartViewer.tsx
  - .playwright-mcp/page-2026-05-24T08-23-37-356Z.png
  - .playwright-mcp/page-2026-05-24T08-23-50-805Z.yml
-->