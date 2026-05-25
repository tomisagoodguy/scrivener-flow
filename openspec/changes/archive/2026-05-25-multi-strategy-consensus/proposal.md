## Why

策略選股頁目前每個策略各自呈現，使用者無法一眼判斷哪支股票同時被多個策略點名——而多策略共選往往代表更高的訊號強度。

## What Changes

- 在「策略視角」頁面最上方新增「多策略共選」區塊，顯示命中 ≥ 2 個策略的股票
- 每筆股票顯示：代碼、名稱、命中策略數 badge、族群標籤、ETF 持有 badge、00981A 加/減/持倉狀態
- 無跨策略共選時隱藏該區塊，不影響現有策略卡片版面

## Non-Goals

- 不新增 DB 查詢或 Server Action，資料全部來自現有 `getStrategySignals()` 回傳值
- 不修改監控清單 / 圖表視角（`view=monitor`, `view=chart`）
- 不變更策略卡片本身的呈現邏輯

## Capabilities

### New Capabilities

- `strategy-multi-consensus-panel`: 在策略視角頁最上方呈現多策略共選股票的橫向面板

### Modified Capabilities

（無）

## Impact

- Affected specs: strategy-multi-consensus-panel（新建）
- Affected code:
  - New: `src/components/features/strategy/MultiStrategyConsensusPanel.tsx`
  - Modified: `src/app/investment/strategy/page.tsx`
