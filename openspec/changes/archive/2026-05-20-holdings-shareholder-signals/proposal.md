## Why

持股明細表（HoldingsTable）的「量化篩選」欄目前只顯示動能（M）、投信買賣超（T）、營收新高（R）三個指標，缺乏籌碼換手視角——特別是「大戶是否積累」與「散戶是否在減少持股」。這兩個訊號合用，正是 ETF 經理人追蹤強勢換手的核心依據。

## What Changes

- `equity_distribution_stats` 新增 `small_holder_pct`（tier ≤ 3，持股 < 10 張的散戶比例）與 `small_holder_pct_change`（週差值）兩個欄位
- `sync_equity_distribution.py` 計算 tier ≤ 3 的 `custody_ratio` 加總，寫入上述欄位（含歷史 backfill 支援）
- `quantFilters.ts` 查詢 `equity_distribution_stats` 最新一期，將 `big_holder_pct_change` 與 `small_holder_pct_change` 帶入 `QuantFilter`
- `HoldingRow.tsx` 量化篩選欄新增兩個 badge：💎（大戶增加）與 👤（散戶減少）

## Capabilities

### New Capabilities

- `shareholder-signal-badges`: 在 HoldingsTable 的量化篩選欄顯示大戶增減與散戶佔比變化兩個 badge，支援 tooltip 顯示具體數值

### Modified Capabilities

(none)

## Impact

- Affected specs: `shareholder-signal-badges`（新建）
- Affected code:
  - New: `supabase/migrations/20260520100000_add_small_holder_to_equity_dist.sql`
  - Modified: `ETF/sync_equity_distribution.py`
  - Modified: `src/lib/investment/quantFilters.ts`
  - Modified: `src/components/features/investment/HoldingRow.tsx`
