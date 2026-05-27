## 1. 資料庫 Migration

- [x] 1.1 在 `supabase/migrations/` 新增 `20260527120000_add_mops_detail_columns.sql`，採用「DB migration 策略：ALTER TABLE 加新欄位」決策，以 `ALTER TABLE etf_news ADD COLUMN IF NOT EXISTS` 加入 `content TEXT`、`speaker TEXT`、`event_date TEXT`、`company_name TEXT` 四個 nullable 欄位；實作「Persist detail fields in etf_news table」需求
- [x] 1.2 在 Supabase Dashboard SQL Editor（或 `psql`）執行上述 migration，確認四個欄位已存在

## 2. MOPS 爬蟲補強（mops_client.py）

- [x] 2.1 在 `ETF/services/news/mops_client.py` 新增 `fetch_mops_detail(enter_date, serial_number, company_id, market_kind, headers)` 函式，實作「呼叫 detail API 的時機：摘要迴圈內逐筆呼叫」決策：POST `https://mops.twse.com.tw/mops/api/t05st02_detail`，解析 `result.data` 找到匹配 `serial_number` 的列，回傳 `{"content", "speaker", "event_date"}`；實作「Fetch full announcement detail from MOPS detail API」需求
- [x] 2.2 在 `fetch_mops_announcements()` 的摘要迴圈中，加入 `item[3]`（company_name）擷取，實作「Capture company name from summary response」需求
- [x] 2.3 在同一迴圈中，解析 `item[5].parameters` 取得 `enter_date`、`serial_number`、`market_kind`；若三者均存在則在摘要迴圈內逐筆呼叫 `fetch_mops_detail()` 並在呼叫後 `time.sleep(0.2)`；實作「detail API 失敗的處理：靜默降級，保留摘要」決策：任何例外靜默回傳 `{}`，`content`/`speaker`/`event_date` 設 `None`；item[5] 缺失時 `detail_params` 降級為 `{}`
- [x] 2.4 在每日迴圈間的 sleep 從 0.3s 調整為 0.5s，降低被限速風險
- [x] 2.5 在 `requests.post()` 後加入 `result.get('code') != 200` 的早期 `continue` 判斷，避免靜默吃空資料

## 3. 儲存層更新（sql_storage.py）

- [x] 3.1 在 `ETF/database/sql_storage.py` 的 `upsert_etf_news()` 中，將 records 建構改為包含 `content`、`speaker`、`event_date`、`company_name`，並更新 INSERT SQL 加入這四個欄位及對應 `:param`；ON CONFLICT 子句改為 `DO UPDATE SET content = COALESCE(EXCLUDED.content, etf_news.content), speaker = COALESCE(EXCLUDED.speaker, etf_news.speaker), event_date = COALESCE(EXCLUDED.event_date, etf_news.event_date), company_name = COALESCE(EXCLUDED.company_name, etf_news.company_name)`（用 COALESCE 避免覆蓋已有值）；實作「Persist detail fields in etf_news table」需求

## 4. AI Prompt 補強（prompt_builder.py）

- [x] 4.1 在 `ETF/ai_report/prompt_builder.py` 的 `news_block` 建構邏輯中，將 `json.dumps(news_context)` 改為逐筆格式化：每則顯示 `pub_date`、`company_name`（或 `stock_code`）、`title`；採用「content 截斷策略：500 字」決策，若 `content` 有值則附上 `content[:500]`；實作「Include announcement content in AI prompt」需求
