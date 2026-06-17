## Why

投資儀表板的每日資金流頁面（`DailyFlowPanel`）目前只能看到「個股流入 / 個股流出 / 分 ETF 小計」三個維度，缺少「產業」這一層彙總。代書與投資使用者要判斷主動 ETF 當日的資金輪動方向（例如「被動元件進、半導體出」），必須自己心算把幾十檔個股歸到產業，效率低且容易遺漏。已用真實 `etf_flow_daily`（2026-06-16）做過 PoC，證實把個股流向 join FinLab `security_industry_themes` 後可清楚呈現產業資金輪動，且個股對照覆蓋率 100%。

## What Changes

- 在 `etf_flow_daily` 新增 `by_sector` jsonb 欄位，儲存當日產業資金流彙總（母題材聚合 + 子題材明細的兩層結構）。
- `SectorStrengthStep` 在既有的 `security_industry_themes` 抓取流程中，額外把 `stock_id → [母題材, 子題材...]` 對照寫入 `PipelineContext`，供下游步驟共用（避免重複呼叫 FinLab VIP 配額）。
- `FlowComputeStep` 讀取 context 的產業對照，把當日 `inflow` / `outflow` 個股依母題材聚合（淨流入、流入、流出、流入檔數、流出檔數），並在母題材底下保留子題材明細；結果寫入 `by_sector`。產業對照缺席（FinLab 未登入或步驟 skip）時，`by_sector` 寫空物件，不影響既有 `inflow` / `outflow` / `by_etf` / `totals` 的計算。
- 前端 `DailyFlowPanel` 新增「產業總覽」分頁：預設只列母題材（按淨流入排序），每列可展開顯示其子題材明細。沿用台股色彩慣例（紅漲綠跌 → 淨流入紅、淨流出綠）。
- 一檔股票可屬多個母題材，故各母題材金額加總會大於個股總額；此為預期行為，UI 需明確標示「依題材歸類，個股可重複計入」。

## Non-Goals

- 不修改 `etf_flow_daily` 既有欄位（`inflow` / `outflow` / `by_etf` / `totals`）的計算邏輯與過濾門檻。
- 不回填（backfill）歷史 `by_sector`；僅從上線後的交易日開始計算。歷史日期該欄位為 NULL，前端對 NULL 顯示「無產業資料」。
- 不新增獨立的產業資金流路由頁；功能掛在現有 `DailyFlowPanel` 之下。
- 不改動 `sector_strength` / `sector_strength_stocks` 表或族群強弱頁的既有行為。
- 不採用「單一主產業（互斥分類）」方案；本次依使用者決議使用 FinLab 多題材階層分類。

## Capabilities

### New Capabilities

- `sector-fund-flow-pipeline`: 後端 pipeline 計算每日產業資金流（context 共用產業對照、`FlowComputeStep` 彙總 `by_sector`、migration 新增欄位）。
- `sector-fund-flow-web`: 前端 `DailyFlowPanel` 的「產業總覽」分頁，母題材列表 + 子題材展開。

### Modified Capabilities

(none)

## Impact

- Affected specs: 新增 `sector-fund-flow-pipeline`、`sector-fund-flow-web` 兩個 capability。
- Affected code:
  - New:
    - supabase/migrations/20260617120000_add_etf_flow_by_sector.sql
  - Modified:
    - ETF/pipeline/context.py
    - ETF/pipeline/steps/sector_strength_step.py
    - ETF/pipeline/steps/flow_compute_step.py
    - src/components/features/investment/DailyFlowPanel.tsx
  - Removed: (none)
