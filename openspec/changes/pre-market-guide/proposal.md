## Why

`etf_flow_daily` 資料表有 schema 和 `FlowComputeStep`，但從未跑過 backfill，導致 `DailyFlowPanel` 永遠顯示「暫無資金流向資料」。Reference (tw-active) 首頁有一個「盤前指引」摘要卡（共識買進 / 集中加碼 / basket buy 偵測），目前網站完全缺失，投資人每天要看 LINE 通知或 reference 頁才能得到這個摘要。

## What Changes

- **資料補齊**：執行 `backfill_flow.py` 將歷史 `etf_diff_logs + stock_prices_daily` 聚合進 `etf_flow_daily`，並確認 `FlowComputeStep` 已在每日 CI pipeline 中正常執行
- **新增 `PreMarketGuide` Server Component**：讀取 `etf_flow_daily` 最新一筆，產生以下摘要卡：
  - Header：日期 + N/21 家已揭露
  - 共買進（≥4 家 ETF 同日買入）
  - 集中加碼（1–3 家，金額 ≥ 3 億）
  - 共識賣（≥3 家同日賣出）
  - Basket buy 警示（單一 ETF 占總流入 > 50%）
  - 主動 ETF 淨流入總結
- **整合至投資首頁**：將 `PreMarketGuide` 放在 `investment/page.tsx` 的 Tab 區上方（常駐可見，不埋在 tab 裡）

## Capabilities

### New Capabilities
- `pre-market-guide-ui`: `PreMarketGuide` Server Component，從 `etf_flow_daily` 聚合盤前指引摘要，顯示共識買賣與資金流向總結

### Modified Capabilities
- `daily-flow-data`: backfill + 驗證 `FlowComputeStep` 在 CI 中確實寫入 `etf_flow_daily`（資料層補齊，非 UI 需求變更）

## Impact

- **新增元件**：`src/components/features/investment/PreMarketGuide.tsx`（Server Component，≤ 150 行）
- **修改頁面**：`src/app/investment/page.tsx`—在 `InvestmentTabs` 前插入 `<PreMarketGuide />`
- **一次性指令**：`uv run python ETF/scripts/backfill_flow.py --days 90`（本地或 CI 手動觸發一次）
- **無 schema 變更**：`etf_flow_daily` 已存在，不需新 migration
- **無 API Route 變更**：`DailyFlowPanel` 直接讀 Supabase，`PreMarketGuide` 為 Server Component 也直接讀，都不需新 Route
