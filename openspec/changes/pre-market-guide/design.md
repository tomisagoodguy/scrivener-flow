## Context

`etf_flow_daily` 表已有 schema（migration `20260424115900`），`FlowComputeStep` 也已加入 pipeline，但 backfill 從未執行，故資料表為空。前端 `DailyFlowPanel` 已實作完整的資金流向 UI（個股維度 + 分 ETF 小計），目前卡在「無資料」狀態。

Reference (tw-active) 在首頁有一個「盤前指引」卡，邏輯來自 `morning_post.py`：從 `flow.json` 算出共識買賣 / 集中加碼 / basket buy，這是投資者每天最想快速看到的一行摘要。目前網站缺此功能，使用者需切換 tab 才能看到原始資金流，且無摘要。

## Goals / Non-Goals

**Goals:**
- 執行一次 backfill，讓 `etf_flow_daily` 有歷史資料（近 90 天）
- 新增 `PreMarketGuide` Server Component，常駐顯示於 `investment/page.tsx` tab 區上方
- 盤前指引包含：日期 + 揭露率、共識買進、集中加碼、共識賣、basket buy 警示、淨流入總結

**Non-Goals:**
- 不新增任何 DB Schema（現有 `etf_flow_daily` 已足夠）
- 不改動 `DailyFlowPanel`（繼續存在於 "資金流向" tab，顯示完整列表）
- 不新增 API Route（Server Component 直讀 Supabase service client）
- 不支援歷史日期切換（盤前指引只看最新一筆）

## Decisions

### 1. PreMarketGuide 為 Server Component

理由：資料是靜態讀取（只取最新一筆），不需要 client-side 互動。Server Component 避免 hydration overhead，且頁面載入時即有資料，不會出現 loading skeleton。

替代方案：Client Component（useEffect 讀 Supabase）—但增加 waterfall 延遲，且 DailyFlowPanel 已是 Client Component，不必重複。

### 2. 放在 InvestmentTabs 上方，常駐可見

理由：盤前指引是每日最重要的摘要，不應藏在 tab 裡。用戶打開投資頁的第一眼應該看到。

替代方案：新增「盤前」tab —但 tab 數量已多（選股 / 黃金 / 異動 / 對比 / 共識 / 資金流），再加一個會讓 tab bar 過擠。

### 3. 摘要邏輯放在 page.tsx Server Function，不建 Supabase RPC

理由：邏輯簡單（filter + sort），資料量小（最多一筆 JSON），在 TypeScript 裡做比 SQL 更易測試和修改。

替代方案：建 Supabase DB function —overkill，且增加 migration 負擔。

### 4. 共識門檻直接用 `etf_count` 欄位

`etf_flow_daily.inflow[].etf_count` 已由 `FlowComputeStep._aggregate()` 計算好，不需前端重算。共識買進門檻 = etf_count ≥ 3（對應現有 11 支 ETF 的規模，4 支太高）。

### 5. Backfill 在本地手動跑，不自動化

理由：backfill 是一次性補齊，不需 CI 自動化。每日 pipeline 已有 `FlowComputeStep`，之後新資料會自動寫入。

## Risks / Trade-offs

- **[Risk] `etf_diff_logs` 舊資料稀疏** → backfill 某些日期可能算出空結果（inflow/outflow 為空列表），這是正常行為，仍會寫入一筆 `totals.stocks_count=0` 的記錄，`DailyFlowPanel` 顯示「當日無重大異動」
- **[Risk] `stock_prices_daily` 缺某些日期的收盤價** → `FlowComputeStep._fetch_prices()` 回傳空 dict，受影響的股票 `total_nt=0`，被過濾掉；流向金額可能低估，已在 `DailyFlowPanel` 有「以下ETF尚未揭露」警示
- **[Risk] PreMarketGuide 增加 page.tsx 資料請求數** → 只多一個 Supabase query（單筆 JSON），可與其他 parallel queries 合併，影響可忽略

## Migration Plan

1. 在本地執行 backfill：`uv run python ETF/scripts/backfill_flow.py --days 90`
2. 驗證 Supabase `etf_flow_daily` 有資料
3. 實作 `PreMarketGuide.tsx`
4. 修改 `investment/page.tsx` 插入元件
5. `yarn dev` 本地驗證盤前指引顯示正確
6. commit + push
