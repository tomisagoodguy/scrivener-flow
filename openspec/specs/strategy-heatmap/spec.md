# strategy-heatmap

## Purpose
以 Treemap 熱力圖呈現策略命中股票，讓使用者一眼看出哪個族群、哪支股票漲跌最顯著。

## Requirements

### 資料
- 資料來源：`getAllStrategyHitStocks()` 回傳帶 `ret_1d / ret_5d / ret_20d / amount / category / stock_id / stock_name` 的清單
- 大小（面積）：按 `amount`（成交金額）比例分配；無 amount 資料時以均等面積顯示

### 視覺
- 以族群（`category`）分組，同族群的股票鄰接排列
- 色彩使用台股慣例（紅漲綠跌），閾值與 `SectorHeatmap.tsx` 一致
- 每個區塊顯示：股票代號、股票名稱（空間不足時省略名稱）、漲跌幅數字

### 互動
- 頂部 Tab 切換 `日(1d) / 周(5d) / 月(20d)` — 切換後重新計算色彩與排序
- 滑鼠懸停顯示 Tooltip：股票代號、名稱、族群、漲跌幅、成交金額
- 點擊區塊跳轉 `/investment/stock/[code]`

### 邊界條件
- 無資料時顯示「暫無策略股資料」空白態
- 螢幕寬度 < 640px 時高度不低於 240px，區塊只顯示代號

### Requirement: 策略股 Treemap 熱力圖

#### 資料
- 資料來源：`getAllStrategyHitStocks()` 回傳帶 `ret_1d / ret_5d / ret_20d / amount / category / stock_id / stock_name` 的清單
- 大小（面積）：按 `amount`（成交金額）比例分配；無 amount 資料時以均等面積顯示

#### 視覺
- 以族群（`category`）分組，同族群的股票鄰接排列
- 色彩使用台股慣例（紅漲綠跌），閾值與 `SectorHeatmap.tsx` 一致
- 每個區塊顯示：股票代號、股票名稱（空間不足時省略名稱）、漲跌幅數字

#### 互動
- 頂部 Tab 切換 `日(1d) / 周(5d) / 月(20d)` — 切換後重新計算色彩與排序
- 滑鼠懸停顯示 Tooltip：股票代號、名稱、族群、漲跌幅、成交金額
- 點擊區塊跳轉 `/investment/stock/[code]`

#### 邊界條件
- 無資料時顯示「暫無策略股資料」空白態
- 螢幕寬度 < 640px 時高度不低於 240px，區塊只顯示代號

<!-- @trace
source: strategy-analytics-panel
updated: 2026-05-24
code:
  - src/app/actions/getSectorStrength.ts
  - src/app/actions/getTreemapData.ts
  - next-env.d.ts
  - src/app/investment/sectors/components/SectorTreemap.tsx
  - tsconfig.tsbuildinfo
  - ETF/pipeline/steps/sync_treemap_step.py
-->