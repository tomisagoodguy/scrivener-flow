## Why

籌碼排行榜目前僅顯示「400張以上大戶」的持股比例變化，無法區分中型大戶（200–400張）與超大戶（1000張以上）的行為差異；且欄位標題不可點擊，無法依其他維度（股東數、股東變化、投信五日、成交額）重新排序。加入多級大戶分析與欄位排序，讓使用者能從不同角度解讀籌碼動向。

## What Changes

- 新增 `mid_holder_pct` / `mid_holder_pct_change` 欄位（200張以上，tier >= 11）到 `equity_distribution_stats` 資料表
- 新增 `whale_holder_pct` / `whale_holder_pct_change` 欄位（1000張以上，tier >= 15）到 `equity_distribution_stats` 資料表
- `sync_equity_distribution.py` 同步計算並儲存三個級距的持股比例與週變化
- 前端籌碼排行頁（`/investment/equity`）新增三層大戶分析切換，預設顯示 400張+
- 所有欄位標題（股東數、股東變化、大戶持股變化、投信五日、成交額）可點擊排序，支援升冪/降冪切換，以 `?sort=` URL param 實作

## Non-Goals

- 不新增 tier 15 以上的進一步細分（FinLab inventory 資料僅到 tier 15，無更細分級）
- 不改動散戶出逃排行（`shareholders_change_rate`）邏輯
- 不修改 LINE 通知與 AI 報告的大戶閾值（維持 400張+ 作為 `💎` 標記基準）

## Capabilities

### New Capabilities

- `equity-multi-tier`: 大戶持股三級距（200張+、400張+、1000張+）的週變化計算、儲存與前端切換顯示
- `equity-column-sort`: 籌碼排行頁所有欄位可點擊排序（升冪/降冪），以 `?sort=<column>&dir=asc|desc` URL param 控制

### Modified Capabilities

(none)

## Impact

- Affected specs: `equity-multi-tier`（新增）、`equity-column-sort`（新增）
- Affected code:
  - New: `supabase/migrations/20260512000000_equity_multi_tier.sql`
  - Modified: `ETF/sync_equity_distribution.py`
  - Modified: `src/app/investment/equity/page.tsx`
