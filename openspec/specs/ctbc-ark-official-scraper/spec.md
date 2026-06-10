# ctbc-ark-official-scraper Specification

## Purpose

TBD - created by archiving change 'expand-etf-coverage-and-diff-schema'. Update Purpose after archive.

## Requirements

### Requirement: CTBC ARK ETF holdings fetched via official API

The system SHALL fetch 00983A (中信 ARK 創新) holdings using the existing CTBC two-step authenticated REST API (`_fetch_ctbc()`), with its fund ID (FID) configured in CATALOG.

The system SHALL set the `source` field of 00983A to `official_api` in `ETF/config/etf_registry.py` and `src/lib/investment/etfRegistry.ts`.

If the CTBC API returns empty data or FID is not confirmed, the system SHALL fall back to the existing Pocket.tw scraper via the fallback chain.

#### Scenario: Successful CTBC API fetch for 00983A

- **WHEN** `official_api_scraper.fetch_holdings("00983A")` is called
- **THEN** the function returns a DataFrame with columns `code`, `name`, `weight`, `shares` containing at least one row with a valid 4-to-6-digit `code`

#### Scenario: CTBC API returns empty — fallback to Pocket

- **WHEN** the CTBC two-step API returns an empty `FundAssetsDetail` list
- **THEN** `fetch_holdings()` returns an empty DataFrame, and `multi_etf_step` falls back to `pocket_scraper`
