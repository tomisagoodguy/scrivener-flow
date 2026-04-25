## 1. Props 介面重構

- [x] 1.1 修改 `DrilldownTabs` 的 `weightHistory` prop：從 `ReactNode` 改為 `historyData: RankingDataRow[]`（直接傳原始資料）
- [x] 1.2 更新 `[etf]/page.tsx`：將 `weightHistory={<RankingTrendChart data={rankingHistory} />}` 改為 `historyData={rankingHistory}`

## 2. 新增 HoldingSparklineGrid 元件

- [x] 2.1 建立 `src/components/features/investment/HoldingSparklineGrid.tsx`
- [x] 2.2 實作時間範圍過濾邏輯（90 天 / 180 天 / 全部）
- [x] 2.3 實作每支股票的統計計算：當前比重、peak 比重、追蹤天數、目前排名
- [x] 2.4 實作排序邏輯（依比重 / 依 peak / 依追蹤天數）
- [x] 2.5 實作 sparkline 卡片（Recharts AreaChart，無 Axis/Tooltip/Legend，120×40px）
- [x] 2.6 實作格狀布局：`grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5`

## 3. DrilldownTabs history tab 整合

- [x] 3.1 在「歷史軌跡」tab 加入檢視模式切換按鈕（折線圖 / Sparkline），`useState` 管理
- [x] 3.2 將時間範圍篩選（3M / 6M / All）提升至 tab 頂部，共用狀態同時傳入兩個元件
- [x] 3.3 條件渲染：切換按鈕控制顯示 `RankingTrendChart` 或 `HoldingSparklineGrid`

## 4. 驗證

- [x] 4.1 確認折線圖模式行為與修改前一致（排名走勢、Top N 篩選）
- [x] 4.2 確認 sparkline 模式：時間範圍篩選正確過濾資料點
- [x] 4.3 確認 sparkline 模式：三種排序選項運作正常
- [x] 4.4 確認響應式布局在手機（2欄）、桌機（4–5欄）正常顯示
- [x] 4.5 確認資料稀疏（Pocket.tw ETF 多天才一筆）時 sparkline 線段以 `connectNulls` 銜接
