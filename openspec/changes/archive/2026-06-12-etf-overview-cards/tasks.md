## 1. Server 端聚合（ETF overview stats aggregation）

- [x] 1.1 撰寫 `src/lib/investment/__tests__/etfOverviewStats.test.ts`：先寫失敗測試，覆蓋 spec 的三個情境——diff count mapping（IN/OUT/BUY/SELL → added/removed/increased/decreased）、`etf_aum_series` 無資料時 nav/aum_100m 回傳 null、各 ETF 使用自己的揭露日（ETF overview stats aggregation 的 Per-ETF disclosure date independence 情境）
- [x] 1.2 建立 `src/lib/investment/etfOverviewStats.ts`：依 design「新增 etfOverviewStats 聚合函式（單一入口、四段查詢）」實作 `getEtfOverviewStats()` 與 `EtfOverviewStat` 型別；依 design「揭露日採用各 ETF 自己的最新 data_date」以 `etf_code` 分組取 max(data_date)，snapshot 查詢以近 14 天為下界；使測試 1.1 全數通過

## 2. UI 元件（卡片元件拆分為 Grid 容器與單卡兩檔）

- [x] 2.1 [P] 建立 `src/components/features/investment/EtfOverviewCard.tsx`：單卡純展示元件（≤150 行），顯示代號/名稱/投信/揭露日/NAV/規模/持股檔數與四個異動 badge；badge 配色實作 Taiwan market color convention for diff badges（新增/加碼 rose、刪除/減碼 emerald、count=0 中性灰）；NAV 或規模為 null 顯示「—」；揭露日落後全局最新日期時以灰階呈現；整卡為 Link 導向 `/investment/[etf]`，容器用 `.glass-card`
- [x] 2.2 [P] 撰寫 `src/components/features/investment/__tests__/etfOverviewSort.test.ts`：先寫失敗測試覆蓋 Card ordering 規則——揭露日等於全局最新者在前，同組內 AUM 降冪，null AUM 排同組最後（含 spec 的 ordering example：C, A, D, B）
- [x] 2.3 建立 `src/components/features/investment/EtfOverviewGrid.tsx`：Grid 容器（≤150 行），實作並匯出 Card ordering 排序函式使測試 2.2 通過；響應式 grid（手機 1 欄 / 平板 2 欄 / 桌機 3 欄），渲染 EtfOverviewCard 列表

## 3. 頁面整合（ETF overview card grid 上線）

- [x] 3.1 修改 `src/components/features/investment/InvestmentTabs.tsx`：依 design「以新分頁整合進 InvestmentTabs」新增 `overviewContent` prop 與「ETF 總覽」分頁，遵循既有 tab 結構與順序慣例
- [x] 3.2 修改 `src/app/investment/page.tsx`：將 `getEtfOverviewStats()` 加入既有 `Promise.all` 批次，把 `<EtfOverviewGrid>` 作為 `overviewContent` 傳入，完成 ETF overview card grid 的頁面接線（含卡片點擊導向 `/investment/[etf]` 的人工驗證）
- [x] 3.3 全面驗證：`yarn test`（1.1 與 2.2 測試全綠）、`yarn lint`、`yarn build` 通過；本地 `yarn dev` 開啟 `/investment` 確認「ETF 總覽」分頁卡片資料正確、深色模式下 badge 配色與灰階揭露日顯示正常
