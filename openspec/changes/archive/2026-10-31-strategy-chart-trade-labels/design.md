## Context

`strategy-chart-holding-marks` 用 `createSeriesMarkers` 的 `text` 畫「選」「買」。lightweight-charts 5.1 的 marker 文字字級取自 `layout.fontSize`（裸K圖設 10px，見 `baseChartOptions`），無法單獨放大；顏色為 marker 色，壓在淡紅持有背景上對比低。選股日與買進日相鄰，240 根 K 棒約 4px/根，兩個 marker 必然重疊。使用者已選定：只標「買」「賣」、實心底白字。

## Goals / Non-Goals

**Goals:**

- 「買」「賣」標籤在一般縮放下清楚可讀（白色粗體 12px、實心底色）。
- 不影響其他軸、圖例的字級。

**Non-Goals:**

- 不標選股日。
- 不做 hover tooltip、不顯示策略名稱或報酬。
- 不處理同一根 K 棒極近距離的「買」「賣」互相碰撞（持有一天即出場時兩者分居 K 棒上下，不重疊）。
- 不改持有背景、均線發散箭頭、其他頁面。

## Decisions

### 以 series primitive 自繪實心標籤

在 K 線 series 上 `attachPrimitive` 一個 `TradeLabelsPrimitive`（實作 `ISeriesPrimitive`）：`paneViews()` 回傳一個 renderer，於 `useBitmapCoordinateSpace` 內依 `timeScale().timeToCoordinate(time)` 與 `series.priceToCoordinate(high/low)` 定位，畫圓角矩形（半徑 3px）＋白色粗體 12px 文字（乘 pixel ratio）。「買」底 `#e11d48`、標籤底緣距 K 棒最高價 6px；「賣」底 `#059669`、標籤頂緣距最低價 18px（避開內建 belowBar 箭頭）。座標為 null（不在可視範圍）時略過。

替代方案：調大 `layout.fontSize`——會連帶放大所有軸與價格標籤，捨棄；HTML overlay——需自行同步捲動縮放，捨棄。

### 標籤資料由純函式產生，primitive 只負責畫

`buildTradeLabels(ohlcv, marks)` 回傳 `{ time, price, text, color, position }[]`：「買」取該日最高價、position `above`；「賣」取最低價、position `below`；略過無 o/c 的日期；同日同文字一次；依時間遞增。`StrategyHoldingMarks` 以 `exitDates`（非 null `exit_date`，去重升冪）取代 `signalDates`。

## Implementation Contract

- `StrategyHoldingMarks = { entryDates: string[]; exitDates: string[]; periods: { start: string; end: string | null }[] }`。
- `createKLinePanel(..., holdingMarks?)`：有 `holdingMarks` 時掛 `TradeLabelsPrimitive`；內建 marker 只剩均線發散箭頭；無 `holdingMarks` 時與改動前完全相同（不掛 primitive）。
- 新檔 `src/components/features/investment/BareKTradeLabels.ts` 放 `buildTradeLabels` 與 primitive，`BareKChartPanels.ts` 移除 `buildHoldingTextMarkers`。
- 驗收：`buildTradeLabels` 單元測試（spec 場景 1–3 的數值）、`createKLinePanel` 測試（有 holdingMarks 時呼叫 `attachPrimitive`、`createSeriesMarkers` 只收發散箭頭）、`buildHoldingMarks` 測試改為 `exitDates`；Playwright 截圖確認標籤清楚、賣不蓋箭頭。
- 範圍外：tooltip、選股日、其他頁面。

## Risks / Trade-offs

- [primitive 繪圖無法在 jsdom 單元測試] → 繪圖邏輯薄、資料由純函式測試，畫面以截圖驗證。
- [標籤寬約 16px 大於 K 棒間距，鄰近多筆買進會左右重疊] → 同股多策略同日買進已去重；不同日相鄰買進屬少數，接受。

## Migration Plan

純前端；回滾 revert commit。

## Open Questions

(none)
