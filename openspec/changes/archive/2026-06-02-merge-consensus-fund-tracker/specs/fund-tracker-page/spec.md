## MODIFIED Requirements

### Requirement: Fund tracker page route

The application SHALL expose a `/investment/fund-tracker` route that redirects all requests to `/investment/consensus-signal?tab=watchlist` using a server-side redirect.

The route SHALL be accessible to both authenticated and unauthenticated users (redirect occurs before auth check).

#### Scenario: Redirect preserves tab context

- **WHEN** a user navigates to `/investment/fund-tracker`
- **THEN** the server SHALL respond with a redirect to `/investment/consensus-signal?tab=watchlist`
- **THEN** the user SHALL land on the consensus-signal page with the 自選股 tab active

#### Scenario: Empty watch list

- **WHEN** the user's `watch_list` is empty AND `tab=watchlist` is active on the consensus-signal page
- **THEN** the page SHALL display a prompt directing the user to add stocks via `/investment/bare-k`

## MODIFIED Requirements

### Requirement: Navigation entry

The sidebar navigation SHALL update the "投信追蹤" link to point to `/investment/consensus-signal?tab=watchlist` instead of `/investment/fund-tracker`.

The "投信追蹤" navigation item SHALL be merged with or placed adjacent to the "共識掃描" item to reflect that both features now reside on the same page.

#### Scenario: Navigation link targets merged page

- **WHEN** an authenticated user views any investment page
- **THEN** the sidebar SHALL display a navigation item pointing to `/investment/consensus-signal?tab=watchlist` with label "共識掃描 / 投信追蹤" or equivalent combined label
