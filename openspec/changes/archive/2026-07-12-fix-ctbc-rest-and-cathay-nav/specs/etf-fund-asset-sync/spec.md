## MODIFIED Requirements

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
