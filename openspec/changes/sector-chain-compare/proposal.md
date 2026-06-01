## Why

在「產業題材今日表現」面板中，上下游題材目前只顯示為可點擊標籤，使用者需要一一切換才能比較整條供應鏈的今日表現。一個統一的供應鏈比對視圖可讓使用者立即看出資金在鏈上哪個環節最強。

## What Changes

- `SectorTopicHeatmap.tsx` 的 `TopicDetailPanel`：將上下游標籤區替換為**供應鏈比對表**，列出上游→本題材→下游的今日漲幅，色碼與熱力格一致，每列可點擊跳轉至該題材

## Capabilities

### New Capabilities
- `sector-chain-compare`: 產業題材供應鏈比對表——在選中題材的詳情面板中，以表格形式並排顯示所有上游/本題材/下游的今日平均漲跌幅

### Modified Capabilities
<!-- 無 spec 層級的行為變更 -->

## Impact

- 僅前端：`src/components/features/investment/sectors/SectorTopicHeatmap.tsx`
- 不需新增 Server Action、資料庫查詢或 API Route
- 資料已全部在 `TopicWithStats[]` props 中（`avgRet1d`、`shortname`、`companyCount`）
