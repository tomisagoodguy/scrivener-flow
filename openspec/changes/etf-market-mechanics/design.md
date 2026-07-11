## Context

`etf_aum_series` 已由 `aum_sync_step` 每日寫入（date, etf, aum, nav, units, cumulative_inflow），但 NAV 欄位目前僅野村/安聯/群益 3 家投信的官網 JSON 有經驗證的來源，其餘 ETF 的 nav 為空。ETF 自身收盤價可由 FinLab 價格資料取得（26 支代號皆為上市 ETF）。tw-active 的 preview_scale.py 已驗證拆解公式：日淨申購 ≈ Δunits × NAV、市值貢獻 ≈ units × ΔNAV、申購占成長比 = 累計淨申購 / 總 AUM 成長。配息資料 tw-active 走私有 cmoney 管線，本專案不可用，需自找公開來源。

## Goals / Non-Goals

**Goals:**

- 折溢價日序列落地並可視化（有 NAV 的 ETF 先上，覆蓋隨 NAV 擴充漸進）
- 配息記錄表建立並回補既有配息史
- AUM 成長拆解指標進 DB 並在深潛頁與 compare 頁呈現

**Non-Goals:**

- 不做折溢價套利回測（僅呈現數據）
- 不做 D 類債券型 3 支的配息殖利率分析（資料先存，分析後續 change）
- 不重算歷史 AUM（拆解指標從有資料的最早日起算，不外插）
- 不做 LINE 推播

## Decisions

1. **折溢價存 `etf_aum_series` 新欄位而非新表**：折溢價與 nav/units 同粒度（每日每 ETF 一列），開新表會造成同概念兩處存放。新增欄位 close numeric、premium_pct numeric（NULL 表示該日無法計算）。
2. **NAV 缺漏不估計**：沒有官網 NAV 的 ETF 該日 premium_pct 留 NULL，前端顯示「NAV 來源未接」。用估計值會製造假訊號。
3. **配息來源以 spike 定案**：候選依序（a）TWSE OpenAPI 除權息公告資料集（b）各投信官網公告頁（c）MOPS 公告全文（既有 news_context_step 已接 MOPS）。任務 1 為 spike：對 00981A 與 00984D 各驗證一個來源能取得「期別/每單位金額/除息日/發放日」四欄，選定後才實作 scraper。配息為低頻事件（月/季），同步掛在每日 pipeline 尾端輔助步驟，冪等 upsert。
4. **拆解指標在 `aum_sync_step` 內計算**：該 step 已持有 aum/nav/units 當日與前日資料，順手計算 inflow（Δunits × nav）、market_pnl（units_prev × Δnav）寫入當日列，不另開 step；聚合值（growth_mult、inflow_share_of_growth、top flow days）由前端/Server Action 依序列即時聚合，不預存（避免快照過期問題）。
5. **前端聚合走 Server Action**：`getEtfMechanics(etfCode)` 一次回傳折溢價序列、配息清單、拆解序列與聚合指標；compare 頁的排行用 `getAumGrowthRanking()`。均用 server client。

## Implementation Contract

**Schema 變更（2 張 migration）**

- `etf_aum_series` 新欄位：close numeric NULL、premium_pct numeric NULL、inflow numeric NULL（當日淨申購，億元）、market_pnl numeric NULL（當日市值貢獻，億元）
- `etf_dividend_records`: (etf_code text, period text, cash_per_unit numeric, ex_date date, pay_date date NULL, yield_pct numeric NULL, source text, ingested_at timestamptz, UNIQUE(etf_code, period))；RLS 比照 etf_aum_series

**計算行為（aum_sync_step 延伸）**

- premium_pct = (close − nav) / nav × 100，close 或 nav 任一缺即 NULL
- inflow = (units_t − units_{t−1}) × nav_t；market_pnl = units_{t−1} × (nav_t − nav_{t−1})；前一日無資料則兩者 NULL
- 計算失敗不中斷 pipeline（輔助步驟語義），錯誤記 log

**配息同步（etf_dividend_scraper.py + pipeline 輔助步驟）**

- `fetch_dividends(etf_code) -> list[dict]`，回傳 period/cash_per_unit/ex_date/pay_date/yield_pct
- 每日 pipeline 尾端跑一次全 ETF 冪等 upsert；來源錯誤只 log 不中斷

**前端**

- `/investment/[etf]` 新增「市場機制」Tab（`EtfMechanicsTab.tsx`）：折溢價折線圖（±1% 參考帶、NAV 未接時顯示說明）、配息時間軸（除息日標記）、AUM 拆解堆疊圖（inflow vs market_pnl 累計）+ 4 個 KPI（growth_mult、inflow_share_of_growth、top inflow day、top outflow day）
- `/investment/compare` 新增「申購占成長比」排行表（26 支，可排序）；台股紅漲綠跌配色

**驗收條件**

- `uv run pytest ETF/` 綠燈：premium/inflow/market_pnl 計算函式有單元測試（含 NAV 缺漏 → NULL、首日無前值 → NULL）
- 抽查：任選一支有 NAV 的 ETF，任一日 premium_pct 與（收盤價、官網 NAV）手算一致到小數第 2 位
- `yarn tsc --noEmit` 綠燈；本地實跑深潛頁市場機制 Tab 與 compare 排行

**範圍邊界**

- In scope：上述 2 migration、aum_sync_step 延伸、1 配息 scraper、1 Tab 元件、2 Server Action、compare 排行
- Out of scope：套利回測、歷史 AUM 重建、推播、債券型殖利率分析

## Risks / Trade-offs

- [配息公開來源不確定] → 任務 1 spike 先驗證，來源不可行則縮小為「僅有配息制度的 ETF 手動 seed + 公告監測」並回報使用者再議
- [NAV 覆蓋不全導致折溢價圖大量空白] → 前端明確顯示「NAV 來源未接」而非空圖；NAV 擴充任務同 change 內執行
- [units 由 AUM/NAV 推算的誤差] → 與 tw-active 相同限制，接受；拆解指標標記為近似值（前端 tooltip 註明公式）

## Migration Plan

1. 套用 2 張 migration
2. 部署 pipeline 變更，次日起新資料自動帶新欄位
3. 跑一次性回補腳本任務（對既有 etf_aum_series 歷史列補算 close/premium_pct/inflow/market_pnl，close 用 FinLab 歷史價）
4. 配息 spike → scraper → 回補配息史
5. 部署前端

## Open Questions

- 配息 spike 若三個候選來源都拿不到 pay_date（發放日），是否接受只存 ex_date？（預設：接受，pay_date 留 NULL）
