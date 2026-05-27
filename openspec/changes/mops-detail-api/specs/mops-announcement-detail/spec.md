## ADDED Requirements

### Requirement: Fetch full announcement detail from MOPS detail API

The system SHALL call `https://mops.twse.com.tw/mops/api/t05st02_detail` for each matching announcement when `enterDate`, `serialNumber`, and `marketKind` are present in the summary response (`item[5].parameters`).

The detail response SHALL be parsed to extract:
- `content`: full announcement text (row[9])
- `speaker`: announcement issuer (row[3])
- `event_date`: event date in YYYYMMDD format converted from ROC calendar (row[8])

If the detail API call fails or returns no matching row, the system SHALL silently fall back with `content`/`speaker`/`event_date` set to `None`, and MUST still return the summary record.

#### Scenario: Successful detail fetch

- **WHEN** a summary announcement has `item[5].parameters` with valid `enterDate`, `serialNumber`, and `marketKind`
- **THEN** `fetch_mops_detail()` is called and returns `content`, `speaker`, `event_date` as non-None strings

#### Scenario: Detail API unavailable

- **WHEN** `fetch_mops_detail()` raises an exception or returns an empty dict
- **THEN** the announcement record is still returned with `content=None`, `speaker=None`, `event_date=None`

#### Scenario: item[5] missing or malformed

- **WHEN** `item[5]` does not exist or is not a dict with a `parameters` key
- **THEN** detail API is skipped; `detail_params` defaults to `{}` and all detail fields are `None`

##### Example: parameter extraction

| item[5] value | enter_date | serial_number | market_kind |
|---|---|---|---|
| `{"parameters": {"enterDate": "1150527", "serialNumber": 3, "marketKind": "sii"}}` | `"1150527"` | `3` | `"sii"` |
| `{}` | `None` | `None` | `None` |
| `"string"` | `None` | `None` | `None` |

### Requirement: Capture company name from summary response

The system SHALL extract `item[3]` (company name) from the MOPS summary response and include it as `company_name` in each announcement record.

#### Scenario: Company name present

- **WHEN** the summary response item has a non-empty `item[3]`
- **THEN** the announcement record includes `company_name` equal to `item[3]`

### Requirement: Persist detail fields in etf_news table

The `etf_news` database table SHALL contain four new nullable columns: `content TEXT`, `speaker TEXT`, `event_date TEXT`, `company_name TEXT`.

The `upsert_etf_news()` method SHALL write these four fields when present; `NULL` is acceptable when the detail API returned no data.

#### Scenario: Upsert with full detail

- **WHEN** `upsert_etf_news()` is called with a record containing non-None `content`, `speaker`, `event_date`, `company_name`
- **THEN** all four values are persisted in the `etf_news` row

#### Scenario: Upsert without detail

- **WHEN** `upsert_etf_news()` is called with `content=None`
- **THEN** the row is inserted with `content IS NULL` and no error is raised

### Requirement: Include announcement content in AI prompt

When `content` is available for a news item in `ctx.news_context`, the AI prompt's news block SHALL include the content truncated to 500 characters.

Items without `content` SHALL still appear in the prompt with title only.

#### Scenario: Content included in prompt

- **WHEN** a news item has `content` with length > 0
- **THEN** `build_report_prompt()` includes `content[:500]` in the news block for that item

#### Scenario: Content absent from prompt

- **WHEN** a news item has `content=None`
- **THEN** `build_report_prompt()` includes the item with title and pub_date only, no content field
