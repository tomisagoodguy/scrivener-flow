## ADDED Requirements

### Requirement: 清理已離場股票的輔助資料
`cleanup_old_data()` 在執行時間 retention 刪除之後，SHALL 額外刪除「已不在任何 ETF 現有持股中」的股票資料，從以下四張表移除：`stock_prices_daily`、`stock_revenue_monthly`、`stock_broker_transactions`、`stock_shareholder_weekly`。

「現有持股」定義為：過去 7 天內出現在 `etf_holdings_snapshot` 的 `stock_code`。

對已離場股票，保留 30 天 buffer（`data_date >= CURRENT_DATE - INTERVAL '30 days'`）再刪除，避免誤刪剛出場的股票。

#### Scenario: 股票已完全出場超過 30 天
- **WHEN** 某股票不在過去 7 天任何 ETF 的 `etf_holdings_snapshot` 中，且該股票在輔助資料表中有 `data_date < CURRENT_DATE - 30 days` 的資料
- **THEN** 系統 SHALL 刪除該股票在四張輔助資料表中所有 `data_date < CURRENT_DATE - 30 days` 的記錄

#### Scenario: 股票仍在持股中
- **WHEN** 某股票出現在過去 7 天任一 ETF 的 `etf_holdings_snapshot`
- **THEN** 系統 SHALL NOT 刪除該股票的任何輔助資料（時間 retention 邏輯另行處理）

#### Scenario: 股票剛出場（30 天內）
- **WHEN** 某股票不在過去 7 天的快照，但其輔助資料的 `data_date >= CURRENT_DATE - 30 days`
- **THEN** 系統 SHALL NOT 刪除這些近期資料（buffer 保護）

### Requirement: 清理結果應記錄至 log
`cleanup_old_data()` SHALL 在 log 中輸出每張表被刪除的筆數，格式與現有 retention log 一致。

#### Scenario: 有非現有持股的舊資料被刪除
- **WHEN** 清理執行後有筆數被刪除
- **THEN** log SHALL 輸出如 `- 非持股股價已清理: N 筆` 的訊息

#### Scenario: 無需清理
- **WHEN** 所有資料均屬現有持股或在 buffer 期內
- **THEN** log SHALL 輸出 `0 筆`，不拋出錯誤
