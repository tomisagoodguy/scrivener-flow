## Context

`ETF/database/sql_storage.py` 的 `cleanup_old_data()` 目前只按時間 retention 刪除（260/365/730 天），不管股票是否仍在持股。11 支 ETF 合計持股約 300 支，但部分股票已完全出場，其股價、營收、券商、集保資料仍持續累積至 retention 到期。

## Goals / Non-Goals

**Goals:**
- 對已離開所有 ETF 持股的股票，提前刪除其輔助資料（保留 30 天 buffer）
- 維持現有時間 retention 邏輯不變（用於現有持股的資料量控管）
- log 輸出清理筆數

**Non-Goals:**
- 不修改 `etf_holdings_snapshot`、`etf_diff_logs`、`etf_weight_history` 的清理邏輯
- 不改變 `CleanupStep` 的呼叫時機或 pipeline 順序

## Decisions

### 用 SQL subquery 一次完成，不在 Python 撈清單再刪

在 `cleanup_old_data()` 中直接用：

```sql
DELETE FROM stock_prices_daily
WHERE data_date < CURRENT_DATE - INTERVAL '30 days'
  AND stock_code NOT IN (
      SELECT DISTINCT stock_code
      FROM etf_holdings_snapshot
      WHERE data_date >= CURRENT_DATE - INTERVAL '7 days'
  )
```

**為何不在 Python 撈現有持股清單再做 DELETE IN (list)**：
- 清單可能有 300+ 筆，SQL IN () 超長；subquery 更乾淨
- 減少一次 round-trip，原子性更好

### 7 天作為「現有持股」的判斷窗口

各 ETF 公告日不同步（有的每日更新，有的數天才一筆），7 天窗口足以涵蓋所有 ETF 最新一次公告。

### 30 天 buffer

stock_prices_daily 時間 retention 是 260 天，buffer 設 30 天讓剛出場的股票有緩衝，不會在出場後立即被刪除，方便前端仍能顯示近期走勢。

### 四張表分開執行，不用 CASCADE

各表的 `stock_code` 不是 FK，需個別 DELETE；分開執行也方便 log 各自筆數。

## Risks / Trade-offs

- **[風險] subquery 效能**：`etf_holdings_snapshot` 若無 `(data_date, stock_code)` index，subquery 可能慢 → 此表已有 `idx_holdings_date` index（見 migration），影響小
- **[風險] 7 天窗口太短**：若某 ETF 超過 7 天沒更新快照（例如長假），其持股可能被誤判為「已離場」 → 可接受，buffer 30 天可再保護一層；若擔心可調整為 14 天

## Migration Plan

1. 修改 `sql_storage.py` 的 `cleanup_old_data()`，在現有 retention DELETE 後追加四段 inactive stock DELETE
2. 本地 dry-run 驗證 SQL 語法（`--dry-run` 會跳過 CleanupStep）
3. 直接 push，下次 CI 執行時生效；無需 DB migration
4. **Rollback**：移除新增的四段 DELETE 即可，無破壞性變更
