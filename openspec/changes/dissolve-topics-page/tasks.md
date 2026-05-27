## 1. 建立題材工具層（topic-badge-utility）

- [x] 1.1 [P] 在 `src/lib/investment/topicUtils.ts` 建立 `buildStockTopicMap()` 函數（題材反查表以模組層級常數建立），讀取 `topicMap.json` 並回傳 `Map<string, TopicEntry[]>`（stock-to-topic reverse lookup map），同時 export `getStockTopics(stockCode: string): TopicEntry[]` 便捷函數
- [x] 1.2 [P] 在 `src/components/features/investment/TopicBadge.tsx` 建立 TopicBadge React component（TopicBadge 為純 Client 元件，不需要 props drilling），接收 `stockCode: string`，透過 `getStockTopics` 取得題材清單，最多顯示 2 個 shortname badge，超出以 `+N` overflow chip 顯示，無題材時 return null

## 2. 族群強弱頁題材熱力格（sector-topic-heatmap）

- [x] 2.1 建立 `src/components/features/investment/sectors/SectorTopicHeatmap.tsx`，接收 `topics: TopicWithStats[]`，以 grid 渲染 Topic heatmap block in sector strength page，根據 `avgRet1d` 套用台股色彩（紅漲綠跌）熱力背景色：≥+2% → rose-700、+0.5%~+2% → rose-400、-0.5%~+0.5% → slate-200、-2%~-0.5% → emerald-400、≤-2% → emerald-700；點擊卡片展開成分股列表（topic card click expands stock list）
- [x] 2.2 在 `src/app/investment/sectors/page.tsx` 的 `Promise.all` 中新增 `getTopicStockReturns(allStockCodes)` 並行呼叫（族群強弱題材熱力格：直接複用 getTopicStockReturns、topic heatmap data flow），計算各題材 `avgRet1d`，組成 `TopicWithStats[]` 傳入 `SectorDashboard`（需從 topicMap.json 取得 allStockCodes）
- [x] 2.3 在 `src/app/investment/sectors/SectorDashboard.tsx` 接收新增的 `topics: TopicWithStats[]` prop，在最下方渲染「產業題材今日表現」heading 與 `<SectorTopicHeatmap topics={topics} />`（topic heatmap section in sector page）

## 3. 三個頁面整合 TopicBadge

- [x] 3.1 [P] 在策略選股 `src/app/investment/strategy/page.tsx` 的 `StrategyMonitorCard` 或其子元件的股票名稱欄位旁加入 `<TopicBadge stockCode={stock.stock_id} />`
- [x] 3.2 [P] 在籌碼排行相關元件（`src/components/features/investment/equity/` 下的股票列表渲染元件）的股票名稱旁加入 `<TopicBadge stockCode={stockCode} />`
- [x] 3.3 [P] 在選股池 `src/components/features/investment/StockPickerHub.tsx` 的股票列項目旁加入 `<TopicBadge stockCode={stock.stock_code} />`

## 4. 移除獨立題材頁面與 nav

- [x] 4.1 從 `src/app/investment/layout.tsx` 的 `primaryNavItems` 陣列移除「產業題材」`/investment/topics` 項目（同步確認 `moreGroup` 也不含此項目）
- [x] 4.2 移除 /investment/topics 路由：刪除 `src/app/investment/topics/` 目錄下的全部檔案（`page.tsx`、`TopicsDashboard.tsx`、`TopicCard.tsx`、`TopicStockList.tsx`、`types.ts`）
- [x] 4.3 確認 `src/app/actions/getTopicStockReturns.ts` 未 import 任何已刪除的 topics 目錄型別；若有則將型別定義搬移至 `src/lib/investment/topicUtils.ts`

## 5. 驗證

- [x] 5.1 執行 `yarn build` 確認無 TypeScript 錯誤，特別確認 topics 相關 import 已全部清除
- [x] 5.2 啟動 dev server，瀏覽 `/investment/sectors` 確認題材熱力格區塊正常渲染
- [x] 5.3 確認 `/investment/strategy`、`/investment/equity`、`/investment` 三頁股票列的 topic badge 正常顯示
- [x] 5.4 確認 nav 中「產業題材」項目已消失，直接訪問 `/investment/topics` 回傳 404
