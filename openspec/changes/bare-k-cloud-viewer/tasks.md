## 1. DB Schema Migration

- [x] 1.1 建立 `watch_list` 表 migration（user_id RLS、stock_id、name、strategies[]、created_at、UNIQUE(user_id, stock_id)）
- [x] 1.2 建立 `bare_k_snapshots` 表 migration（stock_id、date、ohlcv JSONB、mas JSONB、signals JSONB、margin JSONB、revenue JSONB、inv_chips JSONB、summary JSONB、PRIMARY KEY(stock_id, date)）
- [x] 1.3 為 `watch_list` 建立 RLS Policy（SELECT/INSERT/UPDATE/DELETE 均限 `auth.uid() = user_id`）
- [ ] 1.4 在 Supabase Production 執行 migration（20260412000000_add_watch_list_and_bare_k.sql）並驗證表結構

## 2. Python 後端：BareKService

- [x] 2.1 建立 `ETF/services/finlab/bare_k_service.py`，封裝 `compute_snapshot(sid, days=240)` 方法
- [x] 2.2 實作 OHLCV 資料擷取（包含 buffer 用於 260 日高計算）
- [x] 2.3 實作均線（MA5/20/60/120）與 260 日高計算
- [x] 2.4 實作五個訊號條件（創260高、低波動、融資健康、營收9月高、投信買超）
- [x] 2.5 實作融資維持率面板資料
- [x] 2.6 實作月營收 YOY/MOM 面板資料
- [x] 2.7 實作集保籌碼面板（大戶/散戶分級 pivot、週頻 diff、籌碼 PR rank）
- [x] 2.8 組裝 `summary` 欄位（last_price、change_pct、dist_260_pct、signals 最後一日狀態）
- [x] 2.9 撰寫 `BareKService` 的單元測試（至少覆蓋訊號條件計算邏輯）

## 3. Python 後端：SyncBareKStep

- [x] 3.1 建立 `ETF/pipeline/steps/sync_bare_k_step.py`
- [x] 3.2 實作從 `watch_list` 聚合所有使用者股票（service role 繞過 RLS、去重、截斷 50 筆）
- [x] 3.3 實作對每支股票呼叫 `BareKService.compute_snapshot()` 並 catch 單股失敗
- [x] 3.4 實作批次 UPSERT（`ON CONFLICT (stock_id, date) DO UPDATE`）到 `bare_k_snapshots`
- [x] 3.5 在 `ETF/pipeline/orchestrator.py` 的 CleanupStep 之前插入 `SyncBareKStep`
- [x] 3.6 在 `ETF/pipeline/context.py` 新增 `bare_k_synced_count: int = 0` 欄位

## 4. API Routes

- [x] 4.1 建立 `src/app/api/investment/bare-k/route.ts`（GET：回傳使用者 watch_list + 各股 summary）
- [x] 4.2 建立 `src/app/api/investment/bare-k/[code]/route.ts`（GET：回傳單股最新 bare_k_snapshot）
- [x] 4.3 建立 `src/app/api/investment/watch-list/route.ts`（GET 列表）

## 5. Server Actions（Watch List CRUD）

- [x] 5.1 建立 `src/app/actions/investment/watchListActions.ts`
- [x] 5.2 實作 `addWatchStock(stockId, strategies)` — INSERT watch_list，自動帶入公司名稱，上限 50 筆檢查
- [x] 5.3 實作 `removeWatchStock(stockId)` — DELETE watch_list
- [x] 5.4 實作 `updateWatchStrategies(stockId, strategies)` — UPDATE watch_list.strategies

## 6. 前端：自選股管理頁

- [x] 6.1 建立 `src/app/investment/watch-list/page.tsx`（Server Component，讀取 watch_list）
- [x] 6.2 建立 `src/components/features/investment/WatchListManager.tsx`（Client Component，CRUD UI）
- [x] 6.3 實作股票代碼輸入框 + 加入按鈕（帶 validation 與重複提示）
- [x] 6.4 實作策略標籤多選（5 個預定義選項的 checkbox 群組）
- [x] 6.5 實作刪除按鈕並加入確認提示

## 7. 前端：總覽頁

- [x] 7.1 建立 `src/app/investment/bare-k/page.tsx`（Server Component，讀取 watch_list + summaries）
- [x] 7.2 建立 `src/components/features/investment/BareKSummaryCard.tsx`（摘要卡片元件）
- [x] 7.3 實作卡片內容：代碼、公司名、收盤價、漲跌幅、距260高、5個訊號燈泡圖示
- [x] 7.4 實作空清單狀態（引導訊息 + 連結至管理頁）
- [x] 7.5 套用 `.glass-card` 樣式與 `animate-slide-up` 進場動畫

## 8. 前端：單股六面板圖表

- [x] 8.1 建立 `src/app/investment/bare-k/[code]/page.tsx`（Server Component，讀取快照）
- [x] 8.2 建立 `src/components/features/investment/BareKChart.tsx`（Client Component，主圖表容器）
- [x] 8.3 實作 Panel 1：Lightweight Charts CandlestickSeries + 4 條 LineSeries（均線）+ 260高虛線
- [x] 8.4 實作 Panel 3：成交量 HistogramSeries（紅/綠）+ 量MA20 LineSeries
- [x] 8.5 實作 Panel 4：融資率 LineSeries（+ 基準線標注）
- [x] 8.6 實作 Panel 5：YOY HistogramSeries + MOM LineSeries
- [x] 8.7 實作 Panel 6：大戶 HistogramSeries + 散戶 LineSeries + 0 基準線
- [x] 8.8 實作 Panel 2：訊號條（CSS flex grid，亮/暗色塊）
- [x] 8.9 實作 K 線面板覆蓋層（右上角收盤/260高/距離、左上角5條件 ✅/❌）
- [x] 8.10 實作標題列（股票代碼、公司名、近N日、日期、策略標籤）
- [x] 8.11 實作無快照資料時的提示訊息

## 9. 導航整合

- [x] 9.1 在投資儀表板的 SideNav 或頁面 Tab 加入「裸K看盤」入口（連結至 `/investment/bare-k`）
- [x] 9.2 在 `/investment/bare-k/[code]` 頁面加入返回總覽的麵包屑導航

## 10. 驗證與測試

- [ ] 10.1 手動觸發 `SyncBareKStep` 並確認 `bare_k_snapshots` 有正確資料寫入
- [ ] 10.2 在瀏覽器驗證六面板圖表渲染正確（顏色、面板高度比例、訊號條件）
- [ ] 10.3 驗證 watch_list CRUD（新增、刪除、策略更新、重複新增、超過 50 筆上限）
- [ ] 10.4 驗證 RLS 隔離（兩個測試帳號互不可見）
- [x] 10.5 在 GitHub Actions ETF workflow 加入 `SyncBareKStep` 所需的環境變數確認（FINLAB_API_KEY、SUPABASE_DB_URL、SUPABASE_SERVICE_ROLE_KEY 均已存在）
