## Purpose

Bounds the storage used by `equity_distribution_stats`. Readers only use the most recent weekly snapshots, so snapshots older than two years are removed.

## ADDED Requirements

### Requirement: Keep two years of equity distribution snapshots

The daily database cleanup SHALL delete every `equity_distribution_stats` row whose `snapshot_date` is more than 730 days before the current date. The cleanup SHALL NOT delete rows dated within the last 730 days.

#### Scenario: Old snapshots are removed

- **WHEN** the cleanup runs
- **THEN** it issues one DELETE on `equity_distribution_stats` limited to `snapshot_date` older than 730 days
