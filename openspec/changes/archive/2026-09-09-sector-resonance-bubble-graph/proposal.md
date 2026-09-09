## Why

`/investment/sectors` 頁面目前用 treemap（`SectorTreemap.tsx`，recharts）與階層式供應鏈 DAG（`SupplyChainGraph.tsx`，`@xyflow/react` + `dagre`）呈現族群資料，但兩者都不擅長表達「哪些族群正在同時被多支 ETF 買進、資金共振強度有多高」這種以熱度為核心的比較。盤點確認 `getEtfSectorActivity()`（`src/app/actions/getEtfSectorActivity.ts` → `buildEtfSectorActivityMap()`）已經聚合出「每個族群類別有哪些 ETF、哪些個股在買」的資料（`EtfSectorActivityMap`：`etf_codes[]`、`stock_codes[]`、`stock_etf_map`），可直接衍生出熱度分數，不需要新建資料表或新的資料管線。

此功能參考自對開源專案 stockcatcher 的架構評估：其 `TideBubbleChart.vue` 用力導向圖（force-directed graph）呈現族群資金共振，泡泡大小映射熱度、顏色映射熱度區間（刻意不用紅綠，因為紅綠在台股慣例中代表漲跌，熱度是不同維度，混用會造成視覺語意衝突）。這種「用物理模擬做碰撞避讓的氣泡佈局」比長條圖/表格更能一眼看出「哪些族群正在共振」，且不需要真正的節點間關聯邊（族群彼此之間沒有像供應鏈那樣的方向性關係），實作上比完整的力導向網路圖更單純。

## What Changes

- 新增 `d3-force` 套件依賴（`yarn add d3-force @types/d3-force`），用於計算氣泡碰撞避讓佈局（僅用其 force simulation 計算節點座標，不使用 ECharts 或其他完整圖表引擎，維持與專案現有 recharts 主力圖表庫並存但職責不同）。
- 新增 `getSectorResonanceHeat()` server action（或擴充 `getEtfSectorActivity.ts`），將 `EtfSectorActivityMap` 轉換為熱度資料：每個族群類別的 `heatScore`（以 `stock_codes.length` 與 `etf_codes.length` 加權計算，具體公式於 design.md 或 spec 中定義）。
- 新增 `SectorResonanceBubbleChart.tsx` 元件：用 `d3-force` 計算節點碰撞避讓座標後，以 SVG 渲染氣泡；氣泡半徑映射 `heatScore`、顏色依熱度分四階映射暖色系色階（不使用 `text-rose-*`/`text-emerald-*` 這組台股漲跌色，避免與 `rules/components.md` 規定的紅漲綠跌慣例混淆語意）；點擊氣泡顯示該族群的 `stock_codes`/`etf_codes` 明細（可複用現有 `GroupedSectorView.tsx` 的明細呈現模式）。
- 將新元件整合進 `/investment/sectors` 頁面（`SectorDashboard.tsx` 或 `GroupedSectorView.tsx`），作為既有 treemap 旁的一個可切換檢視模式（不取代 treemap，是新增的第三種呈現方式，供應鏈 DAG 也維持不變）。

## Non-Goals

- 不取代現有的 `SectorTreemap.tsx`（treemap）或 `SupplyChainGraph.tsx`（供應鏈 DAG），三者並存，使用者可切換檢視模式。
- 不新增資料庫欄位或 migration；熱度分數為查詢時衍生計算，不落地儲存。
- 不實作族群與族群之間的關聯邊（力導向圖僅用於碰撞避讓佈局，不表達族群間的圖論關係）；若未來需要「族群關聯網路」，那是另一個獨立需求，可能會用到現有的 `topic_chain_edges`/`ChainNode`/`ChainEdge` 資料結構，但不在本次範圍。
- 不引入 ECharts 或其他新的圖表引擎；僅用 `d3-force` 的 simulation 能力做座標計算，渲染仍用原生 SVG。

## Capabilities

### New Capabilities

- `sector-resonance-bubble-graph`: 族群資金共振氣泡圖，以力導向碰撞避讓佈局呈現各族群熱度，整合進 `/investment/sectors` 頁面。

### Modified Capabilities

(none)

## Impact

- Affected specs: `sector-resonance-bubble-graph`（新增）
- Affected code:
  - New: `src/lib/investment/sectorResonanceUtils.ts`（熱度計算純函式）
  - New: `src/components/features/investment/SectorResonanceBubbleChart.tsx`
  - Modified: `src/app/actions/getEtfSectorActivity.ts`（或新增 `src/app/actions/getSectorResonanceHeat.ts`）
  - Modified: `src/app/investment/sectors/SectorDashboard.tsx`
  - Modified: `src/app/investment/sectors/GroupedSectorView.tsx`
  - Modified: `package.json`（新增 `d3-force`、`@types/d3-force` 依賴）
