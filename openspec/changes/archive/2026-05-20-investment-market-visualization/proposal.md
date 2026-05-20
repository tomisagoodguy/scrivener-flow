## Why

投資模組的 `/investment/sectors` 目前僅提供列表式排行，代書（或交易人）在決定 ETF 是否加碼前，需要兩個關鍵視角：「市場結構長什麼樣子（哪些族群最重、漲跌分佈）」以及「這波上漲是全面性還是少數權值帶動」。這兩項資訊目前無法在 Web App 取得，必須切換到外部工具查詢。

## What Changes

- `/investment/sectors` 頁面新增「熱力圖」分頁，顯示以族群分組、市值加權、漲跌幅著色的台股全市場 Treemap
- 新增 `/investment/breadth` 頁面，顯示大盤騰落指標（ADL）與騰落比（ADR）折線圖，輔助判斷市場廣度是否健康
- ETF Pipeline 新增兩個輔助步驟：每日計算並儲存 Treemap 個股快照與 ADL 數據至 Supabase

## Capabilities

### New Capabilities

- `sector-treemap-view`: `/investment/sectors` Treemap 分頁，依族群（industry）分組、市值大小決定方塊面積、日漲跌幅著色（台股紅漲綠跌），資料來源為 Supabase `market_treemap_daily` 表
- `market-breadth-indicator`: `/investment/breadth` 頁面，展示 ADL 累積騰落線（含 MA5/MA60）與 ADR 騰落比走勢，資料來源為 Supabase `market_breadth_daily` 表

### Modified Capabilities

（無需修改現有 spec 的行為要求，僅新增頁面與資料表）

## Impact

- Affected specs: `sector-treemap-view`（新建）、`market-breadth-indicator`（新建）
- Affected code:
  - New: `src/app/investment/sectors/components/SectorTreemap.tsx`
  - New: `src/app/investment/breadth/page.tsx`
  - New: `src/app/investment/breadth/components/AdlChart.tsx`
  - New: `src/app/actions/getTreemapData.ts`
  - New: `src/app/actions/getAdlData.ts`
  - New: `ETF/pipeline/steps/sync_treemap_step.py`
  - New: `ETF/pipeline/steps/sync_adl_step.py`
  - New: `supabase/migrations/<timestamp>_add_market_visualization_tables.sql`
  - Modified: `src/app/investment/sectors/page.tsx`
  - Modified: `ETF/pipeline/orchestrator.py`
