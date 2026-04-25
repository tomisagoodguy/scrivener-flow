## Why

「歷史軌跡」tab 目前只有一張大折線圖追蹤 Top N 持股的排名變化，無法一眼掃描所有持股的比重走勢輪廓。參考 tw-active 的 sparkline 格狀設計，每支股票一張獨立小圖，可快速識別比重持續攀升、震盪或衰退的標的。

## What Changes

- 「歷史軌跡」tab 新增**格狀 Sparkline 檢視模式**，與現有折線圖（排名走勢）以切換按鈕並存
- Sparkline 卡片顯示：比重 % 走勢曲線、當前比重、peak 比重、追蹤天數、目前排名
- 時間範圍篩選：近 3 個月 / 近 6 個月 / 全部（套用至 sparkline 與折線圖）

## Capabilities

### New Capabilities
- `etf-history-sparkline-view`：格狀 sparkline 檢視模式，每支持股一張比重 % 走勢小圖，含時間範圍篩選與排序（依比重 / 依 peak / 依追蹤天數）

### Modified Capabilities
- 無（`RankingTrendChart` 折線圖保留不動，僅新增切換按鈕）

## Impact

- **修改**：`src/components/features/investment/DrilldownTabs.tsx`（history tab 加切換按鈕）
- **新增**：`src/components/features/investment/HoldingSparklineGrid.tsx`（格狀 sparkline 元件）
- **資料來源**：現有 `etf_holdings_snapshot`（weight、data_date、stock_code、stock_name），不需新增 DB 欄位
- **依賴**：Recharts（已安裝）用於 sparkline LineChart
