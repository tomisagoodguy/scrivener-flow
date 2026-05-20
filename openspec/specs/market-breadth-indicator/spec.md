# Spec: Market Breadth Indicator

## Purpose

Provide a `/investment/breadth` page displaying the Taiwan stock market Advance/Decline Line (ADL) and Advance/Decline Ratio (ADR) charts, sourced from `market_breadth_daily`. An ETF pipeline auxiliary step (`SyncAdlStep`) computes and persists daily breadth data.

---

## Requirements

### Requirement: Market breadth page
The system SHALL provide a `/investment/breadth` page displaying the Taiwan stock market Advance/Decline Line (ADL) and Advance/Decline Ratio (ADR) using historical data from `market_breadth_daily`. The default display window SHALL be the most recent 180 calendar days.

#### Scenario: 首次載入頁面
- **WHEN** the user navigates to `/investment/breadth`
- **THEN** an ADL line chart renders showing ADL, ADL_MA5, and ADL_MA60 lines
- **THEN** an ADR line chart renders showing ADR, ADR_MA5, and ADR_MA60 lines
- **THEN** both charts share the same x-axis (date), displaying the last 180 calendar days
- **THEN** the most recent date and ADL value are shown in the page header

#### Scenario: 無資料
- **WHEN** `market_breadth_daily` contains no records
- **THEN** both charts show an empty state with message "資料尚未更新"

#### Scenario: ADL 黃金交叉警示
- **WHEN** the latest `adl_ma5` crosses above `adl_ma60` (previous day ma5 < ma60, today ma5 >= ma60)
- **THEN** a green badge "多頭廣度擴張" is shown in the page header
- **WHEN** the latest `adl_ma5` crosses below `adl_ma60`
- **THEN** a red badge "廣度收縮警訊" is shown in the page header

##### Example: ADL trend interpretation
| adl_ma5 vs adl_ma60 | Badge shown |
|---------------------|-------------|
| ma5 > ma60 (golden cross today) | 多頭廣度擴張 (green) |
| ma5 < ma60 (death cross today) | 廣度收縮警訊 (red) |
| No cross (continuing trend) | No badge |

---
### Requirement: ADL data pipeline step
The ETF pipeline SHALL include `SyncAdlStep` as an auxiliary step that computes the ADL and ADR for all TSE/OTC listed stocks on each trading day and upserts into `market_breadth_daily`. The computation SHALL use the same benchmark (price change vs previous close) and moving average windows (MA5, MA60) as defined in `reference/advance_decline_line.py`.

#### Scenario: 正常執行
- **WHEN** `SyncAdlStep.run()` executes on a trading day
- **THEN** a new record is upserted into `market_breadth_daily` for today's date
- **THEN** `adl` reflects the cumulative sum of `net` from the earliest available date through today
- **THEN** `adl_ma5` and `adl_ma60` are computed using the most recent 5 and 60 records respectively

#### Scenario: 步驟失敗不中斷 Pipeline
- **WHEN** `SyncAdlStep.run()` raises any exception
- **THEN** the error is logged at ERROR level
- **THEN** pipeline execution continues without re-raising

##### Example: ADL calculation
- **GIVEN** yesterday `adl = 150`, today `ups = 820`, `downs = 380`
- **WHEN** `SyncAdlStep` computes today's record
- **THEN** `net = 820 - 380 = 440`, `adl = 150 + 440 = 590`, `adr = 820 / (820 + 380) ≈ 0.683`
