## 1. 個股重疊資料聚合（表格資料完全由前端衍生，不新增 Server 查詢）

- [x] 1.1 [P] 在 `EtfComparePanelUtils.ts` 新增 `buildStockOverlapRows(etfs, totalEtfs)` helper，實作「Per-stock overlap row computation」：掃描所有 `etfs[].holdings`，依 `stock_code` 分組產出 `{ stock_code, stock_name, held_by, held_count, coverage_pct, avg_weight, total_weight }`，`totalEtfs` 為 0 時 `coverage_pct` 回傳 0。驗證方式：用 design.md 的「coverage and weight aggregation」範例表（A/B/C 三檔 ETF 權重 2.0/3.0/4.0% 的案例）手動呼叫該函式核對輸出數值，並確認 `held_count === 1` 的股票（僅被單一 ETF 持有）也出現在回傳陣列中。
- [x] 1.2 [P] 在 `EtfComparePanelUtils.ts` 新增排序 helper（支援依 `held_count`/`coverage_pct`/`avg_weight`/`total_weight` 四欄位升冪或降冪排序），實作「Table view sorting」需求的排序邏輯本體。依照設計決策「排序狀態管理在表格元件內部（client-side sort），不做 URL 參數化」，此 helper 為純函式（輸入陣列 + 欄位 + 方向，回傳排序後陣列），不讀寫 URL query param 或任何全域狀態。驗證方式：對同一組模擬資料分別依四個欄位排序，確認回傳陣列順序正確且方向可反轉，且函式不產生任何 URL 或路由副作用。

## 2. 表格視圖元件

- [x] 2.1 新增 `EtfOverlapStockTable.tsx`，渲染「按個股分組」表格（欄位：股票代碼、名稱、持有家數、覆蓋率%、持有清單、平均權重、合計權重），預設依 `held_count` 由高到低排序，實作「Table view sorting」的預設排序行為。驗證方式：在瀏覽器開啟 `/investment` 切到表格視圖，確認第一列為持有家數最多的股票。
- [x] 2.2 為 `EtfOverlapStockTable.tsx` 的欄位標題加上點擊排序互動，點擊同一標題兩次需反轉排序方向，實作「Table view sorting」的排序切換行為。驗證方式：手動點擊「持有家數」標題兩次，確認列順序由降冪變升冪。
- [x] 2.3 在 `EtfOverlapStockTable.tsx` 加入 `etfs` 為空陣列時的「持股無重疊/無資料」提示樣式（比照現有 `OverlapSummary` 的無資料提示），實作「Empty data fallback」需求，且不渲染空表格外框。驗證方式：傳入空陣列 props 手動測試，確認畫面顯示提示文字而非空表格。
- [x] 2.4 [P] 為「持有清單」欄位套用 `EtfComparePanelUtils.ts` 既有的 `truncateList()` helper，超過 5 個 ETF code 以「+N 支」摺疊顯示。驗證方式：手動測試一檔被 6 支以上 ETF 持有的股票（或模擬資料），確認清單摺疊顯示正確。

## 3. 視圖切換容器與頁面接線（Tab 切換用 client component 包裹，不改動資料抓取）

- [x] 3.1 新增 `EtfCompareViewTabs.tsx`（`'use client'`），接收與 `EtfComparePanel` 相同的 `etfs`、`overlap` props，內部以 `useState` 管理當前分頁（預設 `'card'`），依狀態渲染既有 `EtfComparePanel` 或新 `EtfOverlapStockTable`，實作「Compare view tab switch」需求。驗證方式：手動載入頁面確認預設顯示卡片視圖，行為與現況一致（無視覺回歸）。
- [x] 3.2 修改 `src/app/investment/page.tsx`，將現有 `<EtfComparePanel etfs={compareData.etfs} overlap={compareData.overlap} />` 呼叫改為 `<EtfCompareViewTabs etfs={compareData.etfs} overlap={compareData.overlap} />`，`getCompareData()` 資料抓取邏輯不變。驗證方式：`yarn tsc --noEmit` 通過，且手動載入 `/investment` 確認頁面正常渲染兩個 Tab 按鈕。

## 4. 型別與跨頁一致性驗證

- [x] 4.1 執行 `yarn tsc --noEmit` 確認新增元件與 helper 無新增型別錯誤。驗證方式：終端機輸出無 error。
- [x] 4.2 手動核對表格視圖與既有 `OverlapLegend` 的一致性：任選 2–3 檔已知被多支 ETF 持有的股票，確認表格中「持有家數」與 `OverlapLegend` 顯示的分組一致，「持有清單」的 ETF code 與 `OverlapLegend` 展開內容一致。驗證方式：瀏覽器人工比對，記錄比對結果。
