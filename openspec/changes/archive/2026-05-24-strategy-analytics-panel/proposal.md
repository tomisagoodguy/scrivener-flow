## Why

策略選股中心目前只顯示各策略的命中股票清單，缺乏橫向比較視角——使用者無法快速看出策略股整體的漲跌分布、哪個族群最強、哪支成交最大。加入熱力圖與排行分析，讓選股後的決策更有根據。

## What Changes

- 在策略選股頁面頂部新增「分析面板」區塊，含四個視覺化子模組
- **策略股熱力圖**：以 Treemap 呈現所有策略命中股票，按族群分組，顏色代表漲跌幅（日/周/月切換）
- **族群漲跌幅排行**：取策略股涉及的族群，以橫向 Bar Chart 顯示 ret_1d / ret_5d / ret_20d 排行
- **成交金額排行**：策略命中股票依當日/5日/20日成交金額排序的 Top 列表
- **產業漲跌幅**：以策略股的 `category` 分組，計算各產業平均漲跌並做柱狀排行

## Capabilities

### New Capabilities
- `strategy-heatmap`: 策略股 Treemap 熱力圖（按族群分組、日/周/月切換、點擊跳轉個股）
- `strategy-sector-ranking`: 策略涉及族群的漲跌幅排行（日/周/月 Bar Chart）
- `strategy-volume-ranking`: 策略命中股票成交金額排行（日/周/月切換 Top N 列表）

### Modified Capabilities

## Impact

- **新增 Server Action**：`getStrategyAnalytics.ts`，整合 `getAllStrategyHitStocks` + `getSectorStrength`，回傳分析面板所需資料
- **新增元件**：`StrategyAnalyticsPanel.tsx`（面板容器）、`StrategyHeatmap.tsx`（熱力圖）、`StrategySectorRanking.tsx`（族群排行）、`StrategyVolumeRanking.tsx`（成交排行）
- **修改**：`src/app/investment/strategy/page.tsx` — 在現有策略卡片上方加入分析面板
- **資料來源**：`sector_strength_stocks` 表（已有 ret_1d/5d/20d/amount/category），`sector_strength` 表（已有族群彙總），不需新增 Migration
- **依賴**：複用 `SectorHeatmap.tsx` 的 blockColor / Treemap 演算法邏輯
