## Context

`TradeLabelsPrimitive` 目前在 renderer 依錨點算標籤頂端，標籤之間沒有避讓；`labelAnchorY` 已保證不壓 K 棒。

## Goals / Non-Goals

**Goals:**

- 同側標籤彼此不重疊，每個日期都保留自己的標籤。

**Non-Goals:**

- 「買」與「賣」分居 K 棒上下，不互相避讓。
- 不處理錯開後超出圖面（renderer 既有的夾在圖內保險仍在）。

## Decisions

### 依時間順序貪婪疊層

新增純函式 `stackLabelTops(items, width, height, gap)`：`items` 為 `{ x, top, position }`（CSS px，已依時間遞增），逐一放置；若與同側已放置的矩形相交（水平距離 < width 且垂直區間重疊），「買」往上移 `height + gap`、「賣」往下移，重複到不相交。回傳每項最終 top。`width` 取 20（12px 字＋左右 4px 內距）、`height` 16、`gap` 2。pane view 的 `update()` 先由錨點算初始 top，再呼叫此函式；renderer 直接使用 top（乘 pixel ratio 後仍夾在圖內）。

替代方案：合併相鄰同字標籤——使用者選擇保留每個日期，捨棄。

## Implementation Contract

- `stackLabelTops(items: readonly { x: number; top: number; position: 'above' | 'below' }[], width: number, height: number, gap: number): number[]`，結果符合 spec 範例表五列。
- `LabelPoint` 改存 `{ x, top, label }`（CSS px），renderer 不再自行由錨點推算 top。
- 驗收：`stackLabelTops` 單元測試（範例表）；既有 `labelAnchorY`、`buildTradeLabels` 測試不變；Playwright 截 1815 確認 10-08、10-13 的「買」上下錯開不重疊。
- 範圍外：買賣之間避讓、合併標籤。

## Risks / Trade-offs

- [密集買進時疊很多層，可能碰到圖面頂端] → 仍有夾在圖內保險；實際資料多數只疊 1–2 層。

## Migration Plan

純前端；回滾 revert commit。

## Open Questions

(none)
