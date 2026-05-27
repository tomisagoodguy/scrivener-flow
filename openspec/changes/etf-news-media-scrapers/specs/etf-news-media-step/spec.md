## ADDED Requirements

### Requirement: NewsMediaStep integrates media scrapers into pipeline

The system SHALL implement `NewsMediaStep` as a `BaseStep` subclass in the ETF Pipeline that coordinates CNYES, UDN, and MoneyDJ scrapers for all ETF top holdings.

The system SHALL fetch news for the union of all ETF top-N holdings (deduplicated stock codes), using the same top-codes map as `NewsContextStep`.

The system SHALL write all fetched news items to the `etf_news` table via `sql_storage.upsert_etf_news()`, tagged with the correct `etf_code` for each holding.

The system SHALL append media news for the primary ETF's holdings to `ctx.news_context` after `NewsContextStep` has already populated it with MOPS data.

The system SHALL be classified as an auxiliary step: its `execute()` method MUST catch all exceptions, log errors, and return `ctx` without re-raising.

The system SHALL skip execution when `ctx.is_dry_run` is True.

The system SHALL be inserted into the pipeline orchestrator immediately after `NewsContextStep`.

#### Scenario: Successful execution writes media news to DB and context

- **WHEN** `NewsMediaStep.execute()` runs with valid ETF holdings in the pipeline
- **THEN** news items from CNYES, UDN, and MoneyDJ are written to `etf_news`
- **THEN** `ctx.news_context` contains both MOPS announcements (from prior step) and media news for primary ETF holdings
- **THEN** `source` field in DB records equals `"鉅亨網"`, `"經濟日報"`, or `"MoneyDJ"` respectively

#### Scenario: Step does not interrupt pipeline on partial scraper failure

- **WHEN** one of the three media scrapers raises an exception during execution
- **THEN** the remaining scrapers continue to execute
- **THEN** `NewsMediaStep` returns `ctx` without raising
- **THEN** an error is logged

#### Scenario: Step skips on dry run

- **WHEN** `ctx.is_dry_run` is True
- **THEN** `should_skip()` SHALL return True
- **THEN** no HTTP requests are made and no DB writes occur

#### Scenario: DB upsert uses ON CONFLICT DO NOTHING for media news

- **WHEN** the same news article (same etf_code + stock_code + pub_date + title) is written twice
- **THEN** the second write is silently ignored
- **THEN** no duplicate rows are created in `etf_news`
