## 1. 資料庫 Schema

- [x] 1.1 建立 4 張 migration：`supabase/migrations/20260706000001_fund_holdings_monthly.sql`、`20260706000002_fund_holdings_quarterly.sql`、`20260706000003_fund_manager_map.sql`、`20260706000004_fund_signals.sql`，欄位與 UNIQUE 鍵依 design.md Implementation Contract；RLS 比照 `etf_signals`（authenticated 讀、service role 寫）。完成標準：migration 可在本地 supabase 套用且 `\d` 顯示的欄位/約束與 contract 一致
- [x] 1.2 在 `20260706000003_fund_manager_map.sql` 內 seed 19 檔觀測清單（6 ETF + 13 基金，資料取自 tw-active tools/managerwatch.py 的 CATALOG，經理人以現時資訊為準；00982A 經理人待查則 note 欄註記）。完成標準：`SELECT count(*) FROM fund_manager_map WHERE valid_to IS NULL` 回 19，且每筆 type='etf' 的 etf_code 都存在於 etfRegistry（實作 spec Requirement: Fund-manager mapping table）

## 2. 爬蟲層

- [x] 2.1 [P] 實作 `ETF/scrapers/sitca_scraper.py`：`fetch_monthly(ym, comid)` 打 SITCA IN2629、`fetch_quarterly(yq, comid)` 打 IN2630（POST 表單，參考 tw-active tools/managerwatch.py 的 request 組法），非最新期參數 raise ValueError，HTTP 失敗重試 2 次後 raise。完成標準：對最新期實抓一次回傳非空且欄位齊（rank/code/name/amount/pct）（實作 spec Requirements: SITCA monthly Top 10 holdings sync、SITCA quarterly >=1% holdings sync 的爬蟲部分）
- [x] 2.2 [P] 實作 `ETF/scrapers/mops_fund_scraper.py`：`fetch_monthly(ym)` 打 MOPS t78sb39_q3（POST body 帶民國年+月，參考 tw-active tools/mopsetf.py），回傳含正規化 fund_short 與 unmatched 清單。完成標準：對 3 個月前的歷史月份實抓回傳 Top 5 資料（實作 spec Requirement: MOPS historical monthly backfill 的爬蟲部分）
- [x] 2.3 [P] 實作基金名稱正規化：以 `fund_manager_map.fund_full_names` 為對照來源，raw name → fund_short；對不上者記 log 並收進 unmatched。完成標準：pytest 覆蓋「全名/短名/含『證券投資信託』變體」三種輸入都正規化到同一 fund_short
- [x] 2.4 為兩個爬蟲建立 fixture 測試：存一份實際回應 HTML 到 `ETF/tests/fixtures/`，parser 單元測試不打網路。完成標準：`uv run pytest ETF/ -k "sitca or mops"` 綠燈

## 3. 訊號與同步腳本

- [x] 3.1 實作 `ETF/analysis/fund_signals.py`：6 種訊號（quarterly_promotion / quarterly_latent_etf / fund_consensus / consecutive_add / high_weight_cut / core_exit），輸入為 DB 讀出的 holdings 資料，輸出 upsert 用 dict 清單；閾值常數置頂可調（共識 ≥3 檔、連續 ≥3 月、高權重 ≥10%→≤5%）。完成標準：每種訊號 pytest 至少一正例一反例（含「隔月斷檔不觸發 consecutive_add」）（實作 spec Requirement: Six fund dual-track signal types）
- [x] 3.2 實作 `ETF/run_fund_holdings_sync.py`：抓最新月報+季報（逐 comid，單一失敗不中斷其餘）→ upsert 兩張 holdings 表 → 跑訊號 upsert `fund_signals` → 印出同步摘要（各表筆數、unmatched 清單、超過 180 天未更新的 map 條目）；支援 `--dry-run`（抓+解析不寫 DB）；任一階段失敗 exit code 非 0。完成標準：`uv run python ETF/run_fund_holdings_sync.py --dry-run` 跑通且摘要完整（實作 spec Requirements: SITCA monthly Top 10 holdings sync、SITCA quarterly >=1% holdings sync、Signal detection runs inside the monthly sync）
- [x] 3.3 實作 `ETF/scripts/backfill_fund_holdings_mops.py`：參數 `--from YYYYMM --to YYYYMM`，逐月呼叫 mops_fund_scraper 並 upsert（source='mops'）。完成標準：回補近 6 個月後，`fund_holdings_monthly` 中 mops 來源月份數 = 6，且與 sitca 資料同鍵共存不互蓋（實作 spec Requirement: MOPS historical monthly backfill）
- [ ] 3.4 建立 `.github/workflows/fund_holdings_monthly.yml`：每月 12、15 日台北時間 09:00 cron，跑 `run_fund_holdings_sync.py`，失敗走既有 CI 失敗通知。完成標準：workflow_dispatch 手動觸發一次成功（實作 spec Requirement: Monthly CI schedule）

## 4. 前端

- [x] 4.1 實作 Server Action `src/app/actions/getManagerDualTrack.ts`：輸入 manager 名，回傳 { etfHoldings, fundHoldings, gapTable, signals }，型別 export、用 server client、禁 any。完成標準：`yarn tsc --noEmit` 綠燈（實作 spec Requirement: Manager dual-track page 的資料層）
- [x] 4.2 實作 `/investment/manager` 頁（Server Component + `.glass-card` 風格）：經理人卡片 → 四面板（ETF Top 20、基金月報 Top 10、雙軌落差表、近 3 期 fund_signals），空資料月份顯示明確 empty state，訊號徽章帶口徑標籤（日頻近似/月頻雙軌），漲跌用台股紅漲綠跌（text-rose-600 / text-emerald-600）。完成標準：本地實跑可見至少一位經理人完整四面板（實作 spec Requirements: Manager dual-track page、Signal caliber disclosure）
- [x] 4.3 在 `/investment` 入口頁加「經理人視角」連結卡。完成標準：入口點擊可導向 `/investment/manager`

## 5. 驗證與收尾

- [x] 5.1 資料正確性抽查：任選一檔基金，比對 `fund_holdings_monthly` 最新月 Top 10 與 SITCA 網站當期公佈內容逐筆一致；結果記錄於本 change 的 PR 描述或 commit message
- [x] 5.2 全面驗證：`uv run ruff check ETF/ && uv run pytest ETF/`、`yarn tsc --noEmit`、`yarn test --testPathPatterns manager` 全綠；派 fresh agent 實跑 `/investment/manager` 頁截圖確認
- [x] 5.3 更新 `ETF/CLAUDE.md`：新增 fund holdings 同步線（SITCA/MOPS 來源、月頻 CI、4 張新表、與 etf_signals 的口徑差異）一節
