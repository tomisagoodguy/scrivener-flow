## Why

現行 `mops_client.py` 只取 MOPS 公告摘要（標題），未呼叫 `t05st02_detail` API，導致 AI 報告的新聞語境僅有標題、缺乏完整公告內文、發言人與事件日期，嚴重限制 Gemini 分析品質。參考 `stock-data-ai/stock-data` 的實作後發現此改進空間。

## What Changes

- `ETF/services/news/mops_client.py`：新增 `fetch_mops_detail()` 呼叫 `t05st02_detail` API，並在摘要迴圈中為每筆公告補充 `content`、`speaker`、`event_date`、`company_name`
- `ETF/database/sql_storage.py`：`upsert_etf_news()` 新增寫入 `content`、`speaker`、`event_date`、`company_name` 欄位
- `supabase/migrations/`：新增 migration SQL，為 `etf_news` 資料表加入四個新欄位
- `ETF/ai_report/prompt_builder.py`：更新新聞區塊，在 `content` 有值時將其納入 AI Prompt，提升分析深度

## Non-Goals

- 不引入新的外部新聞來源（如經濟日報 undetected-chromedriver 爬蟲）
- 不修改 `NewsContextStep` 的呼叫邏輯或觸發條件
- 不更動前端 `etf_news` 讀取邏輯（新欄位只影響後端寫入與 AI Prompt）

## Capabilities

### New Capabilities

- `mops-announcement-detail`：從 MOPS detail API 擷取每筆公告的完整內文、發言人與事件日期，並存入資料庫供 AI 報告使用

### Modified Capabilities

(none)

## Impact

- Affected specs: `mops-announcement-detail`（新建）
- Affected code:
  - Modified: `ETF/services/news/mops_client.py`
  - Modified: `ETF/database/sql_storage.py`
  - Modified: `ETF/ai_report/prompt_builder.py`
  - New: `supabase/migrations/<timestamp>_add_mops_detail_columns.sql`
