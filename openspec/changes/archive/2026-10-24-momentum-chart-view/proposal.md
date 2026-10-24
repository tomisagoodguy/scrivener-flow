## Why

同步加碼頁（/investment/momentum）目前只有卡片網格與 200px 迷你 K 線，看不出加碼前後的完整走勢、均線、融資與法人籌碼，使用者得逐支點進個股頁才能判斷。策略選股中心已有成熟的裸K六面板捲動圖表視角，可以直接沿用，讓同步加碼股也能連續看盤。

同時，裸K快照只替「自選股 + 當日策略股」計算且上限 50 支；同步加碼股（預設窗口實測 69 支，與策略股僅重疊 20 支）多數沒有快照。而策略股本身已達 83 支，現行上限早已截斷約 33 支策略股，策略圖表頁也受影響。

## What Changes

- 同步加碼頁新增「卡片 / 圖表」視角切換，以 `view=chart` 查詢參數驅動，並與既有的 `window`、`min_count` 篩選參數並存。
- 圖表視角沿用策略頁的連續捲動裸K圖表（ScrollChartViewer + BareKSlideContent），快照查詢沿用 getStrategySnapshots。
- 每支股票的標籤顯示有加碼的 ETF 與窗口淨加碼張數（diff_shares ÷ 1000），例如「00981A +320張」。
- K 線上以 markerDates 標記窗口內的加碼日（各加碼 ETF 當日 diff_shares 合計 > 0 的日期）。
- 標題列額外顯示「N 家同步・權重 +x.xxpp」。
- getWindowMomentum 回傳的每支股票新增 `accumulationDates` 欄位，作為 markerDates 的資料來源。
- ETF Pipeline 的 SyncBareKStep 額外納入預設窗口（5 個交易日、≥ 2 家）的同步加碼股，排序為自選股 → 策略股 → 同步加碼股並去重；`MAX_STOCKS` 由 50 調高為 200。
- 沒有快照的股票顯示既有的佔位卡訊息。

## Capabilities

### New Capabilities

- `momentum-chart-view`: 同步加碼頁的圖表視角，包括視角切換、連續裸K圖表、加碼 ETF 標籤、加碼日標記與標題列摘要。

### Modified Capabilities

- `strategy-signal-compute`: SyncBareKStep 的同步名單納入同步加碼股，`MAX_STOCKS` 上限調整為 200。

## Impact

- Affected specs: `momentum-chart-view`（新增）、`strategy-signal-compute`（修改）
- Affected code:
  - New:
    - src/app/investment/momentum/components/MomentumChartViewer.tsx
    - src/app/investment/momentum/components/MomentumViewToggle.tsx
    - src/__tests__/lib/momentumChartSlides.test.ts
    - ETF/tests/test_sync_bare_k_step.py
  - Modified:
    - src/app/investment/momentum/page.tsx
    - src/app/actions/getWindowMomentum.ts
    - src/lib/investment/windowMomentumUtils.ts
    - ETF/pipeline/steps/sync_bare_k_step.py
- 執行成本：每日 pipeline 的裸K快照計算量最多由 50 支增加到 200 支（以目前資料約 132 支）。
