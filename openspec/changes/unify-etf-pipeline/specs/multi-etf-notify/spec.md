## ADDED Requirements

### Requirement: 次要 ETF LINE 異動通知
MultiEtfStep 完成 diff 後，SHALL 呼叫 ctx.notifier.notify_diffs() 發送 LINE 通知，
格式與 00981A 相同，訊息標頭標示 etf_code 與 ETF 名稱。

#### Scenario: 有顯著異動
- **WHEN** diff_logs 含 IN / OUT / BUY / SELL 事件
- **THEN** 發送 LINE 通知，每筆異動一條訊息

#### Scenario: 無顯著異動
- **WHEN** diff_logs 為空或全為微小調整
- **THEN** 不發送異動通知（靜默），僅發送完成摘要

### Requirement: 次要 ETF LINE 完成摘要
MultiEtfStep 每支 ETF 處理完畢後，SHALL 呼叫 ctx.notifier.notify_completion()
發送摘要，包含 ETF 代碼、資料日期、持股總數、異動統計。

#### Scenario: 正常完成
- **WHEN** etf_code 的持股快照成功儲存
- **THEN** 發送包含 etf_code、data_date、total_holdings、diff_stats 的完成摘要

#### Scenario: market_signals 欄位缺失
- **WHEN** 次要 ETF 持股資料不含技術指標欄位
- **THEN** market_signals 帶空 dict，不影響通知發送
