## Why

現有 `signal_detect_step` 的「多基金共識／跨產品加碼」訊號只用 ETF 每日持股近似（≥N 支 ETF 同日持有/加碼），並沒有真正的「經理人共同基金」維度。台灣法規造成同一經理人的主動 ETF（每日揭露）與共同基金（月揭露 Top 10、季揭露 ≥1%）存在揭露頻率落差，tw-active 專案已驗證 SITCA IN2629/IN2630 與 MOPS t78sb39_q3 可取得基金持股資料，據此偵測「經理人私房菜」訊號（基金先買、ETF 後買的雙軌行為）。本 change 把這條資料線整合進本專案，讓訊號有真資料支撐。

## What Changes

- 新增 SITCA 爬蟲：IN2629（基金月報 Top 10 持股）與 IN2630（基金季報 ≥1% 持股），對觀測清單內的投信逐月/逐季抓取
- 新增 MOPS t78sb39_q3 歷史月報爬蟲（Top 5），用於回補 SITCA 歷史期 server filter 失效造成的缺口
- 新增三張 Supabase 資料表：`fund_holdings_monthly`、`fund_holdings_quarterly`、`fund_manager_map`（基金↔ETF↔經理人對照白名單）
- 新增基金雙軌訊號偵測，實作 6 種訊號寫入新表 `fund_signals`：季報→月報 Top10 晉升、季報潛伏 ETF 激活、多基金共識（真基金版）、連續加碼、高權重減碼、核心出場；其中「雙軌建倉/加碼」透過 `fund_manager_map` 的經理人對照實現
- 新增獨立執行腳本與每月 CI workflow（比照 factor_ic_monthly 模式），不進每日 pipeline
- 新增前端經理人視角頁 `/investment/manager`：以經理人為中心，並列其 ETF 每日持股與基金月報 Top 10，標示雙軌落差與訊號
- 現有 `etf_signals` 的 ETF-only 訊號口徑不變，前端註明兩者口徑差異

## Capabilities

### New Capabilities

- `fund-holdings-sync`: SITCA 月報/季報與 MOPS 歷史月報爬蟲，正規化寫入 `fund_holdings_monthly`/`fund_holdings_quarterly`，含基金名稱正規化與 `fund_manager_map` 白名單、每月 CI 排程
- `fund-dual-track-signals`: 基於基金月報/季報與 ETF 每日持股的 6 種雙軌訊號偵測，寫入 `fund_signals` 表
- `manager-view-page`: 前端 `/investment/manager` 經理人視角頁，呈現同經理人 ETF vs 基金持股對照與訊號清單

### Modified Capabilities

（無現有 spec 需修改）

## Impact

- Affected specs: fund-holdings-sync（新）、fund-dual-track-signals（新）、manager-view-page（新）
- Affected code:
  - New:
    - ETF/scrapers/sitca_scraper.py
    - ETF/scrapers/mops_fund_scraper.py
    - ETF/config/fund_manager_map.py
    - ETF/analysis/fund_signals.py
    - ETF/run_fund_holdings_sync.py
    - ETF/scripts/backfill_fund_holdings_mops.py
    - supabase/migrations/20260706000001_fund_holdings_monthly.sql
    - supabase/migrations/20260706000002_fund_holdings_quarterly.sql
    - supabase/migrations/20260706000003_fund_manager_map.sql
    - supabase/migrations/20260706000004_fund_signals.sql
    - .github/workflows/fund_holdings_monthly.yml
    - src/app/investment/manager/page.tsx
    - src/app/actions/getManagerDualTrack.ts
  - Modified:
    - src/lib/investment/etfRegistry.ts（補 manager 欄位或由 fund_manager_map 對照，擇一，見 design）
    - src/app/investment/page.tsx（入口加經理人視角連結）
  - Removed: （無）
- 外部依賴：SITCA 網站（www.sitca.org.tw）、MOPS（mops.twse.com.tw）；皆為公開資料，無需金鑰
- 參考實作：C:\Users\user\Documents\GitHub\tw-active 的 tools/managerwatch.py、tools/mopsetf.py、tools/signals.py、tools/datastore.py
