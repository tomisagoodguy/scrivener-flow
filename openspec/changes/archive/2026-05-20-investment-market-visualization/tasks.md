## 1. DB Schema

- [x] 1.1 建立 Supabase migration `supabase/migrations/<timestamp>_add_market_visualization_tables.sql`，新增 `market_treemap_daily`（PRIMARY KEY: date + stock_code, 欄位: stock_name TEXT, industry TEXT, market_cap BIGINT, close NUMERIC, change_pct NUMERIC）與 `market_breadth_daily`（PRIMARY KEY: date, 欄位: ups INT, downs INT, net INT, adl NUMERIC, adr NUMERIC, adl_ma5 NUMERIC, adl_ma60 NUMERIC, adr_ma5 NUMERIC, adr_ma60 NUMERIC），並為 `market_treemap_daily(date)` 建立 INDEX

## 2. ETF Pipeline — Treemap 步驟

- [x] 2.1 [P] Treemap data pipeline step：建立 `ETF/pipeline/steps/sync_treemap_step.py`，實作 `SyncTreemapStep`（兩個步驟皆為輔助步驟（錯誤不中斷 Pipeline）原則）：使用 FinLab `etl:adj_close`、`etl:market_cap` 及族群分類，計算 `change_pct = close/prev_close - 1`，upsert 至 `market_treemap_daily`；Treemap 資料表只保留最近 90 天（刪除 90 天前舊記錄）；例外只 log 不 raise
- [x] 2.2 在 `ETF/pipeline/orchestrator.py` 的 `NotifyStep` 前插入 `SyncTreemapStep`，確保輔助步驟失敗不中斷 pipeline

## 3. ETF Pipeline — ADL 步驟

- [x] 3.1 [P] ADL data pipeline step：建立 `ETF/pipeline/steps/sync_adl_step.py`，實作 `SyncAdlStep`（兩個步驟皆為輔助步驟（錯誤不中斷 Pipeline）原則）：依照 `reference/advance_decline_line.py` 邏輯，ADL 計算視窗：全市場上市櫃股票，不設市值門檻（benchmark=1，`etl:adj_close` 全市場），計算 ups、downs、net、adl（累計）、adr（ups/(ups+downs)）、adl_ma5/adl_ma60/adr_ma5/adr_ma60；upsert 至 `market_breadth_daily`；例外只 log 不 raise
- [x] 3.2 在 `ETF/pipeline/orchestrator.py` 的 `NotifyStep` 前插入 `SyncAdlStep`（與 SyncTreemapStep 相鄰，順序不限）

## 4. Server Actions

- [x] 4.1 [P] 建立 `src/app/actions/getTreemapData.ts`（資料預計算寫入 Supabase（Pipeline → DB → Server Action）架構）：查詢 `market_treemap_daily` 最新日期的所有個股資料，回傳 `{ date: string, stocks: TreemapStock[] }`，型別定義於同檔或 `src/types/investment.ts`
- [x] 4.2 [P] 建立 `src/app/actions/getAdlData.ts`：查詢 `market_breadth_daily` 最近 180 曆日的資料，依 date ASC 排序，回傳 `AdlRecord[]`；同時計算最新一日 ADL_MA5 vs ADL_MA60 的交叉狀態（golden/death/none）

## 5. Treemap UI

- [x] 5.1 建立 `src/app/investment/sectors/components/SectorTreemap.tsx`（使用 recharts Treemap 而非引入新圖表庫）：使用 recharts `<Treemap>` 元件，實作台股色彩慣例（紅漲綠跌，正值 rose、負值 emerald，依絕對值分 6 層深淺），cell 顯示 stock_name + change_pct，hover tooltip 顯示 stock_code/stock_name/industry/close/change_pct（Treemap tab on sectors page 需求）
- [x] 5.2 在 `src/app/investment/sectors/page.tsx` 和 `SectorDashboard.tsx` 新增「熱力圖」tab，在 Server Component 層呼叫 `getTreemapData()`，props 傳入 `SectorTreemap`；無資料時顯示「資料尚未更新」（無資料 scenario）

## 6. 大盤廣度頁面

- [x] 6.1 [P] 建立 `src/app/investment/breadth/page.tsx`（Server Component）：呼叫 `getAdlData()`，頁面標題顯示最新日期與 ADL 值，依交叉狀態顯示「多頭廣度擴張」（emerald badge）或「廣度收縮警訊」（rose badge）；無資料時顯示 empty state（Market breadth page 需求、ADL 黃金交叉警示需求）
- [x] 6.2 [P] 建立 `src/app/investment/breadth/components/AdlChart.tsx`：兩個 recharts `<LineChart>`，上圖顯示 ADL + ADL_MA5 + ADL_MA60，下圖顯示 ADR + ADR_MA5 + ADR_MA60；共用 x 軸（date）；深色模式適配 glass-card 樣式
