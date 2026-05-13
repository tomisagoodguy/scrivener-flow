## Why

`integrate-tw-active-research-tools` 已將五個研究指標（揭露日異常成交量、持股重疊度、年化隱成本、配對實證、AUM 累計申購）寫入 Supabase，但前端目前無任何頁面呈現這些數據，研究洞察無法被使用者看見。

## What Changes

- 新增 `/investment/frontrunning` 頁面：揭露日異常成交量事件瀏覽（可按 ETF / 股票篩選，顯示 r_t0/r_t1/r_t2 異常量比率）
- 新增 `/investment/active-share` 頁面：11 支 ETF 兩兩持股重疊度熱力圖矩陣
- 新增 `/investment/manager-drag` 頁面：各 ETF 年化 excess_volume / manager_drag 長條圖
- 新增 `/investment/matched-pairs` 頁面：主動/被動 ETF 同股加碼配對比較表，含 diff_median 正負判讀

## Non-Goals

- 不修改現有 ETF 持股監控頁（`/investment/[etf]`）
- 不新增前端資料寫入邏輯（資料全部來自 Pipeline 已寫入的 DB 表）
- 不建 AUM 累計申購獨立頁（cumulative_inflow_yi 留給後續 AUM 儀表板 change）
- 不建 LINE 通知整合

## Capabilities

### New Capabilities

- `etf-frontrunning-dashboard`: 揭露日異常成交量事件表，支援 ETF / 股票篩選，顯示 r_t0/r_t1/r_t2
- `etf-active-share-matrix`: ETF 持股重疊度熱力圖，數值越高表示兩 ETF 越相似
- `etf-manager-drag-chart`: 各 ETF 年化隱成本長條圖（excess_volume + manager_drag，單位千股/億元AUM）
- `etf-matched-pairs-table`: 主動/被動 ETF 同股加碼配對表，顯示 diff_median 與勝率摘要

### Modified Capabilities

（無）

## Impact

- Affected specs: etf-frontrunning-dashboard（新）、etf-active-share-matrix（新）、etf-manager-drag-chart（新）、etf-matched-pairs-table（新）
- Affected code:
  - New:
    - `src/app/investment/frontrunning/page.tsx`
    - `src/app/investment/active-share/page.tsx`
    - `src/app/investment/manager-drag/page.tsx`
    - `src/app/investment/matched-pairs/page.tsx`
    - `src/app/actions/getEtfFrontrunningEvents.ts`
    - `src/app/actions/getEtfActiveShare.ts`
    - `src/app/actions/getEtfManagerDrag.ts`
    - `src/app/actions/getEtfMatchedPairs.ts`
  - Modified:
    - `src/components/layout/SideNav.tsx`
