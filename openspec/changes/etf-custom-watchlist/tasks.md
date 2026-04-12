## 1. 資料庫

- [ ] 1.1 新增 `supabase/migrations/<timestamp>_create_custom_watchlist.sql`（含 RLS Policy）
- [ ] 1.2 在 `src/types/index.ts` 新增 `CustomWatchlistItem` 型別

## 2. Server Actions

- [ ] 2.1 建立 `src/app/actions/watchlist.ts`：`addToWatchlist(stockCode, label)` Server Action
- [ ] 2.2 建立 `removeFromWatchlist(stockCode)` Server Action
- [ ] 2.3 建立 `getWatchlist()` Server Action（供初始載入用）

## 3. UI 元件

- [ ] 3.1 建立 `src/components/features/investment/WatchlistDrawer.tsx`（Drawer 框架 + 清單顯示）
- [ ] 3.2 實作搜尋框：輸入代號後查詢 `etf_holdings_snapshot` 取候選清單
- [ ] 3.3 實作加入按鈕（呼叫 2.1 Action，含重複檢查提示）
- [ ] 3.4 實作移除按鈕（呼叫 2.2 Action）
- [ ] 3.5 實作標籤輸入欄（加入時選填，預設「自選」）
- [ ] 3.6 在 `src/app/investment/page.tsx` 加入「★ 自選」按鈕，掛載 WatchlistDrawer
- [ ] 3.7 確認手機斷點樣式（Drawer 寬度 100vw on mobile）

## 4. Python 整合

- [ ] 4.1 在 `ETF/stock_chart_report.py` 新增 `fetch_custom_watchlist()` 函式（SQLAlchemy 查詢）
- [ ] 4.2 合併 ETF union pool 與自選清單（去重），更新圖表標題標記來源
- [ ] 4.3 處理邊界：代號查無股價資料時 log warning 並跳過

## 5. 驗證

- [ ] 5.1 手動測試：網頁新增股票 → 確認 DB 寫入 → Drawer 即時更新
- [ ] 5.2 手動測試：移除股票 → DB 刪除 → 從 Drawer 消失
- [ ] 5.3 手動測試：手機瀏覽器開啟 Drawer，確認操作順暢
- [ ] 5.4 手動執行 `uv run python ETF/stock_chart_report.py` 確認自選股出現在 HTML 報告中
