## Context

個股頁目前已有 `etfWeightHistory`（ETF 持倉走勢圖），但沒有損益視角。ETF 頁有持倉列表但無單股進出場分析。

相關資料表：
- `etf_weight_history`：每日持股股數（`shares` bigint）、權重、排名，pipeline 自 2025-05 起每日 upsert
- `stock_prices_daily`：每日收盤價，由 `SyncOHLCVStep` 維護
- `etf_diff_logs`：加減碼事件（`change_type`、`prev_shares`、`curr_shares`、`data_date`）

Reference 實作（`tw-active/tools/preview_build.py`）在本地 JSON 上算損益，我們改為在 Server Action 對 Supabase 即時查詢。

## Goals / Non-Goals

**Goals:**
- 個股頁顯示所有持倉 ETF 的損益摘要卡片 + P&L 曲線
- ETF 頁新增「單股進出場」tab，含選股列表、損益卡片、股數/股價雙軸圖、事件時間軸
- 損益計算與 reference 公式對齊（CF = -Δshares × close）

**Non-Goals:**
- 不補回 pipeline 開始前的歷史（資料起算日前的成本不計算，卡片顯示免責說明）
- 不建立新的 DB 表（直接查詢現有 `etf_weight_history` + `stock_prices_daily`）
- 不做即時股價（用 `stock_prices_daily` 最新一筆，非 WebSocket）

## Decisions

### 1. 計算位置：Server Action，不用 RPC

**選擇**：在 Server Action 用 JS 逐步計算，不寫 PL/pgSQL。

**理由**：邏輯複雜（需 carry-forward shares、對齊日期軸），JS 更易維護與 debug；資料量不大（單股 × 單 ETF 約 200-400 筆）。

**替代方案**：Supabase RPC — 彈性差，schema 改動需 migration。

> **實作演進（2026-05）**：`computeStockPnl`（ETF 頁單股進出場 tab）維持即時 CF 計算（含已實現損益）；但個股頁的 `getStockManagerPnl` 已改讀 `etf_position_summary` 預計算表（PositionSummaryStep 產出，以現有部位平均成本計算未實現損益），兩者口徑不同屬刻意設計。個股頁驗證比對對象為 `etf_position_summary`，非 CF 公式。

---

### 2. 資料查詢策略：兩次查詢合併

```
Query 1: etf_weight_history WHERE stock_code = ? ORDER BY etf_code, data_date ASC
Query 2: stock_prices_daily WHERE stock_code = ? ORDER BY date ASC
```

在記憶體中對齊日期軸，用 `close_on_or_before` 策略填補無收盤價的日子（與 reference 一致）。

---

### 3. P&L 曲線精度

曲線資料以整數億元（`round(value / 1e8, 2)`）傳給前端，減少 JSON 大小。

---

### 4. ETF 頁 tab 實作

在現有 ETF 頁加入第三個 tab「單股進出場」，使用 URL query param `?tab=stock-trade` 維持可書籤化狀態。左側選股列表依報酬率降序排列（虧損 ETF 排最後），右側為選定個股的完整視圖。

---

### 5. 資料起算日免責

`etf_weight_history` 最早一筆 = `minDate`，卡片底部顯示：  
`「損益計算自 {minDate} 起，早於此日的成本未納入」`

## Risks / Trade-offs

- **[Stock 無 prices 資料]** → 顯示「N/A — 無收盤價資料」，不崩潰
- **[etf_weight_history.shares 為 null]** → 少數 ETF 爬蟲不回傳股數時，跳過 CF 計算，報酬率顯示 N/A
- **[查詢慢]** → 個股頁同時查多個 ETF 時可能 > 1s；用 `Promise.all` 並行查詢，加 loading skeleton

## Migration Plan

1. 無 DB schema 變動
2. 部署後個股頁自動出現新區塊，ETF 頁新增 tab
3. 若 Server Action 出錯，區塊顯示 fallback 訊息，不影響既有功能

## Open Questions

- `etf_diff_logs` 的 `change_type` 值集合需確認（ENTRY / ADD / REDUCE / EXIT / CLOSE 等），決定事件時間軸的 label 顯示
