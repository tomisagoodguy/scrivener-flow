## Why

策略監控視角（`?view=monitor`）目前只顯示小型摘要卡片，使用者必須逐支點入才能看到 K 線圖；想要一口氣瀏覽所有策略股的完整圖表，需要在策略頁直接提供連續捲動的裸K圖表視角。

## What Changes

- 策略選股頁新增第三個視角切換：**圖表**（`?view=chart`）
- 圖表視角重用 `BareKScrollViewer` 元件，以連續捲動方式展示所有策略股的六面板裸K圖表
- ETF Pipeline 的 `SyncBareKStep` 額外納入 `strategy_signals` 最新一批策略股，確保圖表資料已同步至 `bare_k_snapshots`
- 策略股若當日尚無快照，顯示「裸K資料尚未同步」佔位提示

## Capabilities

### New Capabilities

- `strategy-chart-view`: 策略選股頁圖表視角，以裸K連續捲動方式展示所有策略股

### Modified Capabilities

- `strategy-signal-compute`: `SyncBareKStep` 額外同步 strategy_signals 策略股到 bare_k_snapshots

## Impact

- Affected specs: `strategy-chart-view`（新）, `strategy-signal-compute`（修改：新增策略股同步邏輯）
- Affected code:
  - Modified: `src/app/investment/strategy/page.tsx`
  - Modified: `ETF/pipeline/steps/sync_bare_k_step.py`
  - New: `src/components/features/strategy/StrategyChartViewer.tsx`
