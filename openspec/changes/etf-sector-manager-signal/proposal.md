## Why

族群強弱頁面（`/investment/sectors`）已可顯示各族群的強弱排名與成分股漲幅，但缺乏主動式 ETF 經理人的動向資訊。當一個族群既是強勢族群、又有多位 ETF 經理人在同期加碼，這個信號更具參考價值。現有資料庫已有 `etf_stock_overlap.consensus_buy_count`（7 日內加碼 ETF 支數，>= 0.05pp）與 `etf_diff_logs`（詳細買進紀錄），可直接利用，毋需額外 Pipeline 步驟。

## What Changes

- 新增 Server Action `getEtfSectorActivity`：查詢近 14 天 `etf_diff_logs`（BUY/IN，`abs(diff_weight) >= 0.05`），對應 `sector_strength_stocks`，彙整為「族群 → 買進中的 ETF 代碼清單 + 涉及股票清單」
- 族群列標題顯示 ETF 經理人標籤（issuer 短名，如「統一」「野村」），最多顯示 3 個，超出則顯示「+N」
- 展開成分股時，被 ETF 加碼的個股顯示 ETF 標籤（如「統一 野村」）
- 族群排序新增「ETF買」模式（Tab）：依「族群內被買進股票數」降序

## Non-Goals

- 不新增後端 Pipeline 步驟，僅前端查詢既有資料
- 不顯示減碼（SELL/OUT）訊號
- 不修改 `etf_stock_overlap` 表格 schema（`consensus_buy_count` 已存在）

## Capabilities

### New Capabilities

- `etf-sector-manager-signal`: 在族群強弱頁面疊加主動式 ETF 經理人加碼訊號

### Modified Capabilities

- `sector-strength-web`: 新增「ETF買」排序模式與每列 ETF 標籤顯示

## Impact

- Affected specs: `etf-sector-manager-signal`（新建）、`sector-strength-web`（修改）
- Affected code:
  - New: `src/app/actions/getEtfSectorActivity.ts`
  - Modified: `src/app/investment/sectors/page.tsx`
  - Modified: `src/app/investment/sectors/SectorDashboard.tsx`
