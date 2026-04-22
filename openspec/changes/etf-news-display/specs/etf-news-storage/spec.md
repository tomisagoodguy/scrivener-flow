## ADDED Requirements

### Requirement: Pipeline 將 MOPS 公告寫入 etf_news 表
`NewsContextStep` 抓取公告後 SHALL upsert 進 `etf_news` 資料表，以 `(etf_code, stock_code, pub_date, title)` 四欄去重（ON CONFLICT DO NOTHING）。

#### Scenario: 正常寫入
- **WHEN** `NewsContextStep` 成功取得 MOPS 公告列表（至少 1 筆）
- **THEN** 所有公告 upsert 進 `etf_news`，重複筆數靜默跳過

#### Scenario: MOPS API 失敗
- **WHEN** MOPS API 回傳錯誤或逾時
- **THEN** `NewsContextStep` 記錄 error log，`ctx.news_context` 保持空列表，不 raise，pipeline 繼續執行

#### Scenario: Dry run 模式
- **WHEN** `ctx.is_dry_run` 為 True
- **THEN** `NewsContextStep` 的 `should_skip()` 回傳 True，跳過抓取與寫入

### Requirement: CleanupStep 自動刪除 5 天前新聞
`cleanup_old_data()` SHALL 在現有清除邏輯後，刪除 `pub_date < CURRENT_DATE - INTERVAL '5 days'` 的 `etf_news` 記錄。

#### Scenario: 每日清除
- **WHEN** `CleanupStep` 執行 `cleanup_old_data()`
- **THEN** `etf_news` 中所有 `pub_date` 超過 5 天的記錄被刪除，並記錄刪除筆數 log

#### Scenario: 無過期資料
- **WHEN** `etf_news` 全部記錄均在 5 天內
- **THEN** DELETE 執行成功，影響 0 筆，不拋出錯誤
