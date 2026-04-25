## Context

「歷史軌跡」tab 現有 `RankingTrendChart`（Recharts LineChart），追蹤 Top N 持股的排名變化。資料來源是 `etf_holdings_snapshot`，每次 pipeline 執行後寫入一筆，已有數個月的歷史記錄。

tw-active preview 的格狀 sparkline 設計可讓使用者一次掃描所有持股的比重走勢，快速識別持續加碼或衰退的標的，資訊密度遠高於目前的大折線圖。

## Goals / Non-Goals

**Goals:**
- 在「歷史軌跡」tab 右上角加切換按鈕（折線圖 / Sparkline 格狀）
- 新增 `HoldingSparklineGrid` 元件，每支持股一張比重 % sparkline 卡片
- 每張卡片顯示：代碼、名稱、當前比重、peak 比重、追蹤天數、目前排名
- 時間範圍篩選（近 3 個月 / 近 6 個月 / 全部），同時作用於兩種檢視
- 卡片排序選項：依當前比重（預設）/ 依 peak 比重 / 依追蹤天數

**Non-Goals:**
- 不修改 `RankingTrendChart` 折線圖邏輯
- 不新增 DB 欄位或 API Route（純前端聚合）
- 不支援個股點擊跳轉（此版本）

## Decisions

### 1. 資料傳遞方式：沿用現有 `rankingHistory` prop

`DrilldownTabs` 已收到 `weightHistory` ReactNode（已算好的 `RankingTrendChart`）。改為傳入原始 data，讓 `DrilldownTabs` 內部在 history tab 做切換。

**替代方案**：在 Server Component 再多查一次。**選擇沿用**：`getRankingHistory()` 回傳的 `data_date + stock_code + weight` 已足夠，不需額外查詢。

需調整 `DrilldownTabs` 的 `weightHistory` prop 型別，從 `ReactNode` 改為接受原始資料，在 Client Component 內決定渲染哪個元件。

### 2. Sparkline 實作：Recharts `AreaChart`（mini）

使用已安裝的 Recharts，`AreaChart` 去掉 Axis / Tooltip / Legend，純視覺輪廓。寬高固定（約 120×40px），`ResponsiveContainer` 自適應卡片寬度。

**替代方案**：純 SVG 手刻。**選擇 Recharts**：維護成本低，與現有元件風格一致。

### 3. 時間範圍篩選：前端 filter（不重新 fetch）

從已有的 `rankingHistory` 資料在前端依日期過濾，避免額外網路請求。

3 個月 = 最近 90 天，6 個月 = 最近 180 天，全部 = 不過濾。

### 4. 卡片格狀布局

`grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5`，與 tw-active 類似密度。

## Risks / Trade-offs

- [資料稀疏] Pocket.tw ETF 數天才一筆，sparkline 線段會不連續 → `connectNulls` 接線，間距大時視覺上可接受
- [型別重構] `weightHistory` prop 從 ReactNode 改為原始資料需同步修改 `[etf]/page.tsx` → 改動範圍小，可控

## Migration Plan

1. 修改 `DrilldownTabs` props 介面（`weightHistory` 改為 `historyData`）
2. 新增 `HoldingSparklineGrid` 元件
3. 更新 `[etf]/page.tsx` 傳入 `historyData={rankingHistory}`
4. 無需 DB migration，無需環境變數
