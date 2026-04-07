## Why

ETF 持倉歷史圖表需要滑鼠懸停才能讀取數值，無法一眼掌握各 ETF 的現況。在圖表上方加入統計摘要卡片，讓使用者不看圖就能知道每支 ETF 的最新排名、權重與近期趨勢方向。

## What Changes

- 在 `EtfWeightHistoryChart` 的圖表上方新增一排摘要卡片（一個 ETF 一張）
- 每張卡片顯示：ETF 代碼、ETF 名稱（縮短）、最新排名（排名模式）或最新權重%（權重模式）、相比前一期的變化量、趨勢方向 icon（↑ / ↓ / →）
- 卡片跟隨 `viewMode` 切換自動更新顯示內容（排名 or 權重）
- 無資料的 ETF 不顯示卡片

## Capabilities

### New Capabilities
- `etf-holding-summary-cards`: 圖表上方的 ETF 持倉摘要卡片列，顯示最新值與趨勢，跟隨 viewMode 動態切換

### Modified Capabilities
（無）

## Impact

- 僅修改 `src/components/features/investment/EtfWeightHistoryChart.tsx`
- 不新增 API、不改資料結構、不影響其他頁面
