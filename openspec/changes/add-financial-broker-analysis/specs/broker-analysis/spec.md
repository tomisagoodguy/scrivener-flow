# Spec: Broker Analysis

## ADDED Capability: Broker Transaction Data

#### Scenario: Database Storage

- The system MUST store daily aggregated "Top 15 Broker" transactions for each stock.
- The schema MUST include `buy_volume`, `sell_volume`, `net_volume`, and `force_metric`.

#### Scenario: Data Ingestion

- The ETL process MUST fetch `etl:broker_transactions:top15_buy` and `sell` from Finlab.
- The ETL process MUST calculate `net_volume` as `(Buy - Sell) * Close`.
- The ETL process MUST calculate `force` as `Rolling(60).Mean / Rolling(60).Std` of `net_volume`.
- The process MUST upsert this data into `stock_broker_transactions`.

#### Scenario: API Access

- NEW GET endpoint `/api/investment/broker-transactions` MUST return data for a specific stock within a date range.
- The response MUST be a JSON array of objects with `date`, `net_volume`, `force`.

## ADDED Capability: Broker Chart Visualization

#### Scenario: Dashboard Integration

- The Stock Dashboard MUST display a new "Broker Trends" chart.
- The chart MUST show Net Volume as colored bars (Red for positive, Green for negative).
- The chart MUST show the "Force" indicator as a line on a secondary axis.
- The chart MUST align time-axis with other charts if possible or be standalone responsive.
