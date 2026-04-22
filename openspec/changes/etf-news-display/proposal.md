## Why

ETF 持股頁面缺乏個股近期重大訊息脈絡，用戶需要切換到 MOPS 手動查詢。Pipeline 已有 `NewsContextStep` 從 MOPS 抓公告，但結果只注入 AI Prompt，未落地 DB，前端無法使用。

## What Changes

- 新增 `etf_news` Supabase 資料表（存放 MOPS 重大公告）
- `NewsContextStep` 在抓取後 upsert 進 `etf_news`
- `CleanupStep` 新增刪除 5 天前舊新聞的邏輯
- ETF 持股頁新增新聞面板，按股票代碼顯示近期公告（最多 5 天）

## Capabilities

### New Capabilities
- `etf-news-storage`：pipeline 將 MOPS 公告持久化到 `etf_news` 資料表，並由 `CleanupStep` 自動刪除 5 天以上的舊紀錄
- `etf-news-ui`：ETF 持股頁面顯示前十大持股的近期重大公告面板

### Modified Capabilities
（無）

## Impact

- `ETF/pipeline/steps/news_context_step.py`（新增 upsert DB 邏輯）
- `ETF/pipeline/steps/cleanup_step.py`（新增刪除過期新聞）
- `supabase/migrations/` 新增 migration（建 `etf_news` 表 + RLS）
- `src/app/investment/[etf]/page.tsx` + 新元件 `EtfNewsPanel`
