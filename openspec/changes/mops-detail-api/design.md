## Context

MOPS（公開資訊觀測站）提供兩個 API 端點：
1. `t05st02`（摘要）：回傳指定日期所有重大公告的標題列表，`item[5].parameters` 含 detail 所需的 `enterDate`、`serialNumber`、`marketKind`
2. `t05st02_detail`（詳情）：給定上述三個參數，回傳單筆公告的完整內文、發言人與事件日期

目前 `ETF/services/news/mops_client.py` 只呼叫端點 1，AI 報告只看得到標題。`etf_news` 資料表也無 `content`、`speaker`、`event_date`、`company_name` 欄位。

此變更涉及三個模組：爬蟲層（mops_client.py）、儲存層（sql_storage.py + DB migration）、AI 報告層（prompt_builder.py）。

## Goals / Non-Goals

**Goals:**

- 每筆 MOPS 公告補充 `content`（全文）、`speaker`、`event_date`、`company_name`
- 新欄位落地進 `etf_news` 資料表
- AI Prompt 的新聞區塊包含公告全文（截斷至 500 字，避免 token 爆炸）

**Non-Goals:**

- 不引入 undetected-chromedriver 或其他外部新聞來源
- 不修改前端讀取邏輯（新欄位選讀即可）
- 不修改 `NewsContextStep` 的觸發時機

## Decisions

### 呼叫 detail API 的時機：摘要迴圈內逐筆呼叫

在 `fetch_mops_announcements()` 的摘要迴圈中，每當 `item[2]`（股票代碼）命中 `codes_set` 時，立即解析 `item[5].parameters` 並呼叫 `fetch_mops_detail()`。

**為何不批次後補充**：批次補充需要暫存兩份資料結構、增加程式複雜度，且 MOPS 本身是逐筆 POST，無批次端點。逐筆呼叫配合 `time.sleep(0.2)` 是最直接安全的做法。

**替代方案放棄**：先全量抓摘要再非同步補充 detail — 增加 asyncio 複雜度，不符合現有同步風格。

### detail API 失敗的處理：靜默降級，保留摘要

若 `fetch_mops_detail()` 失敗（timeout、HTTP 錯誤、空回傳），`content`/`speaker`/`event_date` 設為 `None`，仍寫入摘要資料。AI Prompt 中只在 `content` 有值時顯示內文。

**理由**：MOPS detail API 偶有不穩定，不能因為內文取失敗就丟棄標題資料。

### content 截斷策略：500 字

傳入 AI Prompt 前，`content` 截斷至 500 個字元（中文）。`etf_news` DB 不截斷，儲存完整原文。

**理由**：每份 AI 報告最多 10 則公告，若每則 2000 字全注入約佔 20,000 tokens，影響 Gemini 回應品質與速度；500 字已足夠提供事件背景。

### DB Migration 策略：ALTER TABLE 加新欄位

在 `supabase/migrations/` 新增 SQL，用 `ALTER TABLE etf_news ADD COLUMN IF NOT EXISTS` 加入四個欄位（全部 nullable）。

**理由**：現有資料列不需回填，nullable 欄位不破壞既有查詢。

## Risks / Trade-offs

- [風險] MOPS detail API 逐筆呼叫增加每日 pipeline 執行時間 → 緩解：只對命中 `codes_set` 的股票呼叫（最多 20 支），每筆 `sleep(0.2)`，預估增加 15–30 秒，可接受
- [風險] `item[5]` 欄位結構若 MOPS 改版消失 → 緩解：`detail_params = meta.get('parameters', {}) if isinstance(meta, dict) else {}`，`get()` fallback，不會中斷摘要流程
- [Trade-off] content 500 字截斷可能遺失關鍵細節 → 可接受，AI 已有標題作為補充

## Migration Plan

1. 執行 `supabase/migrations/<timestamp>_add_mops_detail_columns.sql`（本地或 Supabase Dashboard SQL Editor）
2. 部署更新後的 `mops_client.py`、`sql_storage.py`、`prompt_builder.py`
3. 下次 pipeline 執行時，新公告即附帶 detail 欄位；舊資料列保留 `NULL`（不需回填）
4. Rollback：drop 四個欄位（資料不影響核心流程），回退三個 Python 檔案
