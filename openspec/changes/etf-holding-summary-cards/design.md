## Context

`EtfWeightHistoryChart.tsx` 目前只有折線圖，使用者必須懸停才能讀取數值。圖表支援兩種 viewMode（`rank` / `weight`），資料結構為 `Record<string, WeightHistoryEntry[]>`，每個 ETF 有按日期排序的歷史陣列。

## Goals / Non-Goals

**Goals:**
- 在圖表上方加入一排摘要卡片，每個有資料的 ETF 顯示一張
- 卡片隨 `viewMode` 切換，顯示最新排名或最新權重%
- 相比前一期的變化量與方向 icon（↑ / ↓ / →）

**Non-Goals:**
- 不新增 API 或資料結構
- 不做卡片點擊互動（此版本）
- 不改變圖表本身行為

## Decisions

**1. 計算邏輯放在 render 時直接從 data 派生，不用 useMemo**

資料量小（最多 11 個 ETF × N 天），直接從 prop 計算即可，不需要額外 state 或 memo。每次 viewMode 切換重新計算，邏輯簡單清楚。

**2. 卡片排列用 flex-wrap，不用固定欄數 grid**

ETF 數量從 1 到 11 不固定，flex-wrap 可自然換行適應，不會出現空白欄位。

**3. 趨勢判斷閾值：rank 差 ≥ 1、weight 差 ≥ 0.05% 才顯示升降，否則為持平（→）**

排名整數，差 1 才有意義；權重浮點數，設 0.05% 防止雜訊閃爍。

**4. 卡片樣式用 glass-card 系統類別**

與頁面其他區塊統一，`bg-white/65 backdrop-blur border-white/50`。

## Risks / Trade-offs

- [資料為空] 若某 ETF 只有 1 筆資料，無法計算前期差值 → 變化量欄位顯示 `—`
- [顏色對比] 使用 ETF 配色作為卡片左側 border，部分顏色（黃、淺綠）在白底上對比不足 → 接受，與圖例顏色一致優先於對比度
