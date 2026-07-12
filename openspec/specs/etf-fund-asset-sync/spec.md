# etf-fund-asset-sync

## Purpose

Synchronize each ETF's fund asset summary — assets under management (AUM), net asset value per unit (NAV), outstanding units, and disclosure date — by extracting it from the same official scraper responses used for holdings, propagating it through the pipeline, and persisting it into `etf_aum_series`. This removes the dependency on FinLab for AUM data and keeps incremental inflow computation intact.

## Requirements

### Requirement: Fund asset summary extraction during holdings scrape

The official ETF scrapers SHALL extract the fund asset summary — assets under management (AUM), net asset value per unit (NAV), outstanding units, and the disclosure date — during the holdings scrape. When the response used to parse holdings already contains the fund asset summary, the scraper SHALL extract it from that same response without issuing any additional HTTP request. When the holdings response does not expose the fund asset summary, the scraper SHALL issue at most one supplementary request to a summary endpoint of the same official source; any failure of that supplementary request SHALL yield a null fund asset summary and SHALL NOT abort or degrade holdings parsing. When a field cannot be parsed from a given source, the scraper SHALL set that field to null and SHALL NOT abort holdings parsing.

#### Scenario: JSON API source returns fund asset summary

- **WHEN** an official JSON API response is parsed for holdings
- **THEN** the scraper SHALL also read `aum`, `nav`, `units`, and `nav_date` from the fund asset section of the same payload and return them alongside the holdings

#### Scenario: Holdings response lacks summary — supplementary request allowed

- **WHEN** a source's holdings endpoint exposes no fund asset summary but the same official source provides a dedicated summary endpoint
- **THEN** the scraper SHALL issue at most one supplementary request for the summary, and a failure of that request SHALL result in a null summary while the holdings result remains intact

#### Scenario: HTML source missing a fund asset field

- **WHEN** an HTML source provides holdings but a fund asset field (for example NAV) is absent or unparseable
- **THEN** the scraper SHALL return that field as null and SHALL still return the parsed holdings and the remaining fund asset fields


<!-- @trace
source: fix-ctbc-rest-and-cathay-nav
updated: 2026-07-12
code:
  - ETF/CLAUDE.md
  - ETF/scrapers/official_api_scraper.py
tests:
  - ETF/tests/test_new_scrapers.py
-->

---
### Requirement: Fund asset summary propagation via PipelineContext

The pipeline SHALL carry per-ETF fund asset summaries through `PipelineContext.etf_fund_assets`, a mapping from ETF code to an object containing `aum`, `nav`, `units`, and `nav_date`. Scraper-dispatching steps SHALL populate this mapping and `AumSyncStep` SHALL consume it.

#### Scenario: Scraper populates context

- **WHEN** a scraper-dispatching step successfully scrapes an ETF that exposes a fund asset summary
- **THEN** the step SHALL write an entry keyed by that ETF code into `ctx.etf_fund_assets`

#### Scenario: ETF without a fund asset summary

- **WHEN** an ETF is scraped from a source that exposes no fund asset summary
- **THEN** no entry SHALL be written for that ETF and the pipeline SHALL continue without error


<!-- @trace
source: fix-aum-sync-from-scrapers
updated: 2026-06-14
code:
  - next-env.d.ts
-->

---
### Requirement: AumSyncStep persists fund assets from context

`AumSyncStep` SHALL read fund asset summaries from `ctx.etf_fund_assets` and upsert one `etf_aum_series` row per ETF that has a summary, and SHALL NOT read AUM data from FinLab. AUM SHALL be stored in units of 100-million NTD (`aum_100m = aum / 1e8`), outstanding units SHALL be stored in units of 100-million units (`units / 1e8`), and NAV SHALL be stored unchanged as NTD per unit. As an auxiliary step, any failure SHALL be logged without re-raising.

##### Example: unit conversion

| Source field | Raw value (NTD / units) | Stored field | Stored value |
| ----- | --------------- | ----- | ----- |
| aum   | 12,345,678,900  | aum_100m | 123.456789 |
| units | 1,000,000,000   | units    | 10.0 |
| nav   | 12.3456         | nav      | 12.3456 |

#### Scenario: Context contains fund assets

- **WHEN** `AumSyncStep` runs and `ctx.etf_fund_assets` contains one or more entries
- **THEN** it SHALL upsert an `etf_aum_series` row for each entry using the data date and the converted AUM, NAV, and units values

#### Scenario: Upsert is invoked with a valid signature

- **WHEN** `AumSyncStep` upserts the assembled records
- **THEN** it SHALL call the upsert helper with exactly the services handle and the records list, and the call SHALL NOT raise a signature error

#### Scenario: No fund assets available

- **WHEN** `AumSyncStep` runs and `ctx.etf_fund_assets` is empty
- **THEN** it SHALL log a warning, write no rows, and allow subsequent pipeline steps to continue


<!-- @trace
source: fix-aum-sync-from-scrapers
updated: 2026-06-14
code:
  - next-env.d.ts
-->

---
### Requirement: Incremental inflow computation unchanged

`AumSyncStep` SHALL continue to compute `inflow_100m`, `cumulative_inflow_yi`, and `inflow_share_of_growth` from successive daily AUM rows using the existing logic, independent of the change of AUM data source.

#### Scenario: Inflow derived after new AUM row

- **WHEN** a new daily AUM row is upserted for an ETF that already has prior rows
- **THEN** the cumulative inflow and inflow-share-of-growth columns SHALL be recomputed over the ordered AUM series for that ETF

<!-- @trace
source: fix-aum-sync-from-scrapers
updated: 2026-06-14
code:
  - next-env.d.ts
-->