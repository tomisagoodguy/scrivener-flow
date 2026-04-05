## ADDED Requirements

### Requirement: AI 報告模組參數化
ai_report/fetcher.py、prompt_builder.py、analyzer.py 中的 ETF_CODE
SHALL 改為函數 / 類別參數，不得有模組層級硬編碼值。

#### Scenario: 傳入不同 etf_code
- **WHEN** 呼叫方傳入 etf_code="00980A"
- **THEN** fetcher 查詢該 ETF 的快照與 diff_logs，prompt_builder 產出對應標題

#### Scenario: 預設值相容
- **WHEN** 呼叫方未傳入 etf_code
- **THEN** 預設使用 "00981A"，行為與舊版相同

### Requirement: AI 每日報告迴圈三支 ETF
daily_ai_report.py SHALL 依序對 ["00981A", "00980A", "00991A"] 產出獨立 AI 報告，
每份報告透過 LINE 發送，主題標頭標示對應 etf_code。

#### Scenario: 全部成功
- **WHEN** 三支 ETF 均有當日快照
- **THEN** 發送三份 LINE 報告，順序為 00981A → 00980A → 00991A

#### Scenario: 單支失敗
- **WHEN** 某支 ETF 的 AI 報告產出拋出 exception
- **THEN** 記錄 error log，繼續處理下一支 ETF，不中止整體流程
