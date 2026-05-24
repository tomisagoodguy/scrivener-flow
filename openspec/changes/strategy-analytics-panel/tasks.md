## 1. 共用工具抽取

- [x] 1.1 建立 `src/lib/investment/treemapUtils.ts`，從 `SectorHeatmap.tsx` 抽出 `blockColor()`、`textColor()`、`computeTreemap()` 三個函式並 export
- [x] 1.2 更新 `SectorHeatmap.tsx`，改從 `treemapUtils.ts` import，確認行為不變

## 2. Server Action

- [x] 2.1 建立 `src/app/actions/getStrategyAnalytics.ts`，整合 `getAllStrategyHitStocks` + `getSectorStrength`，回傳 `StrategyAnalyticsData`（策略股清單 + 族群排行）
- [x] 2.2 在 action 中計算「策略涉及族群的加權平均漲跌幅（以成交金額為權重）」

## 3. 子元件實作

- [x] 3.1 建立 `src/components/features/strategy/StrategyHeatmap.tsx`：Canvas Treemap，按族群分組，色=漲跌幅，大小=成交金額，支援 `period: '1d'|'5d'|'20d'` prop，點擊跳 `/investment/stock/[code]`
- [x] 3.2 建立 `src/components/features/strategy/StrategySectorRanking.tsx`：純 CSS 橫向 Bar Chart，顯示策略涉及族群的漲跌排行，支援 period 切換
- [x] 3.3 建立 `src/components/features/strategy/StrategyVolumeRanking.tsx`：Top 15 策略股成交金額列表，顯示股票代號/名稱/金額/漲跌幅，支援 period 切換排序

## 4. 面板容器

- [x] 4.1 建立 `src/components/features/strategy/StrategyAnalyticsPanel.tsx`（Client Component），含日/周/月 Tab 切換狀態，整合三個子元件，預設展開，支援折疊

## 5. 整合至策略頁

- [x] 5.1 修改 `src/app/investment/strategy/page.tsx`：呼叫 `getStrategyAnalytics()`，在現有策略卡片網格上方插入 `<StrategyAnalyticsPanel>`
- [x] 5.2 本地啟動 `yarn dev`，驗證三個子模組在日/周/月切換下資料正確、熱力圖渲染正常、點擊跳轉個股頁面

## 6. 收尾

- [x] 6.1 確認 TypeScript 無 `any`，`yarn build` 通過
- [ ] 6.2 commit 並 push
