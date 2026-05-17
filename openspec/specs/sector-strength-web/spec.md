# sector-strength-web Specification

## Purpose

TBD - created by archiving change 'sector-strength-dashboard'. Update Purpose after archive.

## Requirements

### Requirement: 族群強弱排行頁面
`/investment/sectors` 頁面 SHALL 顯示最新一日的族群強弱排行，支援日/週/月三個維度切換，預設以日漲幅排序。

#### Scenario: 首次載入
- **WHEN** 使用者進入 `/investment/sectors`
- **THEN** 顯示最新交易日的族群排行，預設日漲幅降序
- **THEN** 顯示資料日期

#### Scenario: 切換排序維度
- **WHEN** 使用者點擊「日/週/月」tab
- **THEN** 族群列表依對應漲幅重新排序，無需重新載入頁面


<!-- @trace
source: sector-strength-dashboard
updated: 2026-05-16
code:
  - tsconfig.tsbuildinfo
  - ETF/CLAUDE.md
  - CLAUDE.md
-->

---
### Requirement: 族群成分股展開
點擊族群列 SHALL 展開該族群的成分股清單，顯示個股名稱、股號、日漲幅，以日漲幅降序排列。

#### Scenario: 展開成分股
- **WHEN** 使用者點擊族群列
- **THEN** 展開顯示該族群所有成分股（從 `sector_strength_stocks` 查詢）
- **THEN** 成分股以日漲幅降序排列
- **THEN** 漲幅顯示遵循台股色彩慣例（紅漲綠跌）

#### Scenario: 收合成分股

- **WHEN** 使用者再次點擊已展開的族群列
- **THEN** 成分股列表收合

<!-- @trace
source: sector-strength-dashboard
updated: 2026-05-16
code:
  - tsconfig.tsbuildinfo
  - ETF/CLAUDE.md
  - CLAUDE.md
-->

---
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

| ret_1d | ret_5d | breadth | total_amount vs avg_amount_5d | 強勢?                |
|--------|--------|---------|-------------------------------|----------------------|
| +1.2%  | +2.1%  | 0.55    | 1.2× avg                      | Yes                  |
| +0.8%  | +1.0%  | 0.38    | 1.5× avg                      | No (breadth < 0.40)  |
| +1.5%  | -0.3%  | 0.60    | 1.0× avg                      | No (ret_5d < 0)      |
| +0.5%  | +0.7%  | 0.50    | 0.6× avg                      | No (amount < 0.8×)   |
| +0.9%  | +1.2%  | 0.45    | NULL                          | Yes (NULL skipped)   |

<!-- @trace
source: sector-strength-quality-filter
updated: 2026-05-17
code:
  - next-env.d.ts
  - src/app/actions/getSectorStrength.ts
  - ETF/run_strategies.py
  - ETF/daily_ai_report.py
  - src/app/investment/sectors/SectorDashboard.tsx
  - .github/workflows/etf_daily.yml
  - supabase/migrations/20260516160000_add_sector_quality_metrics.sql
  - ETF/pipeline/steps/sector_strength_step.py
-->