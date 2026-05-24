# strategy-volume-ranking

## Purpose
列出策略命中股票的成交金額排行，協助使用者優先關注籌碼最活躍的標的。

## Requirements

### 資料
- 資料來源：`getAllStrategyHitStocks()` 回傳的清單
- 切換 `日` 時排序欄位為 `amount`（當日成交金額）
- 切換 `周(5d)` / `月(20d)` 時——因資料只有 `ret_5d/ret_20d` 而無對應累積成交量——改以 `ret_5d` / `ret_20d` 漲跌幅排序，並在 Tab 標籤說明「按漲跌幅排序」
- 最多顯示 15 筆

### 視覺
- 每列顯示：排名、股票代號、股票名稱、族群、金額（或漲跌幅）、漲跌幅（色彩同台股慣例）
- 所屬 ETF 標籤（若有）以小 badge 顯示

### 互動
- 頂部 Tab 切換 `日 / 周 / 月`
- 點擊列跳轉 `/investment/stock/[code]`

### 邊界條件
- amount 為 null 的股票排在最後

### Requirement: 策略命中股成交金額排行

#### 資料
- 資料來源：`getAllStrategyHitStocks()` 回傳的清單
- 切換 `日` 時排序欄位為 `amount`（當日成交金額）
- 切換 `周(5d)` / `月(20d)` 時——因資料只有 `ret_5d/ret_20d` 而無對應累積成交量——改以 `ret_5d` / `ret_20d` 漲跌幅排序，並在 Tab 標籤說明「按漲跌幅排序」
- 最多顯示 15 筆

### 視覺
- 每列顯示：排名、股票代號、股票名稱、族群、金額（或漲跌幅）、漲跌幅（色彩同台股慣例）
- 所屬 ETF 標籤（若有）以小 badge 顯示

### 互動
- 頂部 Tab 切換 `日 / 周 / 月`
- 點擊列跳轉 `/investment/stock/[code]`

### 邊界條件
- amount 為 null 的股票排在最後

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