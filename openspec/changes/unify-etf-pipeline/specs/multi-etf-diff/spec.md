## ADDED Requirements

### Requirement: 次要 ETF 持股異動計算
MultiEtfStep 在儲存快照後，SHALL 從 etf_holdings_snapshot 取得前日快照，
與今日資料做 diff，產出 IN / OUT / BUY / SELL 異動記錄。

#### Scenario: 正常有前日資料
- **WHEN** 今日快照存入後，DB 存在前日同 etf_code 快照
- **THEN** 系統計算 diff，diff_logs 包含所有異動事件

#### Scenario: 無前日資料（首次執行）
- **WHEN** DB 中無此 etf_code 的歷史快照
- **THEN** 系統 log warning 並跳過 diff，不拋出 exception

#### Scenario: 重複執行同日
- **WHEN** 今日快照已存在，pipeline 重跑
- **THEN** 系統改與次新快照（前一日）比對，避免 diff 為空

### Requirement: Diff 結果寫入 etf_diff_logs
每次計算完成後，SHALL 將 diff_logs 以 upsert 方式存入 etf_diff_logs 表，
conflict key 為 (etf_code, stock_code, data_date)。

#### Scenario: 成功寫入
- **WHEN** diff_logs 非空
- **THEN** 所有異動記錄存入 DB，重複執行時覆蓋舊值
