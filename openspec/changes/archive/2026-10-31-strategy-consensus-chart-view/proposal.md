## Why

`/investment/strategy` 的「多策略共選」面板只能用列表或矩陣看共選股；`?view=chart` 圖表頁顯示的是全部策略股，篩選列只有「單一策略」與「均線發散型態」，無法只看「被 ≥N 個策略同時選中」的股票。使用者想逐檔看共選股的裸K走勢，目前只能在兩頁之間手動對照。

## What Changes

- 共選面板的檢視切換由「列表 / 矩陣」擴充為「列表 / 矩陣 / 圖表」，「圖表」設定 URL 參數 `cview=chart`，保留 `cmin`、`cwin`。
- `cview=chart` 時，面板下方以既有 `ScrollChartViewer` 連續捲動顯示共選股的裸K圖，股票集合與順序和列表完全相同（同一份 `consensusStocks`，共選數多者在前），最新模式與近 N 天模式（`cwin=7/14/30`）都適用。
- 每段圖表標頭顯示該股的共選策略數與策略簡稱；近 N 天模式另顯示最後選中日期。
- 裸K快照沿用 `LazyBareKSlide` 按需載入（段落在視窗內停留 300ms 才請求、一生只請求一次），伺服器端不預先查快照。
- 圖表模式下策略視角只保留共選面板與圖表，隱藏策略分析面板與各策略卡片，避免長捲動圖表後面還接一大段卡片。
- `parseConsensusParams` 接受 `cview=chart`；無法辨識的值仍回退 `list`。

## Non-Goals

- 不改動既有 `?view=chart`（全部策略股圖表）與它的篩選列。
- 不新增均線發散型態篩選或其他篩選條件到共選圖表。
- 不改變共選股的計算規則（門檻、時間窗、排序）。
- 不新增資料表、Server Action 或 pipeline 步驟。

## Capabilities

### New Capabilities

- `strategy-consensus-chart-view`: 多策略共選的連續捲動裸K圖表檢視（股票集合、標頭資訊、按需載入快照、空狀態、圖表模式下的頁面版面）。

### Modified Capabilities

- `strategy-consensus-matrix`: 「Consensus matrix view toggle」需求的切換選項由列表/矩陣擴充為列表/矩陣/圖表，`cview` 可接受 `chart`。

## Impact

- 受影響 specs：新增 strategy-consensus-chart-view；修改 strategy-consensus-matrix。
- 受影響程式碼：
  - src/lib/investment/strategyConsensusUtils.ts（`ConsensusView` 型別、`parseConsensusParams`、共用的 URL 組裝函式）
  - src/components/features/strategy/ConsensusControls.tsx（新增「圖表」選項）
  - src/components/features/strategy/MultiStrategyConsensusPanel.tsx（`cview=chart` 時渲染圖表）
  - src/components/features/strategy/ConsensusChartViewer.tsx（新檔：包 `ScrollChartViewer` + `LazyBareKSlide`）
  - src/app/investment/strategy/page.tsx（圖表模式下隱藏分析面板與策略卡片）
  - 對應測試：src/__tests__/lib/buildMultiConsensusStocks.test.ts、src/__tests__/components/MultiStrategyConsensusPanel.test.tsx，以及新元件測試
- 無資料庫、API 或相依套件變更。
