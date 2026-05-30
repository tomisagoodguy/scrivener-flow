## ADDED Requirements

### Requirement: Static chain edges JSON file

The repository SHALL contain `src/data/chain_edges.json` as the source of truth for all supply chain directed edges. Each entry SHALL have the shape `{ "source": "<topic_id>", "target": "<topic_id>" }` where both values are valid `id` fields from `topics.json`.

#### Scenario: JSON structure correctness

- **WHEN** `chain_edges.json` is loaded
- **THEN** every object has exactly `source` and `target` string fields
- **THEN** no duplicate `(source, target)` pairs exist

##### Example: valid entries

| source | target | valid? |
|--------|--------|--------|
| "asic-ip-design" | "wafer-foundry" | yes |
| "wafer-foundry" | "asic-ip-design" | yes (reverse allowed) |
| "asic-ip-design" | "asic-ip-design" | no (self-loop forbidden) |

### Requirement: DB table for chain edges

The system SHALL have a `topic_chain_edges` table with columns `source_topic_id TEXT` and `target_topic_id TEXT`, with `PRIMARY KEY (source_topic_id, target_topic_id)`.

Both columns SHALL reference `stock_topics(topic_id) ON DELETE CASCADE`.

RLS SHALL be enabled with a public read policy (no user_id isolation — edges are shared reference data).

The migration SQL SHALL include a seed INSERT for all edges defined in `chain_edges.json` at migration time.

#### Scenario: Seed data integrity

- **WHEN** the migration runs on a database that already has `stock_topics` populated
- **THEN** all edges from `chain_edges.json` exist in `topic_chain_edges`
- **THEN** no row violates the FK constraint (both topic_ids exist in `stock_topics`)

#### Scenario: Cascade delete

- **WHEN** a row is deleted from `stock_topics`
- **THEN** all `topic_chain_edges` rows referencing that `topic_id` (as source or target) are automatically deleted
