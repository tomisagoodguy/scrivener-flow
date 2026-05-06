## Context

`DualAxisChart.tsx` 使用 `lightweight-charts` 的 `LineSeries` 顯示右軸收盤價。`computeStockPnl()` server action 從 `stock_prices_daily` 只查 `close`，回傳 `priceHistory: { time: string; value: number }[]`。`stock_prices_daily` 表已有 `open`、`high`、`low`、`close` 四欄，改用 CandlestickSeries 不需要任何 schema 異動。

## Goals / Non-Goals

**Goals:**

- 右軸改為 `CandlestickSeries`，資料結構變為 `{ time, open, high, low, close }`
- 遵守台股顏色慣例：上漲 K 棒為紅色（`#e11d48`），下跌 K 棒為綠色（`#059669`）
- server action 擴充查詢欄位（`open, high, low, close`）並更新回傳型別

**Non-Goals:**

- 不加 Volume 直方圖
- 不改左軸股數折線
- 不影響裸K看盤頁面

## Decisions

### D1：資料格式切換

`priceHistory` 型別從 `{ time: string; value: number }[]` 改為 `{ time: string; open: number; high: number; low: number; close: number }[]`。Server action 查詢補上 `open, high, low` 欄位。

### D2：CandlestickSeries 顏色（台股慣例）

```ts
upColor: '#e11d48',       // rose-700 — 上漲紅
downColor: '#059669',     // emerald-600 — 下跌綠
borderUpColor: '#e11d48',
borderDownColor: '#059669',
wickUpColor: '#e11d48',
wickDownColor: '#059669',
```

### D3：圖例更新

右軸圖例從「收盤價（右軸，元）」改為「K 線（右軸，元）」；marker 顏色與加減碼事件不變。

## Risks / Trade-offs

- `stock_prices_daily` 部分個股早期資料可能缺 `open/high/low`（欄位為 null），需前端 filter：`priceHistory.filter(d => d.open != null)`
- `lightweight-charts` v5 CandlestickSeries API 需確認 autoScale 在雙軸模式下仍正常（預期無問題，因右側 price scale 獨立）
