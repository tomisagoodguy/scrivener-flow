## Purpose

Show on the strategy page how each strategy's picks performed after the rebalance: which holdings are in profit or loss, which industries are doing well or badly, and how recently removed stocks performed after exit.

## ADDED Requirements

### Requirement: Trade performance panel placement and strategy switch

In the strategy view of `/investment/strategy` (no `view` parameter) the page SHALL render a "換股後表現" panel after the multi-strategy consensus panel and before the strategy signal cards. The panel SHALL offer a switch with "全部" (default) and one option per strategy present in the data, labelled with the short strategy label. Switching SHALL be client-side state and SHALL NOT change the URL. The panel SHALL include a note that figures are price returns from the next-day open, adjusted for dividends, excluding fees and taxes, and recomputed with the current strategy logic.

#### Scenario: Switch to a single strategy

- **WHEN** the user selects a strategy option in the panel
- **THEN** every section of the panel shows only that strategy's trades and the URL is unchanged

#### Scenario: Not shown in other views

- **WHEN** the user opens `/investment/strategy?view=monitor`
- **THEN** the panel is not rendered

### Requirement: Holding summary and win rate

The panel SHALL show, for the selected scope: the number of open holdings with a non-null holding return, their average holding return, and the win rate defined as the count with holding return greater than 0 divided by that number; plus the number of trades exited within the last 60 days and their average post-exit return. Open holdings with null entry date SHALL be listed separately as "待進場" and excluded from all statistics.

#### Scenario: Win rate calculation

- **WHEN** the selected scope has open holdings with returns 0.10, -0.05, 0.02 and one pending holding
- **THEN** the panel shows 3 holdings, average return 2.33%, win rate 66.7%, and lists the pending stock under "待進場"

##### Example: Summary values

| Open holding returns   | Count | Average | Win rate |
| ---------------------- | ----- | ------- | -------- |
| 0.10, -0.05, 0.02      | 3     | 2.33%   | 66.7%    |
| (none)                 | 0     | —       | —        |

### Requirement: Positive and negative holdings split

The panel SHALL list open holdings in two columns: "正報酬" with holding return greater than 0 sorted descending, and "負報酬" with holding return less than or equal to 0 sorted ascending. Each row SHALL show stock name, stock id, industry, holding return and calendar days held from entry date to the latest data date; in "全部" mode each row SHALL also show the short strategy label. Positive returns SHALL use `text-rose-600 dark:text-rose-400`, negative returns `text-emerald-600 dark:text-emerald-400`, and zero a gray color.

#### Scenario: Split and order

- **WHEN** open holdings have returns A 0.08, B -0.03, C 0.15, D 0
- **THEN** "正報酬" lists C then A, and "負報酬" lists B then D

### Requirement: Industry aggregation

The panel SHALL aggregate open holdings with a non-null holding return by industry, showing per industry the holding count, average holding return, positive count and negative-or-zero count, sorted by average holding return descending. Holdings without an industry SHALL be grouped under "未分類".

#### Scenario: Industry ranking

- **WHEN** 半導體 has returns 0.10 and 0.04 and 航運 has return -0.06
- **THEN** 半導體 is listed first with count 2, average 7.00%, positive 2, negative 0, followed by 航運 with average -6.00%

### Requirement: Recent exits with post-exit return

The panel SHALL list trades whose exit date is within the last 60 calendar days, showing stock name, stock id, exit date, holding return and post-exit return, sorted by exit date descending, with the same return colors.

#### Scenario: Stock keeps rising after exit

- **WHEN** a stock exited on 2026-10-01 with holding return 0.12 and has risen 0.05 since exit
- **THEN** the recent exits list shows it with holding return 12.00% and post-exit return 5.00%, both in the positive color

### Requirement: Empty and failure states

When no trade data is available or the data query fails, the panel SHALL display "尚無換股後表現資料" and the rest of the strategy page SHALL render normally. Null returns SHALL be displayed as "—".

#### Scenario: Query failure

- **WHEN** the trade performance query fails
- **THEN** the panel shows "尚無換股後表現資料" and the strategy cards still render
