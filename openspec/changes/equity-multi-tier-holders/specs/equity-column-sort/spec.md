## ADDED Requirements

### Requirement: Column headers are clickable to sort

The system SHALL make all column headers in both ranking tables on `/investment/equity` clickable. Clicking a header SHALL update the URL with `?sort=<column>&dir=asc|desc` and re-render with the corresponding sort applied.

Sortable columns and their sort keys:

| Column | Sort key | Default dir |
|---|---|---|
| 股東數 | `total_shareholders` | `desc` |
| 股東變化 | `shareholders_change_rate` | `desc` |
| 大戶持股變化 | `big_holder_pct_change` / `mid_holder_pct_change` / `whale_holder_pct_change` (follows active tier) | `desc` |
| 投信五日 | `it_buy_5d` | `desc` |
| 成交額 | `amount` | `desc` |

#### Scenario: Click unsorted column header

- **WHEN** user clicks a column header that is not the current sort column
- **THEN** URL SHALL update to `?sort=<column>&dir=desc` and the table SHALL re-render sorted by that column descending

#### Scenario: Click active sort column to reverse direction

- **WHEN** user clicks the column header that is already the active sort column
- **THEN** URL SHALL toggle `dir`: `desc` → `asc`, `asc` → `desc`

#### Scenario: Sort direction indicator on active column

- **WHEN** a sort column is active
- **THEN** the column header SHALL display a directional arrow icon (↑ for asc, ↓ for desc) next to the label

##### Example: sort states

| Current URL | Click column | New URL |
|---|---|---|
| (no sort param) | 股東數 | `?sort=total_shareholders&dir=desc` |
| `?sort=total_shareholders&dir=desc` | 股東數 | `?sort=total_shareholders&dir=asc` |
| `?sort=total_shareholders&dir=asc` | 成交額 | `?sort=amount&dir=desc` |

---

### Requirement: Default sort is preserved when no sort param present

The system SHALL use the original default sort when no `sort` URL param is present: left table sorted by active tier's `*_holder_pct_change DESC`, right table sorted by `shareholders_change_rate ASC`.

#### Scenario: No sort param falls back to default

- **WHEN** user visits `/investment/equity` without a `sort` param
- **THEN** left table SHALL be ordered by `big_holder_pct_change DESC` (or active tier equivalent) and right table by `shareholders_change_rate ASC`

---

### Requirement: NULL values sort to the bottom regardless of direction

The system SHALL place rows with NULL values in a sorted column at the bottom of the list for both ascending and descending sorts.

#### Scenario: NULL placement

- **WHEN** sorting by `it_buy_5d` descending
- **THEN** rows with NULL `it_buy_5d` SHALL appear after all non-NULL rows
