## 1. 新建元件

- [x] [P] 1.1 建立 `src/components/features/strategy/MultiStrategyConsensusPanel.tsx`，接收 `stocks: MultiConsensusEntry[]` prop，以 glass-card 容器呈現，元件行數 ≤ 120 行
- [x] [P] 1.2 在 `MultiStrategyConsensusPanel` 內定義 `MultiConsensusEntry` 介面（`stock_id`, `name`, `count`, `industry`, `etfHolders`, `movement`），並匯出供 page.tsx 使用
- [x] [P] 1.3 在面板中實作「multi-strategy consensus panel display」需求：每筆顯示股票代碼+名稱、數字策略 badge（橙色 `bg-amber-500/10 text-amber-700`）、族群標籤、EtfHolderBadges、movement badge；未達 2 筆時不渲染
- [x] [P] 1.4 實作 `MultiStrategyConsensusPanel` 的台股色彩規範：movement badge 使用 `MOVEMENT_BADGE` 對應表（加碼 rose、減碼 emerald、持倉 gray、未持有 slate），每支股票為可點擊的 Link 連結至 `/investment/stock/[code]`

## 2. 頁面整合

- [x] 2.1 在 `src/app/investment/strategy/page.tsx` 加入 `buildMultiConsensusStocks(result)` helper function，實作「cross-strategy count computed server-side」需求：迭代 `result.strategies[*].stocks`，計算每支 `stock_id` 的命中策略數，過濾 ≥ 2，按 count desc → stock_id asc 排序
- [x] 2.2 在策略視角分支（非 monitor / chart）呼叫 `buildMultiConsensusStocks(result)` 並將結果傳入 `<MultiStrategyConsensusPanel>`，插入位置為 `StrategyAnalyticsPanel` 下方、策略卡片格線上方
- [x] 2.3 確認 `view=monitor` 與 `view=chart` 時不渲染 `MultiStrategyConsensusPanel`（panel only shown in strategy view）

## 3. 品質驗證

- [x] 3.1 執行 `yarn build` 確認無 TypeScript 錯誤
- [x] 3.2 目視確認策略頁：有多策略共選股時顯示面板；無共選時面板不出現；monitor / chart 視角不顯示面板
