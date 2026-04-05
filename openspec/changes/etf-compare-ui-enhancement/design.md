## Context

EtfComparePanel 是一個純 Client Component，資料由 Server Component（compare/page.tsx）在 SSR 階段從 Supabase 讀取後以 props 傳入。目前元件約 236 行，所有 state 都是靜態 render，無 useState。

新增的兩個互動功能（展開持股、交集摺疊）需要引入 `useState`，但只影響 EtfComparePanel 一個檔案，不需要新增 hook 檔案或 context。

## Goals / Non-Goals

**Goals:**
- 五個 UI 改進全在 EtfComparePanel.tsx 內完成，不動 API / DB
- 保持 SSR 資料流不變（Server Component 傳 props）
- 元件行數控制在 350 行以內（超過需考慮拆子元件）

**Non-Goals:**
- 不新增後端 API 或 DB 查詢
- 不做持股資料的虛擬捲動（持股最多 50 支，直接展開即可）
- 不做跨 ETF 的橫向比對表格

## Decisions

### 1. 展開狀態管理：per-card useState vs 集中 state

**選擇**：EtfCard 內部用 `useState<boolean>` 管理自己的展開狀態。

**理由**：三張卡片的展開狀態彼此獨立，不需要父元件感知。若放到父元件會讓 EtfComparePanel 接管三個 ETF 的 UI 細節，違反單一責任。

### 2. 交集摺疊：截斷 + tooltip vs 純截斷

**選擇**：截斷顯示前 5 支 + `+N 支` 文字，不加 tooltip。

**理由**：hover tooltip 在手機上無法觸發，且完整持股清單可在卡片展開後一目了然，tooltip 是多餘的複雜度。

### 3. 重疊摘要卡：新元件 vs inline JSX

**選擇**：在 EtfComparePanel.tsx 內新增 `OverlapSummary` function component，不拆獨立檔案。

**理由**：摘要卡是 EtfComparePanel 的一部分，邏輯簡單（純計算 + render），不需要跨頁面複用。

### 4. badge 視覺強化方式

**現況**：`ring-1 ring-inset ring-yellow-400`，視覺不夠強。

**選擇**：改為整列背景色（`bg-yellow-50/80 dark:bg-yellow-900/30`）+ badge 字體改為 `text-xs font-semibold`，移除 ring。

**理由**：背景色讓整列更明顯，比只在邊框加顏色視覺衝擊更強。

## Risks / Trade-offs

- [展開後卡片高度差異大] → 三欄 grid 各自獨立高度，不做等高對齊，接受高度不一致
- [持股展開 50 筆時 DOM 節點增加] → 50 筆 tr 遠低於效能門檻，無需虛擬化

## Migration Plan

純前端修改，無 DB / API 異動，部署後即時生效，無需 migration。
