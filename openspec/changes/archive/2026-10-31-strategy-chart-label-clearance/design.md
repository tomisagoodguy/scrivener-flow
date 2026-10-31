## Context

`strategy-chart-trade-labels` 以 `TradeLabelsPrimitive` 自繪「買」「賣」，y 錨點為該日最高價／最低價。標籤寬約 20 CSS px，K 棒間距約 4px（240 根擠在 ~950px），所以標籤蓋住左右各約 2 根 K 棒。K 線價格軸 `scaleMargins` 為上下 0.05（360px 高約 18px），極值處標籤會超出圖面。

## Goals / Non-Goals

**Goals:**

- 「買」「賣」標籤不覆蓋任何 K 棒實體或影線。
- 極值附近的標籤留在 K 線主圖內。

**Non-Goals:**

- 不避開均線、壓力線等折線（只保證不壓 K 棒）。
- 不處理兩個標籤彼此重疊。
- 不改其他頁面的 K 線價格軸邊距。

## Decisions

### 錨點取標籤覆蓋範圍內 K 棒的極值

`TradeLabelsPaneView.update()` 以 `series.data()` 取得 K 棒，轉成像素座標 `{ x, highY, lowY }`。純函式 `labelAnchorY(position, x, bars, halfWidth)`：取 `|bar.x - x| <= halfWidth` 的 K 棒，「買」回傳最小 `highY`（畫面最高點），「賣」回傳最大 `lowY`；無 K 棒時回傳 null（略過）。`halfWidth` 取標籤半寬 12 CSS px（12px 字＋左右各 4px 內距約 20px，再加 2px 餘裕）。renderer 以錨點加原本的 6px（上）／18px（下）間距定位。

替代方案：把標籤固定放在圖面頂端／底端一條帶狀區——離 K 棒太遠、要另畫引線，捨棄。

### 有持有標記時加大 K 線價格軸邊距

`createKLinePanel` 有 `holdingMarks` 時對 K 線 series 的價格軸套 `scaleMargins: { top: 0.12, bottom: 0.15 }`（360px 約上 43px、下 54px；「買」需 6+16=22px、「賣」需 18+16=34px）。無 `holdingMarks` 時維持 0.05。renderer 另將標籤 top 夾在 pane 內作為最後保險。

## Implementation Contract

- `labelAnchorY(position: 'above' | 'below', x: number, bars: readonly BarCoord[], halfWidth: number): number | null`，`BarCoord = { x: number; highY: number; lowY: number }`，依 spec 範例表回傳 40 / 95。
- 標籤底緣（買）＝錨點 − 6px；標籤頂緣（賣）＝錨點 + 18px；再夾在 pane 高度內。
- `createKLinePanel` 有 `holdingMarks` 時 K 線 series `priceScale().applyOptions({ scaleMargins: { top: 0.12, bottom: 0.15 } })`。
- 驗收：`labelAnchorY` 單元測試（範例表兩列＋無覆蓋 K 棒回 null）、`createKLinePanel` 測試斷言邊距；Playwright 截 3189、1815 確認標籤不壓 K 棒、未出圖面。
- 範圍外：折線避讓、標籤互相避讓。

## Risks / Trade-offs

- [加大邊距使 K 線上下各縮約 7–10%] → 只在策略圖表視角（有持有標記）時套用。
- [series.data() 每次 update 重算 240 根座標] → 數量小，可接受。

## Migration Plan

純前端；回滾 revert commit。

## Open Questions

(none)
