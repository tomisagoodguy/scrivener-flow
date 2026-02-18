# Tasks: Revenue Lab Integration

## Phase 0：基礎建設

- [x] 建立 `src/types/revenuelab.ts`，定義 `WinRateYearData`、`WinRateBucket`、`StockDetail`、`HeatmapYearData`、`ReturnBin`、`HeatmapCell`、`GoldenZoneStats`、`StockHistoricalStats`、`WinRateFilters`、`HeatmapStatMode` 型別 <!-- id: types -->
- [x] 建立 `public/data/revenue-lab/` 目錄，加入 `.gitkeep` <!-- id: data-dir -->
- [x] 建立 `public/data/revenue-lab/win-rate-2024.mock.json`，填入模擬勝率資料（爆發次數 1-12，含合理數值） <!-- id: mock-win-rate -->
- [x] 建立 `public/data/revenue-lab/heatmap-2024.mock.json`，填入模擬熱力圖資料 <!-- id: mock-heatmap -->
- [x] 建立 `public/data/revenue-lab/golden-zone-stats.mock.json`，填入模擬黃金區間歷史統計 <!-- id: mock-golden -->

## Phase 1：Server Actions

- [x] 建立 `src/app/actions/revenueLabActions.ts`，實作 `getWinRateData(year)`、`getHeatmapData(year)`、`getGoldenZoneStats()`，開發環境讀取 `.mock.json`，生產環境讀取正式 JSON <!-- id: server-actions -->

## Phase 2：模組 A — WinRateLab

- [x] 建立 `src/components/features/investment/WinRateLab.tsx`，實作年度選擇器、YOY 門檻控制列 <!-- id: win-rate-controls -->
- [x] 在 `WinRateLab.tsx` 實作統計摘要卡片列（最佳爆發次數、最高勝率、最高平均漲幅、總樣本數） <!-- id: win-rate-metrics -->
- [x] 在 `WinRateLab.tsx` 實作 Recharts ComposedChart（Bar: 平均漲幅，Line: 中位數漲幅，X 軸: 爆發次數） <!-- id: win-rate-chart -->
- [x] 在 `WinRateLab.tsx` 實作勝率統計表格（欄位：爆發次數、股票數、平均漲幅、中位數、勝率、翻倍率、標準差） <!-- id: win-rate-table -->
- [x] 在 `WinRateLab.tsx` 實作詳細名單 Accordion（按爆發次數展開，顯示 StockDetail 列表） <!-- id: win-rate-detail -->

## Phase 3：模組 B — RevenueHeatmap

- [x] 建立 `src/components/features/investment/RevenueHeatmap.tsx`，實作年度選擇器與統計模式切換（中位數/平均值/標準差/正增長比例） <!-- id: heatmap-controls -->
- [x] 在 `RevenueHeatmap.tsx` 實作 CSS Grid 熱力圖主體，Y 軸為漲幅區間（下跌紅色系、上漲綠色系），X 軸為月份 <!-- id: heatmap-grid -->
- [x] 實作顏色映射函數 `valueToColor(value, mode)`，將統計值映射至 HSL 顏色 <!-- id: heatmap-color -->
- [x] 在 `RevenueHeatmap.tsx` 實作 Cell Tooltip（顯示漲幅區間、月份、YOY 統計值、股票數） <!-- id: heatmap-tooltip -->
- [x] 在 `RevenueHeatmap.tsx` 實作色階圖例（Legend） <!-- id: heatmap-legend -->

## Phase 4：模組 C — GoldenGrowthZone 強化

- [x] 修改 `GoldenGrowthZone.tsx`，新增可選 prop `historicalStats` <!-- id: golden-props -->
- [x] 在 `GoldenGrowthZone.tsx` 的股票卡片新增歷史統計列 <!-- id: golden-stats-ui -->
- [x] 確認 `historicalStats` 為 `undefined` 時，元件行為與原本完全相同 <!-- id: golden-compat -->

## Phase 5：整合容器

- [x] 建立 `src/components/features/investment/RevenueLab.tsx`，整合三個子模組，包含頁首說明卡與資料更新時間戳 <!-- id: revenue-lab-container -->
- [x] 找到投資策略頁面主元件，新增「📊 Revenue Lab」Tab，在 Server Component 層預取 `getGoldenZoneStats()` <!-- id: page-integration -->

## Phase 6：Supabase 直接查詢（取代 Python 腳本）

- [x] 建立 `src/lib/supabase/service.ts`，提供不依賴 cookies 的 Supabase client，可在 `unstable_cache` 內安全使用 <!-- id: supabase-service -->
- [x] 改寫 `revenueLabActions.ts`，直接查詢本專案 Supabase（`stock_revenue_monthly` + `stock_prices_daily`） <!-- id: supabase-query -->
- [x] 分析宇宙：ETF 持股 53 檔，月營收 2024-03 起，股價 2025-06 起 <!-- id: data-universe -->
- [x] 以 2025 年為分析年度，股價漲幅改用 2025-06 至 12 月半年漲幅 <!-- id: year-strategy -->

## Phase 7：驗證

- [x] 執行 `yarn dev`，確認 Revenue Lab Tab 可正常切換 <!-- id: verify-dev -->
- [x] 確認 `GoldenGrowthZone` 在沒有 `historicalStats` prop 時，顯示與原本完全相同 <!-- id: verify-compat -->
- [x] 確認 TypeScript 無型別錯誤（`yarn tsc --noEmit`） <!-- id: verify-types -->
