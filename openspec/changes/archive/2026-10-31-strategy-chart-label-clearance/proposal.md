## Why

實心「買」「賣」標籤約 20px 寬，遠大於 K 棒間距（約 4px），目前只對齊自己那根 K 棒的最高／最低價，會壓到左右相鄰較高或較低的 K 棒；且 K 線價格軸上下邊距只有 5%，貼近極值的標籤沒有空間。使用者要求「買和賣不要壓到 K 線圖」。

## What Changes

- 標籤垂直位置改取「標籤水平範圍內所有 K 棒」的最高點（買）／最低點（賣），再往外留間距。
- 有持有標記時，K 線主圖價格軸上下邊距加大，讓位於極值的標籤留在圖內。

## Non-Goals (optional)

（見 design.md）

## Capabilities

### New Capabilities

(none)

### Modified Capabilities

- `strategy-chart-view`: 「Strategy holding marks on chart」新增標籤不得壓到 K 棒、價格軸預留邊距。

## Impact

- Affected specs: `strategy-chart-view`
- Affected code: src/components/features/investment/BareKTradeLabels.ts（錨點計算與繪製）、src/components/features/investment/BareKChartPanels.ts（有持有標記時調整 K 線價格軸邊距）
