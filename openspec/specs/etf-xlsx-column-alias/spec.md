# etf-xlsx-column-alias Specification

## Purpose

TBD — Defines a column alias mapping for `xlsx_parser.py` so that Excel/CSV files with varying column header names (Chinese or English) are parsed correctly without raising errors.

## Requirements

### Requirement: xlsx_parser resolves column names via alias mapping

`xlsx_parser.py` SHALL define a `COLUMN_ALIASES` constant mapping each standard column name to a list of known aliases. When parsing an Excel/CSV file, the parser SHALL attempt to match each DataFrame column against all aliases before raising a parse error.

Standard column names and their aliases:
- `code`: 證券代號, 股票代號, 代號, 代碼, stock_code, StockCode
- `name`: 證券名稱, 股票名稱, 名稱, stock_name, StockName
- `weight`: 持股比重, 比重, 權重, 持股比例, weight_pct, Weight
- `shares`: 持有股數, 持有數量, 股數, 持股數, shares_held, Shares

#### Scenario: Standard column name found directly

- **WHEN** the Excel file contains a column named exactly `code`
- **THEN** the parser maps it to the standard `code` column without alias lookup

#### Scenario: Alias column name resolved

- **WHEN** the Excel file contains a column named `證券代號` (an alias for `code`)
- **THEN** the parser maps it to the standard `code` column

#### Scenario: Unknown column name

- **WHEN** a column name does not match any standard name or alias
- **THEN** the parser logs a warning and excludes that column from the result (SHALL NOT raise an exception)

##### Example: alias resolution table

| File column header | Resolved standard name |
|--------------------|----------------------|
| 證券代號 | code |
| stock_code | code |
| 持股比重 | weight |
| Weight | weight |
| 持有股數 | shares |
| Shares | shares |
| unknown_col | (excluded, warning logged) |


<!-- @trace
source: etf-scraper-resilience
updated: 2026-06-10
code:
  - ETF/pipeline/orchestrator.py
  - ETF/pipeline/signals.py
  - ETF/pipeline/steps/multi_etf_step.py
  - ETF/parsers/xlsx_parser.py
  - ETF/parsers/__pycache__/xlsx_parser.cpython-313.pyc
  - ETF/pipeline/context.py
  - ETF/pipeline/steps/base.py
  - ETF/pipeline/steps/__init__.py
  - ETF/pipeline/steps/check_trade_date_step.py
-->

---
### Requirement: Parser retries with alias matching before failing

If the parser cannot find a required column using exact matching, it SHALL retry using the full alias list before returning an empty result.

#### Scenario: Retry succeeds via alias

- **WHEN** exact column match fails for `shares`
- **AND** the file contains `持有股數` (an alias for `shares`)
- **THEN** the parser successfully extracts share data without error

<!-- @trace
source: etf-scraper-resilience
updated: 2026-06-10
code:
  - ETF/pipeline/orchestrator.py
  - ETF/pipeline/signals.py
  - ETF/pipeline/steps/multi_etf_step.py
  - ETF/parsers/xlsx_parser.py
  - ETF/parsers/__pycache__/xlsx_parser.cpython-313.pyc
  - ETF/pipeline/context.py
  - ETF/pipeline/steps/base.py
  - ETF/pipeline/steps/__init__.py
  - ETF/pipeline/steps/check_trade_date_step.py
-->