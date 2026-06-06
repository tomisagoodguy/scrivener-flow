## MODIFIED Requirements

### Requirement: Market breadth page
The system SHALL provide a `/investment/breadth` page displaying the Taiwan stock market Advance/Decline Line (ADL) and Advance/Decline Ratio (ADR) using historical data from `market_breadth_daily`. The default display window SHALL be the most recent 180 calendar days. The page SHALL also display a `RetailSentimentCard` component showing the latest retail participation signal when sentiment data is available.

#### Scenario: 首次載入頁面
- **WHEN** the user navigates to `/investment/breadth`
- **THEN** an ADL line chart renders showing ADL, ADL_MA5, and ADL_MA60 lines
- **THEN** an ADR line chart renders showing ADR, ADR_MA5, and ADR_MA60 lines
- **THEN** both charts share the same x-axis (date), displaying the last 180 calendar days
- **THEN** the most recent date and ADL value are shown in the page header
- **THEN** a `RetailSentimentCard` is rendered if `getRetailSentiment()` returns non-null data

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
