## 1. 資料庫 Migration

- [x] 1.1 新增 `supabase/migrations/<timestamp>_add_etf_news.sql`：建立 `etf_news` 表（欄位：id, etf_code, stock_code, pub_date, pub_time, title, source, created_at）
- [x] 1.2 加入 `UNIQUE INDEX etf_news_unique ON etf_news (etf_code, stock_code, pub_date, title)`
- [x] 1.3 加入 RLS Policy：允許 authenticated + anon 角色 SELECT，僅 service role 可 INSERT/DELETE

## 2. Pipeline — 儲存新聞

- [x] 2.1 在 `ETF/database/sql_storage.py` 新增 `upsert_etf_news(etf_code, news_list)` 方法，使用 `ON CONFLICT DO NOTHING`
- [x] 2.2 在 `ETF/pipeline/steps/news_context_step.py` 的 `execute()` 末尾呼叫 `ctx.sql_storage.upsert_etf_news(ctx.etf_code, ctx.news_context)`，記錄寫入筆數 log

## 3. Pipeline — 清除舊新聞

- [x] 3.1 在 `ETF/database/sql_storage.py` 的 `cleanup_old_data()` 新增：`DELETE FROM etf_news WHERE pub_date < CURRENT_DATE - INTERVAL '5 days'`，記錄刪除筆數 log

## 4. 前端 — 資料查詢

- [x] 4.1 在 `src/app/investment/[etf]/page.tsx` 新增 `getEtfNews(etfCode)` async function，查詢 `etf_news` 近 5 天資料，依 `pub_date DESC, stock_code ASC` 排序

## 5. 前端 — 新聞元件

- [x] 5.1 新增 `src/components/features/investment/EtfNewsPanel.tsx`（≤150 行），接收 news 陣列，按日期分組顯示，使用 `.glass-card` 樣式
- [x] 5.2 無資料時顯示「近 5 日無重大公告」提示
- [x] 5.3 在 `[etf]/page.tsx` 引入 `EtfNewsPanel`，傳入 news 資料，放置於頁面適當位置
