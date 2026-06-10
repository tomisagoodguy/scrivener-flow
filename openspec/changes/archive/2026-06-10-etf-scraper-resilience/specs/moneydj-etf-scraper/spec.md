## MODIFIED Requirements

### Requirement: MultiEtfStep falls back to MoneyDJ when Pocket.tw fails

`multi_etf_step.py` SHALL, for each secondary ETF, execute the three-layer fallback chain defined in `etf-scraper-fallback-chain`: (1) `official_api_scraper`, (2) `moneydj_scraper`, (3) `pocket_scraper`. The previous behavior of calling only Pocket.tw first (for `source='pocket'` ETFs) is superseded by the unified three-layer chain. The step SHALL record `source` and `used_fallback` per ETF in `ctx.scrape_results`. If all three layers return `None` or raise exceptions, the ETF SHALL be logged as skipped for that run (no exception propagates, no partial data is written).

#### Scenario: official_api succeeds (layer 1)

- **WHEN** `official_api_scraper.fetch_holdings(etf_code)` returns a non-empty DataFrame
- **THEN** the step saves the data and records `source="official_api"`, `used_fallback=False`

#### Scenario: official_api fails, MoneyDJ succeeds (layer 2)

- **WHEN** `official_api_scraper.fetch_holdings(etf_code)` raises an exception or returns empty
- **AND** `moneydj_scraper.scrape_holdings(etf_code)` returns a valid DataFrame
- **THEN** the step saves the data and records `source="moneydj"`, `used_fallback=True`

#### Scenario: official_api and MoneyDJ fail, Pocket succeeds (layer 3)

- **WHEN** layers 1 and 2 both fail
- **AND** `pocket_scraper.scrape_holdings(etf_code)` returns a valid DataFrame
- **THEN** the step saves the data and records `source="pocket"`, `used_fallback=True`

#### Scenario: All three layers fail

- **WHEN** all three scrapers return `None` or raise exceptions
- **THEN** the ETF is logged as skipped with the reason for each layer failure; no exception propagates and no partial data is written
