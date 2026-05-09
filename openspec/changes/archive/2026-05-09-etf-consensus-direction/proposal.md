## Why

目前 `etf_stock_overlap` 只統計「有幾支 ETF 持有某股票」（持有數量），無法區分最近各 ETF 是在同步加碼還是同步減碼。加入方向性共識欄位後，前端「經理人共識持股」頁面可即時顯示「X 支 ETF 同步加碼」，讓使用者在靜態持倉的基礎上看到動態籌碼訊號。

## What Changes

- `ETF/pipeline/steps/overlap_compute_step.py`：計算完 overlap 後，額外查詢最近 7 天的 `etf_diff_logs`，統計每支股票的 `consensus_buy_count`（change_type IN ('BUY','IN')）與 `consensus_sell_count`（change_type IN ('SELL','OUT')），閾值為 `abs(diff_weight) >= 0.05pp`
- `supabase/migrations/`：新增 migration，為 `etf_stock_overlap` 加入 `consensus_buy_count INTEGER DEFAULT 0` 與 `consensus_sell_count INTEGER DEFAULT 0` 兩欄
- `ETF/processors/diff_engine.py`：新增常數 `CONSENSUS_WEIGHT_THRESHOLD = 0.05`，供 overlap step 引用，與現有的 `WEIGHT_CHANGE_THRESHOLD = 0.10` 各自獨立
- `src/app/investment/consensus/page.tsx`：在共識持股表格新增「同步加減碼」欄，以 rose（加碼）/ emerald（減碼）色塊呈現 `consensus_buy_count` / `consensus_sell_count`，並補充 `OverlapRow` 介面的型別定義

## Non-Goals

- 不修改 `diff_engine.py` 中現有的 `WEIGHT_CHANGE_THRESHOLD`（0.10pp 仍作為 per-ETF `is_significant` 判斷基準）
- 不新增排程或獨立 Pipeline 步驟；共識計算在 `OverlapComputeStep.execute()` 末段串接，不拆分步驟
- 不更動其他前端頁面（`[etf]/page.tsx`、`stock/[code]/page.tsx` 等）的現有顯示邏輯

## Capabilities

### New Capabilities

- `etf-consensus-direction`: 在 `etf_stock_overlap` 計算並持久化「最近 7 天跨 ETF 同步加碼/減碼數量」，並在前端共識持股頁面展示方向性籌碼訊號

### Modified Capabilities

（none）

## Impact

- Affected specs: `etf-consensus-direction`（新規格）
- Affected code:
  - New: `supabase/migrations/20260509000000_add_consensus_counts_to_overlap.sql`
  - Modified: `ETF/pipeline/steps/overlap_compute_step.py`
  - Modified: `ETF/processors/diff_engine.py`
  - Modified: `src/app/investment/consensus/page.tsx`
