## Why

現有的 `/investment/sectors` 頁面以台灣交易所標準族群分類（水泥、金融、電子等）呈現強弱，但無法反映 AI 伺服器、散熱冷卻、矽晶圓等科技供應鏈題材。引入以 `topicMap.json`（75 個題材、16 大群組）為底的「產業題材地圖」頁面，讓使用者一眼掌握熱門題材的成分股漲跌與資金動向。

## What Changes

- 新增 `/investment/topics` 路由頁面（Server Component）
- 新增 `src/lib/investment/topicMap.json` 靜態資料（75 個題材，794 支成分股對應，來源：stock-data-ai/stock-data 公開 GitHub repo，已完成下載）
- 新增 `src/app/investment/topics/page.tsx`（Server Component，讀取 topicMap.json + 從 DB 補齊股價漲跌）
- 新增 `src/app/investment/topics/TopicsDashboard.tsx`（Client Component，搜尋 / 篩選 / 群組切換）
- 新增 `src/app/investment/topics/TopicCard.tsx`（題材卡片，顯示名稱、群組、成分股漲跌概況）
- 新增 `src/app/actions/getTopicStockReturns.ts`（Server Action：批量查 `sector_strength_stocks` 或 `market_treemap_daily` 補齊個股 ret_1d）
- 側欄新增「產業題材」導覽連結（`/investment/topics`）

## Non-Goals

- 不實作「上中下游」分層顯示（Firebase 資料，未公開）
- 不自動同步 topicMap.json（手動更新；ticker-topic 對應每日由 GitHub Actions 更新，需時可手動重新下載）
- 不做即時股價 WebSocket，只顯示最新交易日的漲跌幅

## Capabilities

### New Capabilities

- `investment-topic-map-view`: 以 16 大群組 × 75 個題材的卡片式視圖呈現台灣科技供應鏈題材
- `topic-stock-returns`: 為每個題材的成分股批量取得最新日漲跌幅，計算題材平均漲跌

### Modified Capabilities

(none)

## Impact

- Affected specs: investment-topic-map-view, topic-stock-returns
- Affected code:
  - New: src/app/investment/topics/page.tsx
  - New: src/app/investment/topics/TopicsDashboard.tsx
  - New: src/app/investment/topics/TopicCard.tsx
  - New: src/app/actions/getTopicStockReturns.ts
  - New: src/lib/investment/topicMap.json
  - Modified: src/components/layout/SideNav.tsx
