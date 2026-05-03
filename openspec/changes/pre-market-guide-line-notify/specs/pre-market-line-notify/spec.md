## ADDED Requirements

### Requirement: Daily LINE broadcast of pre-market guidance
After the ETF holdings carousel is sent, the system SHALL broadcast a separate LINE Flex Message bubble containing pre-market guidance derived from the latest `etf_flow_daily` record.

#### Scenario: Normal broadcast on trading day
- **WHEN** `NotifyStep` executes and `etf_flow_daily` has a record with `data_date` within the last 2 days
- **THEN** the system broadcasts a Flex Message bubble titled "盤前指引" containing consensus buys, consensus sells, net flow summary, and (if applicable) basket buy warning

#### Scenario: No recent data
- **WHEN** the latest `etf_flow_daily` record has `data_date` older than 2 days
- **THEN** the system logs a warning and skips sending the LINE message without raising an exception

#### Scenario: Flow compute step failed
- **WHEN** `etf_flow_daily` has no records at all
- **THEN** the system logs a warning and skips sending, pipeline continues normally

### Requirement: Consensus buy section
The bubble SHALL include a consensus buy section listing stocks where `inflow[].etf_count >= 4` (i.e., 4 or more ETFs bought the same stock on the same day), sorted by `total_nt` descending, showing at most 5 stocks.

#### Scenario: Stocks meet consensus threshold
- **WHEN** `inflow` contains entries with `etf_count >= 4`
- **THEN** the bubble shows each stock's code, name, amount in 億 (rounded to 1 decimal), and the list of buying ETF codes

#### Scenario: No stocks meet consensus threshold
- **WHEN** no `inflow` entry has `etf_count >= 4`
- **THEN** the consensus buy section is omitted from the bubble

### Requirement: Single-bet (concentrated) section
The bubble SHALL include a single-bet section for stocks where `inflow[].etf_count < 4` AND `total_nt >= 300_000_000`, showing at most 3 stocks sorted by `total_nt` descending.

#### Scenario: Concentrated bets exist
- **WHEN** `inflow` has entries with `etf_count < 4` and `total_nt >= 300000000`
- **THEN** bubble shows each stock with its single buyer ETF code and amount

#### Scenario: No concentrated bets
- **WHEN** no entry satisfies both conditions
- **THEN** single-bet section is omitted

### Requirement: Consensus sell section
The bubble SHALL include a consensus sell section listing stocks where `outflow[].etf_count >= 3`, sorted by absolute `total_nt` descending, showing at most 5 stocks. If no stocks meet the threshold, the section SHALL display "無".

#### Scenario: Consensus sells exist
- **WHEN** `outflow` contains entries with `etf_count >= 3`
- **THEN** bubble shows each stock code, name, amount in 億, and selling ETF codes

#### Scenario: No consensus sells
- **WHEN** no `outflow` entry has `etf_count >= 3`
- **THEN** section shows "共識賣：無"

### Requirement: Net flow summary row
The bubble footer SHALL display `totals.total_in_nt` and `totals.total_out_nt` as positive flow (rose color) and negative flow (green color), and net `totals.net_nt` as the headline figure.

#### Scenario: Positive net flow
- **WHEN** `totals.net_nt > 0`
- **THEN** footer text shows "+X.X億" in rose color

#### Scenario: Negative net flow
- **WHEN** `totals.net_nt <= 0`
- **THEN** footer text shows "-X.X億" in green color

### Requirement: Basket buy warning
The bubble SHALL include an amber warning row when a single ETF's `net_flow / totals.total_in_nt > 0.5`, identifying that ETF by code.

#### Scenario: Single ETF dominates inflow
- **WHEN** the ETF with the largest `by_etf[].net_flow` accounts for more than 50% of `totals.total_in_nt`
- **THEN** bubble appends "⚠ XX% 來自 {ETF_CODE} basket buy 申購"

#### Scenario: No single ETF dominates
- **WHEN** no ETF exceeds the 50% threshold
- **THEN** basket buy warning row is omitted

### Requirement: Failure isolation
The pre-market LINE notification SHALL be wrapped in try/except. Any exception SHALL be logged at ERROR level and the pipeline SHALL continue without re-raising.

#### Scenario: Database read fails
- **WHEN** the SQLAlchemy query to `etf_flow_daily` raises an exception
- **THEN** the error is logged and `NotifyStep` returns `ctx` normally

#### Scenario: LINE API call fails
- **WHEN** `broadcast_flex_message` raises a network or API error
- **THEN** the error is logged and the pipeline continues to `CleanupStep`
