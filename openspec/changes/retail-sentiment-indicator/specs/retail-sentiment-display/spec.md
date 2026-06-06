## ADDED Requirements

### Requirement: Retail sentiment card on breadth page

The system SHALL display a `RetailSentimentCard` on the `/investment/breadth` page showing the current retail participation signal derived from the latest `market_breadth_daily` row with non-null sentiment columns.

The card SHALL display:
- The 12-week small-holder change value (formatted as `+X.XX%` or `-X.XX%`)
- The Z-score (formatted as `Z = X.XX`)
- A composite signal label with color and description
- Two boolean indicator chips: "人數加速（P90）" and "零股碎片化"
- The data date

Signal label mapping SHALL be:

| `is_retail_accelerating` | `is_odd_lot_fragmented` | Label | Color | Description |
|:---:|:---:|-------|-------|-------------|
| true | false | 資金擴散 | rose-600 | 短中天期偏多 |
| true | true | 矛盾期 | amber-500 | 短多、120D審慎 |
| false | true | 籌碼尾端 | emerald-600 | 長天期偏弱 |
| false | false | 中性 | gray-500 | 依策略信號 |

#### Scenario: Data available

- **WHEN** the user navigates to `/investment/breadth`
- **THEN** the page renders `RetailSentimentCard` with the latest non-null sentiment row from `market_breadth_daily`

#### Scenario: No sentiment data yet

- **WHEN** `getRetailSentiment()` returns null (columns are all NULL)
- **THEN** `RetailSentimentCard` is not rendered; no error or empty placeholder shown

#### Scenario: Retail accelerating, no fragmentation

- **WHEN** `is_retail_accelerating = true` AND `is_odd_lot_fragmented = false`
- **THEN** the card displays label "資金擴散" in rose-600 with description "短中天期偏多"

##### Example: signal color mapping

| is_retail_accelerating | is_odd_lot_fragmented | Expected label | Expected color class |
|------------------------|----------------------|----------------|----------------------|
| true | false | 資金擴散 | text-rose-600 |
| true | true | 矛盾期 | text-amber-500 |
| false | true | 籌碼尾端 | text-emerald-600 |
| false | false | 中性 | text-gray-500 |

### Requirement: Retail sentiment Server Action

The system SHALL provide a `getRetailSentiment()` Server Action that queries `market_breadth_daily` for the most recent row where `small_holder_chg_12w` IS NOT NULL, returning a typed `RetailSentiment` object or null.

The action SHALL select only: `date`, `small_holder_chg_12w`, `small_holder_z_score`, `is_retail_accelerating`, `is_odd_lot_fragmented`.

#### Scenario: Latest sentiment row exists

- **WHEN** `getRetailSentiment()` is called and at least one row has non-null `small_holder_chg_12w`
- **THEN** it returns the most recent such row as a `RetailSentiment` typed object

#### Scenario: No sentiment rows exist

- **WHEN** all `small_holder_chg_12w` values in `market_breadth_daily` are NULL
- **THEN** `getRetailSentiment()` returns null
