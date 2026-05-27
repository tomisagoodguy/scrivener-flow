## Why

產業題材頁面（`/investment/topics`）的資料（75 個科技供應鏈題材、成分股對應）對其他四個主要頁面有直接補充價值，卻被孤立在獨立頁面，造成使用者需要來回切換才能關聯題材與選股/籌碼/策略資訊。移除獨立頁面、將題材資料直接融入使用者最常停留的頁面，可降低切換成本並提升資訊密度。

## What Changes

- **移除** `/investment/topics` 路由目錄及所有相關元件檔案
- **移除** `layout.tsx` primaryNavItems 中的「產業題材」nav 項目
- **新增** 族群強弱頁面（`/investment/sectors`）下方的「題材今日表現」熱力格區塊，以成分股日漲跌中位數著色
- **新增** 股票 badge utility：從 `topicMap.json` 建立 `stockCode → Topic[]` 反查表，供各頁面呼叫
- **新增** 策略選股（`/investment/strategy`）股票列表的題材 badge（最多顯示 2 個，超出顯示 +N）
- **新增** 籌碼排行（`/investment/equity`）股票列表的題材 badge
- **新增** 選股池（`/investment`）StockPickerHub / ConsensusPanel 股票列的題材 badge

## Non-Goals

- 不新增任何後端 DB 查詢：題材資料來自靜態 `topicMap.json`，zero DB cost
- 不重新設計現有頁面的 layout，badge 只做最小插入
- 不新增題材 filter 功能（僅顯示 badge，不做可點擊篩選）
- 不保留 `/investment/topics` 頁面的任何入口（包含「更多」dropdown）

## Capabilities

### New Capabilities

- `topic-badge-utility`: 從 `topicMap.json` 建立 stock→topics 反查表，並提供 `TopicBadge` React 元件供各頁面使用
- `sector-topic-heatmap`: 族群強弱頁面下方的產業題材熱力格區塊，呈現 75 個題材的當日漲跌熱力著色

### Modified Capabilities

- `sector-strength-web`: 族群強弱頁面新增題材熱力格區塊（新增 UI section，不變動現有排行邏輯）

## Impact

- Affected specs: `topic-badge-utility`（新建）、`sector-topic-heatmap`（新建）、`sector-strength-web`（delta）
- Affected code:
  - New: `src/lib/investment/topicUtils.ts`
  - New: `src/components/features/investment/TopicBadge.tsx`
  - New: `src/components/features/investment/sectors/SectorTopicHeatmap.tsx`
  - Modified: `src/app/investment/layout.tsx`
  - Modified: `src/app/investment/sectors/page.tsx`
  - Modified: `src/app/investment/sectors/SectorDashboard.tsx`
  - Modified: `src/app/investment/strategy/page.tsx`
  - Modified: `src/app/investment/equity/page.tsx`
  - Modified: `src/app/investment/page.tsx`
  - Modified: `src/components/features/investment/StockPickerHub.tsx`
  - Removed: `src/app/investment/topics/page.tsx`
  - Removed: `src/app/investment/topics/TopicsDashboard.tsx`
  - Removed: `src/app/investment/topics/TopicCard.tsx`
  - Removed: `src/app/investment/topics/TopicStockList.tsx`
  - Removed: `src/app/investment/topics/types.ts`
  - Removed: `src/app/actions/getTopicStockReturns.ts`
