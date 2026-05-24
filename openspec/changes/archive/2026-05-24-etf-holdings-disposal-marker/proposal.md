## Why

ETF 持股監控頁面目前無法識別 ETF 正在買進的股票是否處於分盤交易（處置）狀態。當主力 ETF 建倉某支處置股時，使用者若未發現，可能在不知情的情況下跟單，面臨流動性風險與額外成本。

## What Changes

- ETF Pipeline 新增處置股偵測步驟，每日查詢 FinLab `disposal_information`，判斷當日 ETF 持股中哪些正在處置期間
- 偵測結果寫入現有 `etf_holdings_snapshot` 欄位（新增 `is_disposal` 布林欄位），或以獨立 lookup table 形式存入 Supabase
- 前端 ETF 持股列表（`/investment/[etf]` 頁面）對處置股顯示醒目標記（紅色警示 badge）
- 前端個股詳情頁（`/investment/stock/[code]`）亦顯示處置狀態警示

## Capabilities

### New Capabilities

- `etf-disposal-detection`: Pipeline 步驟，每日偵測 ETF 持股中的處置股並持久化結果
- `etf-disposal-badge`: 前端 ETF 持股列表與個股頁面顯示處置狀態 badge

### Modified Capabilities

（無）

## Impact

- Affected specs: etf-disposal-detection（新）、etf-disposal-badge（新）
- Affected code:
  - New: `ETF/pipeline/steps/disposal_detect_step.py`
  - New: `supabase/migrations/<timestamp>_add_disposal_flag.sql`
  - Modified: `ETF/pipeline/orchestrator.py`
  - Modified: `src/app/investment/[etf]/page.tsx`
  - Modified: `src/app/investment/stock/[code]/page.tsx`
  - Modified: `src/types/index.ts`
