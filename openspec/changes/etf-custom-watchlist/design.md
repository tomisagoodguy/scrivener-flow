## Context

目前選股清單儲存在本機 `EOCS/select_stock.xlsx`，無法從瀏覽器或手機編輯。
Supabase 已有 RLS 多租戶機制，可直接用 `user_id` 隔離各用戶的自選清單。
投資頁面已有持股列表 UI，可在此基礎上加入自選管理面板。

## Goals / Non-Goals

**Goals:**
- 任何裝置（手機/平板/桌機）都能即時新增/移除自選股
- 自選股自動納入每日裸K報告
- 支援簡單分組標籤（例：「觀察中」、「買入」）

**Non-Goals:**
- 不做複雜的策略編輯器（篩選條件修改仍在程式碼層）
- 不做多人共享清單（RLS 按 user_id 隔離）
- 不做歷史記錄或版本控制

## Decisions

### 1. 資料儲存：Supabase `custom_watchlist` 表

```sql
CREATE TABLE custom_watchlist (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  stock_code  text NOT NULL,           -- 股票代號，e.g. "2317"
  label       text NOT NULL DEFAULT '自選',  -- 分組標籤
  created_at  timestamptz DEFAULT now(),
  UNIQUE(user_id, stock_code)          -- 同一用戶不重複加入同一股票
);
ALTER TABLE custom_watchlist ENABLE ROW LEVEL SECURITY;
-- Policy: 用戶只能讀寫自己的資料
```

**選擇理由**：RLS 天然隔離、Realtime 訂閱免費、與現有架構一致。

### 2. 寫入：Server Actions（非 REST API）

`addToWatchlist(stockCode, label)` / `removeFromWatchlist(stockCode)`

**選擇理由**：依照專案 API 設計規則，資料突變優先使用 Server Actions。

### 3. UI：投資頁面側邊抽屜（Drawer）

在投資頁面右上角加一個「★ 自選」按鈕，點開 Drawer 顯示：
- 已加入的自選股列表（可移除）
- 搜尋框（輸入代號即時查詢 `etf_stock_overlap` 或 `etf_holdings_snapshot` 過濾候選）
- 點選搜尋結果即加入

**選擇理由**：Drawer 不破壞現有頁面佈局，手機也好用。

### 4. Python 整合：查 DB 取自選清單

`stock_chart_report.py` 在 `PipelineContext` 初始化時，透過 SQLAlchemy 查 `custom_watchlist` 取得所有使用者的自選股（去重合併），加入待產生圖表的股票池。

**選擇理由**：Python pipeline 已有 `sql_storage.py` 的 SQLAlchemy 直連，不需要新增依賴。

## Risks / Trade-offs

- **[風險] 自選股代號不在 DB 的股票資料表** → 圖表腳本跳過該股並 log 警告，不中斷整個報告
- **[風險] 多用戶自選股過多導致報告生成時間過長** → 初期無上限，未來可加每人最多 50 支限制
- **[Trade-off] 標籤為自由文字** → 簡單實作，不做下拉選單，方便快速輸入

## Migration Plan

1. 新增 `supabase/migrations/<timestamp>_create_custom_watchlist.sql`
2. 部署 Server Actions + UI
3. 修改 `stock_chart_report.py`（向後相容，若表為空則跳過）
4. 無 rollback 風險（新增表，不影響現有功能）
