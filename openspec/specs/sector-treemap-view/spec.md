# Spec: Sector Treemap View

## Purpose

Provide a treemap ("熱力圖") visualization on the `/investment/sectors` page, displaying all TSE/OTC listed stocks grouped by industry with market-cap sizing and Taiwan-convention color coding for daily change percentage. An ETF pipeline auxiliary step (`SyncTreemapStep`) supplies the underlying data daily.

---

## Requirements

### Requirement: Treemap tab on sectors page
The `/investment/sectors` page SHALL include a "熱力圖" tab alongside the existing list view. The treemap SHALL display all TSE/OTC listed stocks grouped by industry (族群), with cell area proportional to market capitalization and cell color reflecting the daily change percentage using Taiwan color convention (red = positive, green = negative).

#### Scenario: 首次載入熱力圖 tab
- **WHEN** the user clicks the "熱力圖" tab on `/investment/sectors`
- **THEN** the treemap renders with stocks grouped by industry, sized by market cap, colored by `change_pct`
- **THEN** the data date is displayed (最新交易日)
- **THEN** stocks with no market cap data are excluded from the treemap

#### Scenario: Treemap cell hover
- **WHEN** the user hovers over a cell
- **THEN** a tooltip displays the stock code, stock name, industry, close price, and daily change percentage

#### Scenario: 無資料
- **WHEN** no `market_treemap_daily` records exist for the latest date
- **THEN** the page shows "資料尚未更新" with the last available date

##### Example: color encoding
| change_pct | Background color |
|------------|-----------------|
| +3.5% | Deep red (`bg-rose-600`) |
| +0.5% | Light red (`bg-rose-200`) |
| 0% | Neutral gray (`bg-gray-300`) |
| -0.5% | Light green (`bg-emerald-200`) |
| -3.5% | Deep green (`bg-emerald-600`) |

---
### Requirement: Treemap data pipeline step
The ETF pipeline SHALL include `SyncTreemapStep` as an auxiliary step that runs daily after `SaveSnapshotStep`. It SHALL fetch all listed stocks' closing prices, market caps, and industry classifications via FinLab API, compute `change_pct`, and upsert into `market_treemap_daily`. Records older than 90 days SHALL be deleted on each successful run.

#### Scenario: 正常執行
- **WHEN** `SyncTreemapStep.run()` executes successfully
- **THEN** `market_treemap_daily` is populated with today's records (one row per stock)
- **THEN** records older than 90 calendar days are removed

#### Scenario: 步驟失敗不中斷 Pipeline
- **WHEN** `SyncTreemapStep.run()` raises any exception
- **THEN** the error is logged at ERROR level
- **THEN** pipeline execution continues to the next step without re-raising
