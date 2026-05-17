## 1. Server Action 設計：getEtfSectorActivity

- [x] 1.1 建立 `src/app/actions/getEtfSectorActivity.ts`，定義 `EtfSectorActivityMap` 型別（`Record<string, { etf_codes: string[]; stock_codes: string[] }>`）
- [x] 1.2 實作 `getEtfSectorActivity(sectorDate)` 的 empty string guard：若 `sectorDate === ''` 則直接回傳 `{}`，符合「getEtfSectorActivity returns ETF buying activity per sector」的空日期場景
- [x] 1.3 實作平行查詢：`sector_strength_stocks`（`.eq('date', sectorDate)`，分頁取全量）與 `etf_diff_logs`（`.in('change_type', ['BUY','IN'])`, `.gte('data_date', cutoff)`, `.lte('data_date', sectorDate)`）
- [x] 1.4 在記憶體中篩選 `Math.abs(row.diff_weight) >= 0.05`，排除低於閾值的事件（符合「ETF event below threshold is excluded」場景）
- [x] 1.5 在記憶體中 JOIN：建立 `stock_id → category` 映射後，彙整每個 category 的 `etf_codes`（去重）與 `stock_codes`（去重）回傳

## 2. page.tsx 資料載入順序

- [x] 2.1 修改 `src/app/investment/sectors/page.tsx`：先 `await getSectorStrength()` 取得 `date`，再 `Promise.all([getFactorIC(...), getEtfSectorActivity(date)])` 並行取得兩組資料（符合「ETF activity data passed to sector components from page」場景）
- [x] 2.2 更新 `SectorDashboard` 的 Props 型別，加入 `etfActivity?: EtfSectorActivityMap`，並將其從 `page.tsx` 傳入

## 3. 族群列 ETF 標籤渲染

- [x] 3.1 在 `SectorDashboard.tsx` 的 `SectorItem` 元件 props 中加入 `etfActivity?: { etf_codes: string[]; stock_codes: string[] }`
- [x] 3.2 實作 ETF issuer 標籤計算：從 `etf_codes` 透過 `getEtfMeta` 取得 `issuer`，去重後取前 3 個，超出則計算 overflow 數量（符合「Sector row displays ETF manager buying badges」需求）
- [x] 3.3 渲染 issuer 標籤：樣式 `bg-rose-100 text-rose-700 text-xs px-1.5 py-0.5 rounded`，並排顯示，超出時加 `+N` chip；無活動時不渲染任何標籤（符合「Sector with no ETF buying activity」場景）

## 4. 成分股 ETF 買進標記

- [x] 4.1 修改 `SectorItem` 的展開成分股渲染：將 `etfActivity.stock_codes` 作為 Set，判斷每支個股 `s.stock_id` 是否在其中（符合「Expanded stock list marks ETF-bought stocks」需求）
- [x] 4.2 針對命中個股顯示 ETF issuer 標籤（同族群層級的樣式）；未命中個股不顯示標籤（符合「Stock not bought by any ETF」場景）
- [x] 4.3 在成分股表格 header 加入「ETF買進」欄位說明（或 tooltip），讓使用者明白標籤含義

## 5. 「ETF買」排序 Tab

- [x] 5.1 在 `SortKey` type 加入 `'etf'`，並在 `tabs` 陣列加入 `{ key: 'etf', label: '🏦 ETF買' }` Tab（符合「Sector list supports ETF buying sort mode」需求）
- [x] 5.2 在 tab hidden 邏輯中，`'etf'` Tab 在 `heatmap` 和 `grouped` 模式下隱藏（符合「ETF buy tab hidden in heatmap mode」場景）
- [x] 5.3 實作 `'etf'` 排序邏輯：`sorted` useMemo 中，當 `sortKey === 'etf'` 時依 `etfActivity?.[a.category]?.stock_codes.length ?? 0` 降序排列
- [x] 5.4 將 `etfActivity` 透過 props 傳遞至 `SectorItem`：在 `SectorDashboard` 的 `sorted.map(...)` 中，將 `etfActivity[sector.category]` 傳入 `SectorItem`
