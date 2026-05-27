## ADDED Requirements

### Requirement: Topic cards grid view

The `/investment/topics` page SHALL display all active topics as cards in a responsive grid (4 columns on xl, 3 on lg, 2 on md, 1 on sm). Each card SHALL show the topic shortname, group badge, component stock count, and average daily return with Taiwan-convention color (red = positive, green = negative).

#### Scenario: Initial page load renders all topic cards
- **WHEN** the user navigates to `/investment/topics`
- **THEN** the Server Component renders cards for all 75 active topics from `topicMap.json`
- **THEN** each card shows shortname, group badge, stock count, avgRet1d (%), and a color-coded background
- **THEN** the data date is displayed in the page header

#### Scenario: Group tab filter
- **WHEN** the user clicks a group tab (e.g., "AI 伺服器")
- **THEN** only topics belonging to that group are displayed
- **WHEN** the user clicks "全部"
- **THEN** all 75 topics are shown again

#### Scenario: Keyword search
- **WHEN** the user types a keyword in the search input
- **THEN** only topics whose shortname, name, or description contain the keyword are shown (case-insensitive)
- **THEN** active group tab filter is applied together with search (AND logic)

#### Scenario: Card expand shows component stocks
- **WHEN** the user clicks a topic card
- **THEN** a stock list appears below the card row
- **THEN** the list shows stock code, stock name, close price, and daily return % for each component stock with available data
- **THEN** each stock row links to `/investment/stock/[code]`
- **WHEN** the user clicks the same card again or the close button
- **THEN** the stock list collapses

#### Scenario: No price data fallback
- **WHEN** `market_treemap_daily` has no records for the latest date
- **THEN** all card avgRet1d fields show "--"
- **THEN** a notice "股價資料更新中" is displayed below the header

##### Example: card color encoding
| avgRet1d | Card background color |
|----------|-----------------------|
| > +2% | `#991b1b` (deep red) |
| +0.5% to +2% | `#f87171` (rose) |
| -0.5% to +0.5% | `#e5e7eb` (neutral gray) |
| -2% to -0.5% | `#4ade80` (light green) |
| < -2% | `#14532d` (deep green) |
