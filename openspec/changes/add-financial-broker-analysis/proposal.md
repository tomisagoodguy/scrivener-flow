# Proposal: Add Broker Top 15 Analysis

## Goal

Integrate "Top 15 Broker Transactions" analysis into the Investment Dashboard to allow tracking of major brokerage movements and "smart money" force.

## Context

The user requests a specific analysis based on the top 15 brokers' buy and sell volumes.
This involves:

1. **Data**: Buy/Sell volume of top 15 brokers (daily).
2. **Indicators**:
    * **Net Volume**: `(Buy Volume - Sell Volume) * Close Price` (or just volume if preferred, but user formula uses `close`). User said `(buy-sell) * close` is `net_volume`. Check: actually `(buy_vol - sell_vol) * close` is usually Net Value. User's snippet: `net_volume = (buy_vol - sell_vol) * close`.
    * **Force**: `net_volume.rolling(60).mean() / net_volume.rolling(60).std()` (Z-score like momentum).
3. **Visualization**: Bar chart for Net Volume (Day), Line chart for Force.

The current system has `StockDashboardPage` which displays Price, Revenue, and Chips. This will be the 4th major component.

## Changes

1. **Database**: Create `stock_broker_transactions` table to store daily top 15 summary.
2. **ETL**: Update `sync_stock_financials.py` to fetch `etl:broker_transactions:top15_buy/sell` from Finlab, compute indicators, and upsert to DB.
3. **API**: New endpoint `/api/investment/broker-transactions` to fetch data.
4. **UI**: New `BrokerChart` component and integration into `StocksDashboardPage`.

## Validation

- ETL script successfully fetches and stores data.
* API returns correct JSON structure.
* Dashboard displays the chart correctly with interactivity.
