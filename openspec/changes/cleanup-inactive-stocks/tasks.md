## 1. 修改 cleanup_old_data()

- [ ] 1.1 在 `ETF/database/sql_storage.py` 的 `cleanup_old_data()` 中，現有五段 retention DELETE 之後，新增四段「非現有持股」DELETE（`stock_prices_daily`、`stock_revenue_monthly`、`stock_broker_transactions`、`stock_shareholder_weekly`），使用 `NOT IN (SELECT DISTINCT stock_code FROM etf_holdings_snapshot WHERE data_date >= CURRENT_DATE - INTERVAL '7 days')` subquery，並加上 30 天 buffer 條件
- [ ] 1.2 在同一 `conn.commit()` 區塊內補上四個新 `res_*` 變數的 log 輸出，格式與現有 retention log 一致

## 2. 驗證

- [ ] 2.1 本地執行 `uv run python ETF/main.py --dry-run` 確認 pipeline 可正常跑完（dry-run 會跳過 CleanupStep，確認其他步驟無受影響）
- [ ] 2.2 直接呼叫 `sql_storage.cleanup_old_data()` 檢查 SQL 語法正確、log 輸出四個新欄位的筆數
