## Context

Pipeline 的 `NewsContextStep` 已每日從 MOPS 公開資訊觀測站抓取 ETF 前十大持股的重大公告，結果存在 `ctx.news_context`（記憶體），僅供 AI 報告 Prompt 使用，不落地資料庫。前端無法存取新聞資料。

新聞時效短（5 天後失去參考價值），保留過久只佔 Supabase 免費方案空間，需自動清除。

## Goals / Non-Goals

**Goals:**
- 將 MOPS 公告持久化到 `etf_news` DB 表
- `CleanupStep`（已有 `cleanup_old_data()`）擴充刪除 5 天前舊新聞
- ETF 持股頁（`/investment/[etf]`）新增新聞面板

**Non-Goals:**
- 不儲存新聞全文（只存標題、日期、股票代碼）
- 不做新聞搜尋或跨 ETF 新聞聚合
- 不推送新聞到 LINE

## Decisions

### 1. DB 表設計：`etf_news`

```sql
CREATE TABLE etf_news (
  id          BIGSERIAL PRIMARY KEY,
  etf_code    TEXT NOT NULL,          -- 抓取時的 ETF（00981A 等）
  stock_code  TEXT NOT NULL,          -- 發佈公告的個股
  pub_date    DATE NOT NULL,          -- 公告日期
  pub_time    TEXT,                   -- 公告時間（HH:MM）
  title       TEXT NOT NULL,          -- 公告標題
  source      TEXT DEFAULT '公開資訊觀測站',
  created_at  TIMESTAMPTZ DEFAULT NOW()
);
-- 唯一約束防重複 upsert
CREATE UNIQUE INDEX etf_news_unique ON etf_news (etf_code, stock_code, pub_date, title);
```

**為何不用 `news_id` 自然鍵**：MOPS API 無唯一 ID，以 `(etf_code, stock_code, pub_date, title)` 四欄組合去重，ON CONFLICT DO NOTHING。

**RLS**：`etf_news` 為公開行情資料，不含用戶隱私，啟用 RLS 但允許所有 authenticated 用戶讀取（anon key 也可讀）。

### 2. Pipeline：`NewsContextStep` 新增 upsert

`execute()` 末尾加：
```python
ctx.sql_storage.upsert_etf_news(ctx.etf_code, ctx.news_context)
```

寫入方法加在 `sql_storage.py`，使用 `ON CONFLICT DO NOTHING`。

### 3. 清除：擴充 `cleanup_old_data()`

在現有 `cleanup_old_data()` 裡加一條 DELETE：
```sql
DELETE FROM etf_news WHERE pub_date < CURRENT_DATE - INTERVAL '5 days'
```
不新增步驟，不修改步驟順序。

### 4. 前端：Server Component + 新元件

- `[etf]/page.tsx`：新增 `getEtfNews(etfCode)` 查詢，從 `etf_news` 取最近 5 天資料（用 `server.ts` client，受 RLS）
- 新元件 `src/components/features/investment/EtfNewsPanel.tsx`：展示新聞列表，按日期分組，玻璃卡片風格

## Risks / Trade-offs

- **MOPS API 不穩定** → `NewsContextStep` 已有 try/except 不 raise，本次只加 upsert，失敗同樣靜默
- **小型股無公告** → 正常，只顯示有資料的持股
- **5 天清除太短** → 前端 query 只取 `pub_date >= NOW() - 5 days`，與清除週期對齊，不會有空頁面（同日新資料會在清除前寫入）

## Migration Plan

1. 執行 `supabase/migrations/<timestamp>_add_etf_news.sql`
2. 部署 pipeline（下次 CI 跑時自動 upsert）
3. 部署前端（query 若表空仍正常，顯示「暫無公告」）
4. Rollback：刪除 `etf_news` 表，還原 `news_context_step.py` 和 `cleanup_step.py`
