## 1. DB Migration

- [x] 1.1 新增 `supabase/migrations/20260512000000_equity_multi_tier.sql`，DB migration 只加欄位，不重建表：以 `ALTER TABLE public.equity_distribution_stats ADD COLUMN IF NOT EXISTS` 加入 `mid_holder_pct NUMERIC(7,3)`、`mid_holder_pct_change NUMERIC(7,3)`、`whale_holder_pct NUMERIC(7,3)`、`whale_holder_pct_change NUMERIC(7,3)` 四個 nullable 欄位；同步新增 `idx_equity_dist_mid_holder`（`snapshot_date DESC, mid_holder_pct_change DESC`）與 `idx_equity_dist_whale_holder`（`snapshot_date DESC, whale_holder_pct_change DESC`）索引
- [x] 1.2 在 Supabase Dashboard 執行此 migration SQL 確認無錯誤

## 2. Python 同步腳本

- [x] 2.1 重構 `ETF/sync_equity_distribution.py`：Python 重構為 `_compute_tier_pct` 共用函式；新欄位命名採 mid / whale 前綴（`mid_holder_pct`、`whale_holder_pct`）；將 `_summarise()` 內的大戶計算邏輯抽出為 `_compute_tier_pct(period_df, min_tier)` 函式，接受 `min_tier` 參數（11、12、15），回傳以 `stock_id` 為 index 的 `custody_ratio` 加總 Series
- [x] 2.2 在 `_summarise()` 中呼叫 `_compute_tier_pct` 三次（min_tier=11、12、15），產出 `mid_holder_pct`、`big_holder_pct`、`whale_holder_pct` 三個 Series，合併進 summary DataFrame
- [x] 2.3 計算 `mid_holder_pct_change` 與 `whale_holder_pct_change`（latest - prev），補齊 merged DataFrame，對缺失值填 0.0（DB stores three holder tier percentages 的 Missing tier data 情境）
- [x] 2.4 更新 `_compute_stats()` 中的 upsert dict，新增 `mid_holder_pct`、`mid_holder_pct_change`、`whale_holder_pct`、`whale_holder_pct_change` 四個鍵；更新 SQL upsert 語句的 INSERT 欄位列表與 `ON CONFLICT ... SET` 區塊
- [x] 2.5 本機執行 `uv run python ETF/sync_equity_distribution.py --dry-run`（或直接執行）確認三個級距資料均寫入，查詢 DB 驗證 mid / whale 欄位有值

## 3. 前端頁面

- [x] 3.1 更新 `src/app/investment/equity/page.tsx` 的 `EquityRow` interface，新增 `mid_holder_pct_change: number | null` 與 `whale_holder_pct_change: number | null`
- [x] 3.2 更新 `fetchRankingData()` 中 bigHolder 查詢的 `select` 字串，加入 `mid_holder_pct_change, whale_holder_pct_change`；前端切換機制用 URL query param（`tier`）：新增 `tier` searchParam（`'200' | '400' | '1000'`，預設 `'400'`）讀取，依 tier 切換 `order()` 欄位（frontend tier selector controls which column is ranked）
- [x] 3.3 在頁面頂部新增三個 tier 切換按鈕（200張+、400張+、1000張+），使用 `<Link href="?tier=X">` 實作，active 態用 `bg-blue-600 text-white` 標示；column header displays active tier threshold，依 tier 顯示對應標題文字
- [x] 3.4 更新 `RankingTable` 的 `changeKey` prop 型別，加入 `'mid_holder_pct_change' | 'whale_holder_pct_change'`；呼叫端依 tier 傳入對應 key
- [x] 3.5 瀏覽器測試三個 tier 按鈕切換、排序欄位正確、空值顯示「—」、暗色模式正常

## 4. 欄位排序（column headers are clickable to sort）

- [x] 4.1 欄位排序以 `?sort=<column>&dir=asc|desc` URL param 實作：在 `src/app/investment/equity/page.tsx` 新增 `SortKey` type（`'total_shareholders' | 'shareholders_change_rate' | 'big_holder_pct_change' | 'mid_holder_pct_change' | 'whale_holder_pct_change' | 'it_buy_5d' | 'amount'`）與 `SortDir` type（`'asc' | 'desc'`）；從 `searchParams` 讀取 `sort` 與 `dir` param，預設值依左/右表各自的原始預設排序；column headers are clickable to sort
- [x] 4.2 實作 `applySortToRows(rows, sort, dir, priceIndicators)` 函式：`equity_distribution_stats` 欄位（`total_shareholders`、`shareholders_change_rate`、`*_holder_pct_change`）在呼叫 `fetchRankingData()` 前以 `order(sort, { ascending: dir === 'asc' })` 在 DB 層排序；`it_buy_5d` 與 `amount` 在 Server 端以 JS `Array.sort()` 排序，NULL 值排到最後（NULL values sort to the bottom regardless of direction）
- [x] 4.3 實作 `SortableHeader` 元件（或 inline helper）：接受 `label`、`sortKey`、`currentSort`、`currentDir`、`tierParam` props，以 `<Link href="?sort=X&dir=Y&tier=Z">` 實作切換；active 欄顯示方向箭頭（↑ asc / ↓ desc）；點擊已排序欄切換方向，點擊其他欄預設 `dir=desc`（sort direction indicator on active column）
- [x] 4.4 將 `RankingTable` thead 的每個 `<th>` 替換為 `SortableHeader`，傳入對應 `sortKey`；驗證 default sort is preserved when no sort param present
- [x] 4.5 瀏覽器測試：點擊各欄標題排序正確、箭頭方向正確、`tier` 與 `sort` param 同時存在時互不干擾、NULL 值排尾
