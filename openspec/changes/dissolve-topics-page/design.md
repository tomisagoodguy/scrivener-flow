## Context

目前 `topicMap.json` 定義 75 個科技供應鏈題材，每個題材含 `id`、`shortname`、`group`、`stocks[]`。這份資料在 `/investment/topics` 頁面以熱力格展示，資料來源是靜態 JSON + Supabase `stock_prices_daily` 的當日漲跌。四個目標頁面（選股池、籌碼排行、策略選股、族群強弱）目前完全沒有引用題材資料。

## Goals / Non-Goals

**Goals:**

- 建立 `stockCode → Topic[]` 反查表（`topicUtils.ts`），供所有頁面 import 使用
- 建立可重用的 `TopicBadge` 元件（最多顯示 2 個 badge，超出顯示 +N）
- 在族群強弱頁面新增題材熱力格區塊（複用現有題材顯示邏輯）
- 將 `getTopicStockReturns` Server Action 保留供族群強弱頁面使用
- 安全移除 `/investment/topics` 目錄與所有相關元件

**Non-Goals:**

- 不做題材 filter 功能
- 不修改 `topicMap.json` 的結構
- 不新增 DB 查詢（題材資料完全來自靜態 JSON）

## Decisions

### 題材反查表以模組層級常數建立

**選擇**：在 `src/lib/investment/topicUtils.ts` 於模組載入時一次性建立 `Map<stockCode, TopicEntry[]>`，而非每次呼叫時重新 iterate。

**理由**：topicMap.json 是靜態資料（75 題材，約 500 支股票），建立 Map 的開銷可忽略，但避免多個元件重複 iterate。

**替代方案**：每個元件自行 filter → 棄用，因程式碼重複且低效。

### TopicBadge 為純 Client 元件，不需要 props drilling

**選擇**：`TopicBadge` 接收 `stockCode: string` 並在元件內部 import topicUtils 取得題材清單，上層元件不需傳遞 topics 陣列。

**理由**：簡化各頁面的整合，避免每個父元件都需要把 topicMap 傳下去。

**替代方案**：由 Server Component 取得 topics 再透過 props 傳遞 → 棄用，因為 topicMap.json 已是靜態資料，不需要 Server 端介入。

### 族群強弱題材熱力格：直接複用 getTopicStockReturns

**選擇**：在 `sectors/page.tsx` 新增對 `getTopicStockReturns` 的呼叫，並把計算後的 `TopicWithStats[]` 傳入 `SectorDashboard`，再由 `SectorTopicHeatmap` 元件渲染。

**理由**：避免重複實作熱力格著色邏輯。`SectorTopicHeatmap` 可直接搬移自 `TopicsDashboard` 的核心部分。

**棄用**：獨立 fetch → 多餘的 roundtrip，sectors 頁面已有 5 個並行查詢，再加一個沒有問題。

### 移除 /investment/topics 路由

整個 `src/app/investment/topics/` 目錄直接刪除。`getTopicStockReturns` Server Action 不刪除，改由 sectors/page.tsx 繼續使用。

## Risks / Trade-offs

- [Risk] `getTopicStockReturns` 函數若依賴 topics 頁面的型別 import → Mitigation: 確認 action 的型別定義是自給自足的，不 import topics 目錄的型別
- [Risk] 移除 topics 頁面後，若 `src/app/investment/layout.tsx` 的 nav item 未同步移除，會有死連結 → Mitigation: 在同一個 task 中同步移除 nav item

## Migration Plan

1. 建立 `topicUtils.ts` 和 `TopicBadge.tsx`（獨立，無破壞）
2. 建立 `SectorTopicHeatmap.tsx` 並整合進 sectors 頁面（獨立，無破壞）
3. 整合 TopicBadge 進三個頁面（各自獨立，無破壞）
4. 移除 topics 目錄與 nav item（最後執行，確保替代方案已就緒）

Rollback：因為是靜態資料，任何步驟都可直接 revert。
