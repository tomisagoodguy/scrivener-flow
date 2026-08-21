## Context

`/investment` 首頁的 [EtfComparePanel.tsx](src/components/features/investment/EtfComparePanel.tsx) 目前只提供「按 ETF 分組」的卡片視圖。資料來源是 [page.tsx](src/app/investment/page.tsx:106) 的 `getCompareData()`，回傳 `{ etfs: EtfData[]; overlap: OverlapData }`：

- `EtfData.holdings: HoldingItem[]`，每筆 `HoldingItem` 含 `stock_code, stock_name, weight, rank, in_etfs: string[]`（`in_etfs` 已經是「持有此股的所有 ETF code 清單」）。
- `overlap.byCount: Record<number, string[]>`（恰好被 n 支 ETF 持有的股票代號），`overlap.totalEtfs`（目前有資料的 ETF 總數）。

要新增「按個股分組」的表格視圖，資料完全可以從既有 `etfs: EtfData[]` 在前端衍生（每個 `HoldingItem` 都攜帶 `in_etfs` 與該 ETF 下的 `weight`），不需要新的 Server 端查詢或資料表。

## Goals / Non-Goals

**Goals:**
- 新增「表格視圖」：以個股為列，呈現持有家數、覆蓋率%、持有清單、平均權重、合計權重。
- 提供 Tab 切換（卡片視圖 / 表格視圖），預設卡片視圖，不影響既有行為。
- 支援依「持有家數／覆蓋率／平均權重／合計權重」四個欄位排序，預設依持有家數由高到低。

**Non-Goals:**
- 不做矩陣/熱力圖式兩兩 ETF 比對。
- 不新增篩選/搜尋框。
- 不修改既有卡片視圖元件的行為。
- 不新增資料庫欄位或後端 pipeline 步驟。

## Decisions

### 表格資料完全由前端衍生，不新增 Server 查詢
`EtfData[]` 內每個 ETF 的 `holdings` 已含該 ETF 對每檔股票的 `weight`，且 `HoldingItem.in_etfs` 已列出持有該股的所有 ETF。因此以 `stock_code` 為 key，掃描所有 `etfs[].holdings`，即可在客戶端組出：
```
{ stock_code, stock_name, held_by: string[] /* etf codes */, weights: number[] /* 各 ETF 對應權重 */ }
```
- 持有家數 = `held_by.length`
- 覆蓋率% = `held_by.length / overlap.totalEtfs * 100`
- 平均權重 = `weights.reduce(sum) / weights.length`
- 合計權重 = `weights.reduce(sum)`

此聚合邏輯放在 `EtfComparePanelUtils.ts` 新增的 helper（例如 `buildStockOverlapRows(etfs, totalEtfs)`），供 `EtfOverlapStockTable.tsx` 匯入，維持「單一事實來源」（不在元件內重複實作聚合邏輯）。

### Tab 切換用 client component 包裹，不改動資料抓取
新增 `EtfCompareViewTabs.tsx`（`'use client'`），接收與現有 `EtfComparePanel` 相同的 `etfs`、`overlap` props，內部用 `useState` 管理當前 Tab（`'card' | 'table'`），依狀態渲染 `<EtfComparePanel />` 或 `<EtfOverlapStockTable />`。`page.tsx` 只需把原本直接呼叫 `<EtfComparePanel etfs={...} overlap={...} />` 改成呼叫 `<EtfCompareViewTabs etfs={...} overlap={...} />`，Server 端資料抓取（`getCompareData()`）完全不變。

### 排序狀態管理在表格元件內部（client-side sort），不做 URL 參數化
排序欄位與方向純粹是顯示層互動，用元件內 `useState` 管理即可，不需要像 `/cases` 頁面那樣用 URL query param 持久化（那是為了可分享連結與瀏覽器返回鍵，這裡是頁面內單一區塊的排序切換，複雜度不對等）。

## Implementation Contract

**行為**：使用者在 `/investment` 首頁的 ETF 持股比較區塊看到兩個 Tab 按鈕「卡片視圖」「表格視圖」，預設選中「卡片視圖」（與現況一致）。點擊「表格視圖」後，畫面切換為一張表格，每列一檔股票，欄位依序為：股票代碼（含連結）、股票名稱、持有 ETF 家數、覆蓋率%、持有清單（顯示 ETF code，逗號分隔或 badge 列表）、平均權重%、合計權重%。表格預設依「持有 ETF 家數」由高到低排序；點擊任一數值欄位標題可切換該欄位由高到低／由低到高排序（再點一次切換方向）。

**資料形狀**：
```ts
interface StockOverlapRow {
  stock_code: string;
  stock_name: string;
  held_by: string[];       // ETF codes，如 ['00981A', '00982A']
  held_count: number;      // held_by.length
  coverage_pct: number;    // held_count / totalEtfs * 100
  avg_weight: number;      // 各 ETF 對應 weight 的算術平均
  total_weight: number;    // 各 ETF 對應 weight 的加總
}
```
`buildStockOverlapRows(etfs: EtfData[], totalEtfs: number): StockOverlapRow[]` 為 helper function 簽名，放在 `EtfComparePanelUtils.ts`。

**失敗模式**：若 `etfs` 為空陣列（無資料），表格顯示與現有 `OverlapSummary` 一致的「持股無重疊」/ 無資料提示文字，不拋錯、不顯示空表格外框。`totalEtfs` 為 0 時，`coverage_pct` 一律回傳 0（避免除以零）。

**驗收條件**：
1. `yarn tsc --noEmit` 無新增型別錯誤。
2. 手動在瀏覽器開啟 `/investment`，確認預設顯示卡片視圖與現況一致（無視覺回歸）。
3. 切換到表格視圖後，任選 2–3 檔已知被多支 ETF 持有的股票（可用現有 `OverlapLegend` 顯示的代號核對），確認表格中該股「持有家數」與 `OverlapLegend` 顯示的分組一致，「持有清單」的 ETF code 與 `OverlapLegend` 展開內容一致。
4. 點擊「持有家數」欄位標題兩次，確認排序方向確實反轉。
5. `held_count` 為 1（只被單一 ETF 持有）的股票也必須出現在表格中（不是只顯示 `overlap.byCount` 裡 n≥2 的重疊股，而是所有持股的完整清單，這樣使用者才能用同一張表看到「非重疊」股票作為對照）。

**範圍界線**：
- In scope：`EtfOverlapStockTable.tsx`、`EtfCompareViewTabs.tsx` 兩個新元件，`EtfComparePanelUtils.ts` 新增一個 helper function，`page.tsx` 改一行呼叫。
- Out of scope：不修改 `getCompareData()`、`EtfComparePanel.tsx`、`EtfComparePanelFilter.tsx`（`EtfCard`/`OverlapSummary`/`OverlapLegend`）既有邏輯；不新增 API route 或 Server Action；不動 `overlap_compute_step.py`。

## Risks / Trade-offs

- [風險] 若 ETF 檔數增加（目前 registry 已 26 支），`held_by` 清單顯示可能過長 → [緩解] 沿用 `EtfComparePanelUtils.ts` 既有的 `truncateList()` helper（`OverlapLegend` 已在用），超過 5 個以 `+N 支` 摺疊顯示。
- [風險] 表格與卡片視圖用同一份 `etfs` props，若未來 `getCompareData()` 回傳結構調整，兩個視圖都要同步改 → [緩解] 聚合邏輯集中在 `EtfComparePanelUtils.ts` 單一 helper，改動只需改一處。

