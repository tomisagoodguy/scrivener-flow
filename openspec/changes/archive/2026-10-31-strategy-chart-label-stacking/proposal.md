## Why

實心「買」「賣」標籤約 20px 寬，相鄰日期（例：1815 的 10-08 與 10-13，相距約 8px）的兩個標籤會彼此疊住，看起來像「]買」。使用者選擇「上下錯開」。

## What Changes

- 同一側（買在上、賣在下）的標籤若與已放置的標籤重疊，就往遠離 K 棒的方向再疊一層，直到不重疊；依時間先後放置。

## Non-Goals (optional)

（見 design.md）

## Capabilities

### New Capabilities

(none)

### Modified Capabilities

- `strategy-chart-view`: 「Strategy holding marks on chart」新增標籤彼此不重疊、上下錯開。

## Impact

- Affected specs: `strategy-chart-view`
- Affected code: src/components/features/investment/BareKTradeLabels.ts（新增錯開計算，pane view 先算好每個標籤的頂端位置）
