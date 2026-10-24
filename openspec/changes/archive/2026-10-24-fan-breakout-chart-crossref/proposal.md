## Why

均線發散候選頁（`/investment/strategy/fan-breakout`）有完整的篩選、績效欄與「均線 + 入選日標記」K 線，但一次只能看一張圖、要按「上一檔／下一檔」切換；策略圖表頁（`/investment/strategy?view=chart`）有連續捲動、固定子導覽列、右側跳轉點與懶載入，但不能篩選、策略標籤顯示原始 id，也看不到均線發散的入選脈絡。兩頁的長處正好互補，整合後看圖選股可以「先篩、再連續看」。

## What Changes

- 共用捲動檢視器 `BareKScrollViewer` 改為可替換「每格內容」與「標題附加資訊」，並支援以回呼取代返回連結；裸K看盤頁與策略圖表頁維持原有預設行為。
- 均線發散候選頁新增「表格／連續看圖」切換：連續看圖以「篩選後、同一股票只取最新訊號列」的清單餵給捲動檢視器，每格為現有 `StockChart`（MA5/10/20/60/120 + 近 120 日入選日標記），標題顯示訊號日、spread、首次／再次、連續入選天數、訊號後報酬（台股紅漲綠跌）。
- 策略圖表頁新增篩選列：依策略（全部／單一策略，附檔數）與均線發散訊號型態（全部／首次／再次）過濾；每張圖的策略標籤改顯示中文策略名稱。
- 策略圖表頁中屬於「均線發散最新訊號日候選」的股票，標題額外顯示 spread／連續天數／首次或再次，K 線面板疊上近 120 日入選日標記。

## Capabilities

### New Capabilities

- `fan-breakout-continuous-view`: 均線發散候選頁的連續看圖模式（模式切換、去重規則、每格圖表與標題資訊、篩選變更時的重置行為）

### Modified Capabilities

- `strategy-chart-view`: 新增篩選列、中文策略標籤、均線發散候選的標題資訊與入選日標記（既有需求不變）

## Impact

- Affected specs: `fan-breakout-continuous-view`（新）、`strategy-chart-view`（新增需求）
- 依賴：`fan-breakout-screener` change（15/15 已實作、尚未歸檔）提供的 `getFanBreakoutSignals()` 與 `src/lib/investment/fanBreakout.ts`；本 change 歸檔前應先歸檔 `fan-breakout-screener`
- 不需要 DB schema 變更、不需要改 ETF Pipeline
- Affected code:
  - New:
    - src/components/features/strategy/FanBreakoutContinuousView.tsx
    - src/components/features/strategy/FanBreakoutSlideChart.tsx
    - src/components/features/strategy/StrategyChartFilterBar.tsx
    - src/components/features/investment/ScrollChartViewer.tsx
    - src/components/features/investment/ScrollChartSubNav.tsx
    - src/components/features/investment/BareKSlideContent.tsx
    - src/components/features/investment/__tests__/ScrollChartViewer.test.tsx
    - src/components/features/investment/__tests__/BareKChartPanels.test.ts
    - src/components/features/strategy/__tests__/StrategyChartViewer.test.tsx
    - src/lib/investment/__tests__/strategyUtils.test.ts
  - Modified:
    - src/components/features/investment/BareKScrollViewer.tsx
    - src/components/features/investment/BareKChart.tsx
    - src/components/features/investment/BareKChartPanels.ts
    - src/components/features/strategy/StrategyChartViewer.tsx
    - src/components/features/strategy/FanBreakoutScreener.tsx
    - src/components/features/strategy/FanBreakoutChartPanel.tsx
    - src/components/features/strategy/useFanBreakoutScreener.ts
    - src/components/features/strategy/__tests__/FanBreakoutScreener.test.tsx
    - src/lib/investment/fanBreakout.ts
    - src/lib/investment/__tests__/fanBreakout.test.ts
    - src/lib/investment/strategyUtils.ts
    - src/app/investment/strategy/page.tsx
  - Removed: (none)
