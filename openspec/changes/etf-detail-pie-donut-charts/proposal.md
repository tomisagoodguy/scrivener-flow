## Why

ETF 詳頁目前缺乏圓形視覺化圖表，無法直觀呈現持股權重分佈與今日買進資金集中度。參考 stocktrack.morningjoy.cc 的設計，補充圓餅圖與甜甜圈圖可讓使用者一眼掌握持股集中度與資金流向。

## What Changes

- 在 ETF 詳頁（`/investment/[etf]`）新增「前十大持股圓餅圖」：顯示前 10 大持股的權重佔比
- 在 ETF 詳頁新增「今日買進資金佔比 Donut Chart」：顯示今日加碼（BUY/IN）各股的資金量佔比
- 兩個圖表使用現有 `recharts` 函式庫實作
- 圖表放置於現有 `DrilldownTabs` 的「目前持股」與「當日加減碼」Tab

## Non-Goals

- 不新增後端 API，直接使用現有 holdings 與 diff_logs 資料
- 不修改資料庫 schema
- 不實作圖表互動動畫（hover tooltip 除外）

## Capabilities

### New Capabilities

- `etf-holdings-pie-chart`: 前十大持股權重圓餅圖元件，使用 recharts PieChart，顯示前 10 大持股的 weight_pct 佔比，其餘合併為「其他」
- `etf-buy-donut-chart`: 今日買進資金佔比甜甜圈圖元件，使用 recharts PieChart（innerRadius），從 diff_logs 篩選 BUY/IN 事件，以 `|diff_shares| × price` 計算資金量

### Modified Capabilities

(none)

## Impact

- Affected specs: etf-holdings-pie-chart, etf-buy-donut-chart
- Affected code:
  - New: `src/components/features/investment/EtfHoldingsPieChart.tsx`
  - New: `src/components/features/investment/EtfBuyDonutChart.tsx`
  - Modified: `src/app/investment/[etf]/page.tsx`
