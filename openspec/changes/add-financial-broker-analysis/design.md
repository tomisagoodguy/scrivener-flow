# Design: Broker Top 15 Analysis

## Architecture

- **Data Flow**: Finlab `etl:broker_transactions*` -> Python ETL -> Supabase (`stock_broker_transactions`) -> Next.js API -> Recharts.
- **Table Schema**:
  - `stock_broker_transactions`:
    - `stock_id` (text, FK)
    - `date` (date)
    - `buy_amount` (numeric) - Aggregated Buy Volume of Top 15
    - `sell_amount` (numeric) - Aggregated Sell Volume of Top 15
    - `net_volume` (numeric) - (Buy-Sell) * Close (or just Volume if Close not avail)
    - `force_metric` (numeric) - Calculated rolling metric
  - Constraint: Unique `(stock_id, date)`.

## Indicators

1. **Top 15 Buy/Sell**: Refers to the main "Smart Money" players.
2. **Net Volume**: The surplus liquidity provided by these brokers.
3. **Force**: A momentum indicator derived from Net Volume (Z-score of 60-day rolling window).
    - `Force = (MA60(NetVol) - NetVol) / STD60(NetVol)` ??
    - No, user formula: `force = net_volume.rolling(60).mean() / net_volume.rolling(60).std()`. This is `Mean / Std` (Coefficient of Variation inverse? or Signal-to-Noise?).
    - Wait, user wrote: `mean() / std()`. This is basically a "Signal Strength" of the Net Volume over 60 days. Not quite Z-Score (which filters the *current* value).
    - It maps the *trend* stability.
    - I will implement the exact formula provided.

## UI Visualization

- **ComposedChart**:
  - Bar: `net_volume` (Red > 0, Green < 0).
  - Line: `force_metric` (Secondary Axis).
- **Placement**: Under Chips Analysis or separate "Broker" tab/section.
