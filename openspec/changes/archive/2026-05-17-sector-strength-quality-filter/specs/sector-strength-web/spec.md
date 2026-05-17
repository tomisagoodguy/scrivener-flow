## ADDED Requirements

### Requirement: 強勢族群篩選模式
`SectorDashboard` SHALL provide a "強勢" filter mode that applies four conditions simultaneously to identify sectors with genuine capital rotation significance.

Conditions (all must be true):
1. `ret_1d > 0` — positive daily return
2. `ret_5d > 0` — weekly trend aligned
3. `breadth >= 0.40` — at least 40% of constituent stocks are rising
4. `total_amount >= avg_amount_5d * 0.8` (when both are non-null) — volume not shrinking

#### Scenario: 切換到強勢模式
- **WHEN** user clicks the "強勢" tab
- **THEN** the sector list SHALL display only sectors satisfying all four conditions simultaneously
- **THEN** sectors SHALL be sorted by `strength_score` descending
- **THEN** the header badge SHALL show "強勢 N/total" count

#### Scenario: 量能欄位為 NULL 時的處理
- **WHEN** a sector's `avg_amount_5d` or `total_amount` is null
- **THEN** the volume condition SHALL be skipped (treated as passing)
- **THEN** the sector SHALL still be evaluated against the other three conditions

#### Scenario: 強勢模式無結果
- **WHEN** no sector satisfies all four conditions
- **THEN** the list SHALL display an empty state message "今日無強勢族群"

##### Example: filter boundary
| ret_1d | ret_5d | breadth | total_amount vs avg_amount_5d | 強勢? |
|--------|--------|---------|-------------------------------|-------|
| +1.2%  | +2.1%  | 0.55    | 1.2× avg                      | Yes   |
| +0.8%  | +1.0%  | 0.38    | 1.5× avg                      | No (breadth < 0.40) |
| +1.5%  | -0.3%  | 0.60    | 1.0× avg                      | No (ret_5d < 0) |
| +0.5%  | +0.7%  | 0.50    | 0.6× avg                      | No (amount < 0.8×) |
| +0.9%  | +1.2%  | 0.45    | NULL                           | Yes (NULL skipped) |
