## ADDED Requirements

### Requirement: LINE 每日報告附上族群摘要
每日 LINE 報告 SHALL 在現有 ETF 異動訊息之後，附加今日強勢族群 TOP 5 與本週強勢族群 TOP 5。

#### Scenario: 正常發送
- **WHEN** `daily_ai_report.py` 組裝 LINE 訊息
- **THEN** 從 DB 查詢當日 `sector_strength`，取 ret_1d 前 5 名
- **THEN** 取 ret_5d 前 5 名
- **THEN** 以純文字格式附加在報告末尾

#### Scenario: 族群資料不存在時降級
- **WHEN** `sector_strength` 當日無資料（Pipeline 步驟失敗）
- **THEN** LINE 報告跳過族群摘要區塊，不顯示錯誤訊息

### Requirement: LINE 族群摘要格式
族群摘要 SHALL 使用純文字格式，包含排名、族群名稱、漲幅數字。

#### Scenario: 格式範例
- **WHEN** 族群資料存在
- **THEN** 輸出格式為：
  ```
  📊 今日強勢族群
  1. 半導體:記憶體IC  +3.2%
  2. 被動元件:電容器  +2.8%
  3. ...

  📈 本週強勢族群
  1. 半導體:記憶體IC  +17.5%
  2. ...
  ```
