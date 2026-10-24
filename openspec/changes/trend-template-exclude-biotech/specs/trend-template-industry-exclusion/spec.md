## ADDED Requirements

### Requirement: Industry exclusion in trend_template selection gate

The trend_template strategy SHALL exclude every stock whose industry category (FinLab `company_basic_info` column `產業類別`) is listed in the module-level constant `EXCLUDED_INDUSTRIES`, whose default value SHALL be `("生技醫療業",)`. The exclusion SHALL be applied in the final selection gate together with the turnover filter (`成交金額 > 2000 萬`) and the disposal-stock filter, i.e. BEFORE the smallest-market-cap top-5 ranking, so that an excluded stock's slot is filled by the next eligible candidate. The 14 scoring conditions and the score threshold of 12 SHALL remain unchanged.

#### Scenario: Excluded-industry stock never selected

- **WHEN** a stock in `生技醫療業` meets score >= 12, turnover > 20,000,000 and is not a disposal stock on a rebalance date
- **THEN** the position returned by `TrendTemplateStrategy.get_positions` SHALL be False for that stock on that date

#### Scenario: Excluded slot is refilled by the next candidate

- **WHEN** the smallest-market-cap eligible stock on a rebalance date belongs to an excluded industry and at least 6 eligible stocks exist before exclusion
- **THEN** the position SHALL still contain 5 stocks on that date, none of which belong to an excluded industry

##### Example: refill after exclusion

- **GIVEN** six eligible stocks on one date with market cap A=10, B=20, C=30, D=40, E=50, F=60, where A is `生技醫療業` and B–F are `半導體業`
- **WHEN** the selection gate and smallest-5 ranking run
- **THEN** the selected set SHALL be {B, C, D, E, F}

### Requirement: Pure industry exclusion mask function

The exclusion logic SHALL be implemented as a module-level pure function `build_industry_exclusion_mask(stock_ids, industry_by_stock, excluded)` in the trend_template strategy module. It SHALL return a boolean `pandas.Series` indexed by `stock_ids`, where True means the stock is allowed and False means excluded. A stock SHALL be excluded only when its industry is present in `industry_by_stock` and equals one of `excluded`; stocks missing from `industry_by_stock` or with a null industry SHALL be allowed. The function MUST NOT access FinLab or any network resource.

#### Scenario: Mask values for known, excluded and unknown stocks

- **WHEN** the function is called with a stock list containing an excluded-industry stock, a non-excluded stock and a stock absent from the industry mapping
- **THEN** it SHALL return False for the excluded-industry stock and True for the other two

##### Example: mixed stock list

| stock_id | industry_by_stock value | excluded | Expected mask |
| -------- | ----------------------- | -------- | ------------- |
| 4743     | 生技醫療業              | (生技醫療業,) | False |
| 2330     | 半導體業                | (生技醫療業,) | True  |
| 9999     | (absent)                | (生技醫療業,) | True  |
| 1234     | null                    | (生技醫療業,) | True  |

#### Scenario: Empty exclusion list allows all stocks

- **WHEN** `excluded` is an empty tuple
- **THEN** every value in the returned mask SHALL be True

### Requirement: Industry data source and shared cache

`StrategyDataCache` SHALL expose a cached property `industry` returning a `pandas.Series` mapping stock_id (string) to `產業類別`, built from FinLab `company_basic_info` and computed at most once per cache instance. When `get_positions` receives `cache=None`, trend_template SHALL fetch `company_basic_info` itself and build the same mapping.

#### Scenario: Pipeline run reuses cached industry mapping

- **WHEN** `StrategySignalStep` runs trend_template with a `StrategyDataCache` instance
- **THEN** trend_template SHALL read the industry mapping from `cache.industry` and SHALL NOT call `data.get('company_basic_info')` a second time within the same cache instance

### Requirement: Industry data failure falls back to no exclusion

If obtaining the industry mapping raises an exception, or `company_basic_info` lacks the `產業類別` column, trend_template SHALL log an error via `logger.error` naming the failure, SHALL apply no industry exclusion for that run (behavior identical to the selection without this requirement), and MUST NOT raise, so that other strategies in the same pipeline run are unaffected.

#### Scenario: Missing industry column

- **WHEN** `company_basic_info` is returned without a `產業類別` column
- **THEN** trend_template SHALL log an error and return positions identical to applying an all-True exclusion mask

#### Scenario: Industry fetch raises

- **WHEN** fetching `company_basic_info` raises an exception (e.g. FinLab quota exhausted)
- **THEN** trend_template SHALL log the error and still return a position DataFrame without raising
