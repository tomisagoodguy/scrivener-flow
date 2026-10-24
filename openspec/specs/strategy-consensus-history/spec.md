# strategy-consensus-history Specification

## Purpose

TBD - created by archiving change 'strategy-consensus-panel-enhance'. Update Purpose after archive.

## Requirements

### Requirement: Consensus window mode switch

The multi-strategy consensus panel SHALL offer window options "最新", "近7天", "近14天", "近30天" as links setting the URL search parameter `cwin` to `latest`, `7`, `14` or `30`, preserving `cmin` and `cview`. The default SHALL be `latest`; any missing or unrecognized value SHALL be treated as `latest`.

#### Scenario: Selecting a 14-day window

- **WHEN** the user clicks "近14天"
- **THEN** the URL contains `cwin=14` and the panel lists stocks by distinct-strategy count over the last 14 calendar days

---
### Requirement: Distinct-strategy count over a calendar window

A Server Action `getStrategyConsensusHistory(days)` SHALL accept `days` in {7, 14, 30} and SHALL query `strategy_signals` rows with `is_selected = true` and `date` between (server today − `days` calendar days) and server today inclusive, using the public read client consistent with `getStrategySignals`, paging with `.range()` in pages of 1000 rows until a page returns fewer than 1000 rows. It SHALL also fetch `stock_code`, `name_short`, `industry` from `stock_basic_info` for the returned stock ids, and return `{ rows, stockInfo }`. A pure function `buildConsensusHistory(rows, stockInfo, minCount)` SHALL compute, for each `stock_id`, the set of distinct `strategy_id` values, its count, and the most recent `date` on which any strategy selected it; enrich with `name` and `industry`; keep stocks whose count is greater than or equal to `minCount`; and sort by count descending, then stock_id ascending. A `days` value outside {7, 14, 30} SHALL be rejected by returning an empty list. A Supabase error SHALL be logged with `console.error` and SHALL return an empty list; the panel then shows "目前條件下無共選股". The result SHALL be cached with `unstable_cache` for 3600 seconds keyed by `days`.

#### Scenario: Same strategy on multiple days counts once

- **WHEN** in the last 7 days stock 2330 is selected by `fund_momentum` on 5 different dates and by `capital_layer` on 1 date
- **THEN** 2330 has count 2 with strategy ids `capital_layer` and `fund_momentum`

##### Example: window aggregation

| Stock | Rows in window (strategy@date) | Count | Last selected |
|-------|-------------------------------|-------|---------------|
| 2330 | fund_momentum@10-20, fund_momentum@10-21, capital_layer@10-17 | 2 | 2026-10-21 |
| 3055 | trend_template@10-22 | 1 | 2026-10-22 |

#### Scenario: Rows outside the window are ignored

- **WHEN** `days` is 7, server today is 2026-10-23, and a row is dated 2026-10-15
- **THEN** that row does not contribute to any count

#### Scenario: Invalid days

- **WHEN** `getStrategyConsensusHistory(5)` is called
- **THEN** it returns an empty list without querying Supabase

---
### Requirement: History mode entry display

In history mode each entry SHALL show stock code, name, strategy count badge, strategy name badges, industry tag, and the last selected date (`MM/DD`). ETF holder badges and the movement label SHALL NOT be shown in history mode. The per-strategy data date line from latest mode SHALL be replaced by the text "統計區間：近 N 天（不同策略數）".

#### Scenario: History entry omits movement

- **WHEN** the panel is in `cwin=30` mode
- **THEN** no entry shows 加碼中 / 減碼中 / 持倉中 / 未持有 labels, and each entry shows its last selected date
