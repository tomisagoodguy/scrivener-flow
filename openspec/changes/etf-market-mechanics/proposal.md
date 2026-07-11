## Why

本專案已有 `etf_aum_series`（AUM/NAV/units/累計淨申購），但缺三塊主動 ETF 監控的基本面板：折溢價（市價 vs NAV 的乖離，申贖套利與情緒訊號）、配息記錄（除息日是持股時序分析的 anchor）、AUM 成長來源拆解（成長是「申購送進來的」還是「漲出來的」——tw-active 的「自肥」儀表板已驗證此指標對辨識規模驅動型 ETF 有效）。

## What Changes

- 新增每日折溢價序列：以 ETF 自身收盤價（FinLab）對 `etf_aum_series.nav` 計算 premium_pct，存回 `etf_aum_series` 新欄位；NAV 缺漏的發行商該日不算（不填估計值）
- 擴充 NAV 覆蓋：檢視 26 支 ETF 官網 JSON，將既有 3 家（野村/安聯/群益）之外可驗證的 NAV 欄位補進 `aum_sync_step` 的解析
- 新增 `etf_dividend_records` 表與同步：每檔 ETF 的配息記錄（期別、每單位金額、除息日、發放日、殖利率），來源以公開管道為準（候選端點見 design，首個任務為來源驗證 spike）
- 新增 AUM 成長拆解指標：日淨申購（Δunits × NAV）、市值貢獻（units × ΔNAV）、成長倍數、申購占成長比、Top 申購/贖回日，計算於 `aum_sync_step` 內延伸，聚合結果存 `etf_aum_series` 既有列（新欄位）
- 前端 `/investment/[etf]` 深潛頁新增「市場機制」Tab：折溢價走勢圖（含 ±1% 參考帶）、配息時間軸、AUM 成長拆解面板（申購 vs 市值貢獻堆疊圖 + 申購占成長比）
- `/investment/compare` 新增跨 ETF 申購占成長比排行

## Capabilities

### New Capabilities

- `etf-premium-discount`: ETF 每日折溢價計算與序列儲存，及前端走勢圖
- `etf-dividend-records`: ETF 配息記錄資料表、同步與前端時間軸
- `etf-aum-growth-decomposition`: AUM 成長來源拆解（淨申購 vs 市值貢獻）指標計算與前端面板/排行

### Modified Capabilities

（無現有 spec 需修改）

## Impact

- Affected specs: etf-premium-discount（新）、etf-dividend-records（新）、etf-aum-growth-decomposition（新）
- Affected code:
  - New:
    - supabase/migrations/20260706000011_etf_aum_series_mechanics_columns.sql
    - supabase/migrations/20260706000012_etf_dividend_records.sql
    - ETF/scrapers/etf_dividend_scraper.py
    - src/components/features/investment/EtfMechanicsTab.tsx
  - Modified:
    - ETF/pipeline/steps/aum_sync_step.py（折溢價 + 拆解指標計算）
    - ETF/scrapers/official_api_scraper.py（NAV 欄位覆蓋擴充）
    - src/app/investment/[etf]/page.tsx（新增 Tab）
    - src/app/investment/compare/page.tsx（排行區塊）
  - Removed: （無）
- 外部依賴：FinLab（ETF 收盤價，既有額度內）；配息來源候選為 TWSE 公開資料或投信官網公告（design 內含驗證 spike）
- 參考實作：C:\Users\user\Documents\GitHub\tw-active 的 tools/preview_scale.py（拆解邏輯）與 raw/cmoney/premium、raw/cmoney/dividend 資料格式
