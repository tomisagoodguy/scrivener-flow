# Tasks

1. [ ] **Migration**: Create SQL migration for `stock_broker_transactions` table.
    - Fields: `stock_id`, `date`, `buy_volume`, `sell_volume`, `net_volume`, `force_metric`.
    - Primary Key: `(stock_id, date)`.
2. [ ] **ETL Script**: Update `sync_stock_financials.py`.
    - Fetch `etl:broker_transactions:top15_buy` and `sell` from Finlab.
    - Calculate `net_volume` and `force`.
    - Upsert to `stock_broker_transactions`.
3. [ ] **API**: Create `/api/investment/broker-transactions` endpoint.
    - Query `stock_broker_transactions`.
    - Support date range filtering.
4. [ ] **Component**: Create `BrokerChart` component.
    - Combined Bar (Net Vol) + Line (Force).
    - Styling consistent with existing charts.
5. [ ] **Integration**: Add `BrokerChart` to `StockDashboardPage`.
    - Fetch data in `fetchAllData`.
    - Add to Grid layout.
6. [ ] **Validation**: Verify data flow from Finlab to UI.
