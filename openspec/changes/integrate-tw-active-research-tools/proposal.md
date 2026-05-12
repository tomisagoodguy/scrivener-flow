## Why

`reference/tw-active/tools/` 內有五個研究等級工具（frontrunning、active_share、cumulative_drag、matched_pairs、preview_scale），涵蓋主動 ETF 揭露日異常成交量、持股重疊度、年化隱成本、配對實證及規模申購分析。這些工具目前以 CLI script + 本機 JSON 檔案運作，無法自動接入每日 Pipeline 與 Supabase DB，導致研究洞察孤立在開發環境中，無法呈現於前端儀表板。

## What Changes

- 新增 `FrontrunningStep`：從 `etf_holdings_snapshot` 取加碼事件，用 FinLab 抓成交量，計算揭露日 T/T+1/T+2 異常成交量比率，寫入 `etf_frontrunning_stats` 表
- 新增 `ActiveShareStep`：從最新快照計算 11 支主動 ETF 兩兩 Active Share 矩陣，寫入 `etf_active_share` 表
- 新增 `CumulativeDragStep`：對每支 ETF 計算年化 excess_volume / manager_drag，並與被動 ETF 基準對比，寫入 `etf_cumulative_drag` 表
- 新增 `MatchedPairsStep`：找出同時被主動與被動 ETF 加碼的股票，做 paired abnormal vol 比較，寫入 `etf_matched_pairs` 表
- 擴充 `AumSyncStep`：補充每日 AUM 成長、累計淨申購、inflow_share_of_growth，存入 `etf_aum_series` 表
- 新增五張 Supabase migration 腳本（五個新表各一張）
- 所有新 step 屬**輔助步驟**：失敗只 log，不中斷 pipeline
- Pipeline orchestrator 在每日 ETF run 結束後依序執行這五個新 step（active_share 改為週執行）

## Non-Goals

- 不建前端 UI（只準備資料層；前端頁面為後續 change）
- 不引入被動 ETF 爬蟲（被動 ETF 持股資料目前不在 DB，暫以 FinLab 指數成分替代）
- 不修改現有 `ScrapeStep`、`DiffComputeStep`、`SaveSnapshotStep` 等核心步驟

## Capabilities

### New Capabilities

- `etf-frontrunning-analysis`: 揭露日前後異常成交量偵測（per event T/T+1/T+2 ratio），輸出至 `etf_frontrunning_stats`
- `etf-active-share`: 主動 ETF 兩兩持股重疊度矩陣（Active Share），輸出至 `etf_active_share`
- `etf-cumulative-drag`: 年化 excess_volume 與 manager_drag，主動 vs 被動對比，輸出至 `etf_cumulative_drag`
- `etf-matched-pairs`: 同股票主動/被動加碼配對 abnormal vol 比較，輸出至 `etf_matched_pairs`
- `etf-aum-series`: 每日 AUM、NAV、units、cumulative_inflow 時序，輸出至 `etf_aum_series`

### Modified Capabilities

（無現有 spec 需修改）

## Impact

- Affected specs: etf-frontrunning-analysis（新）、etf-active-share（新）、etf-cumulative-drag（新）、etf-matched-pairs（新）、etf-aum-series（新）
- Affected code:
  - New:
    - `ETF/pipeline/steps/frontrunning_step.py`
    - `ETF/pipeline/steps/active_share_step.py`
    - `ETF/pipeline/steps/cumulative_drag_step.py`
    - `ETF/pipeline/steps/matched_pairs_step.py`
    - `ETF/supabase/migrations/20260512000001_etf_frontrunning_stats.sql`
    - `ETF/supabase/migrations/20260512000002_etf_active_share.sql`
    - `ETF/supabase/migrations/20260512000003_etf_cumulative_drag.sql`
    - `ETF/supabase/migrations/20260512000004_etf_matched_pairs.sql`
    - `ETF/supabase/migrations/20260512000005_etf_aum_series.sql`
  - Modified:
    - `ETF/pipeline/steps/aum_sync_step.py`
    - `ETF/pipeline/orchestrator.py`
