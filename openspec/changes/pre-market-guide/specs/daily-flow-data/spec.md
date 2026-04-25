## ADDED Requirements

### Requirement: etf_flow_daily 歷史資料補齊
系統 SHALL 在 `etf_flow_daily` 表中有近 90 天的歷史資料，
使 `DailyFlowPanel` 不再顯示「暫無資金流向資料」。

#### Scenario: backfill 執行後有資料
- **WHEN** 執行 `uv run python ETF/scripts/backfill_flow.py --days 90` 成功
- **THEN** `etf_flow_daily` 有 >= 1 筆 `totals.stocks_count > 0` 的記錄

#### Scenario: 無交易日資料
- **WHEN** backfill 跑到週末或假日（無 etf_diff_logs 資料的日期）
- **THEN** 寫入一筆 `totals.stocks_count=0` 的記錄，不拋出錯誤

### Requirement: FlowComputeStep 每日 CI 自動執行
每日 pipeline（`ETF/pipeline/orchestrator.py`）MUST 包含 `FlowComputeStep`，
使得每次 pipeline 完成後 `etf_flow_daily` 都有當日資料。

#### Scenario: CI pipeline 執行後
- **WHEN** GitHub Actions 每日 pipeline 成功完成
- **THEN** `etf_flow_daily` 有當日日期的記錄

#### Scenario: FlowComputeStep 失敗不中斷
- **WHEN** `FlowComputeStep` 拋出例外
- **THEN** pipeline 繼續執行後續步驟（輔助步驟規則）
