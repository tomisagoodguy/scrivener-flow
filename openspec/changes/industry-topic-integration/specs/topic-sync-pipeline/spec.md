## ADDED Requirements

### Requirement: Daily topic sync from external repo

The system SHALL fetch `topics.json` and `company-topics/index.json` from `https://raw.githubusercontent.com/stock-data-ai/stock-data/main/src/data/layer0/topics.json` and `https://raw.githubusercontent.com/stock-data-ai/stock-data/main/src/data/layer3/company-topics/index.json` respectively, and upsert the results into `stock_topics` and `stock_topic_assignments` tables.

#### Scenario: Successful sync

- **WHEN** `SyncTopicsStep` executes
- **THEN** all active topics from `topics.json` are upserted into `stock_topics` with `topic_id`, `name`, `short_name`, `group`, `description`, `color`, `icon`
- **THEN** all mappings from `company-topics/index.json` are upserted into `stock_topic_assignments` with `stock_code` and `topic_id`
- **THEN** any `stock_topic_assignments` rows whose `stock_code`+`topic_id` pairs no longer exist in the remote file are deleted

#### Scenario: Step failure does not break pipeline

- **WHEN** the remote URL is unreachable or returns non-200
- **THEN** `SyncTopicsStep` logs an error and returns without raising
- **THEN** subsequent pipeline steps continue normally

### Requirement: DB schema for topics

The `stock_topics` table SHALL have columns: `topic_id TEXT PRIMARY KEY`, `name TEXT`, `short_name TEXT`, `group_name TEXT`, `description TEXT`, `color TEXT`, `icon TEXT`, `updated_at TIMESTAMPTZ`.

The `stock_topic_assignments` table SHALL have columns: `stock_code TEXT`, `topic_id TEXT`, `PRIMARY KEY (stock_code, topic_id)`, and a foreign key reference to `stock_topics(topic_id)` with ON DELETE CASCADE.

Both tables SHALL have RLS enabled with a public read policy (no `user_id` isolation — topics are shared reference data).

#### Scenario: Schema correctness

- **WHEN** a stock appears in `company-topics/index.json` with multiple topic IDs
- **THEN** each topic ID creates one row in `stock_topic_assignments` with that `stock_code`

##### Example: multi-topic stock

| stock_code | topics in JSON | rows in stock_topic_assignments |
|------------|---------------|--------------------------------|
| 2330 | ["asic-ip-design", "hpc-network-ic"] | 2 rows |
| 1101 | ["battery-cell-module"] | 1 row |
