## 1. 來源驗證與 Schema

- [x] 1.1 配息來源 spike：對 00981A 與 00984D 依序測試（a）TWSE OpenAPI 除權息資料集（b）投信官網公告頁（c）MOPS 公告，確認可取得 period/cash_per_unit/ex_date；把選定端點與證據記錄於本任務下方註記後才進行 2.3。若三者皆不可行，改走「手動 seed + 公告監測」並回報使用者（實作 spec Requirement: Dividend source verification spike）
  > **Spike 結論（2026-07-11）**：選定 **TWSE ETF 分配收益 API**
  > `GET https://www.twse.com.tw/rwd/zh/ETF/etfDiv?stkNo={code}&startDate=YYYYMMDD&endDate=YYYYMMDD&response=json`
  > - fields：證券代號 / 證券簡稱 / 除息交易日 / 收益分配基準日 / 收益分配發放日 / 收益分配金額(每1受益權益單位) / 收益分配標準 / 公告年度（日期為民國年格式「115年07月02日」）
  > - **00981A 證據**：除息 115/06/16、基準 115/06/22、發放 115/07/09、每單位 0.63 元 ✓
  > - **00984D 證據**：月配 3 筆（115/05/04、06/02、07/02 除息，各 0.085 元，發放日齊全）✓
  > - 欄位對應：ex_date=除息交易日、pay_date=收益分配發放日、cash_per_unit=收益分配金額；**period 由 ex_date 推導**（YYYY-MM，來源無期別欄）；yield_pct 來源未提供 → NULL
  > - 注意：金額可能為 null（已公告除息日、金額未定，如 00929 最新一筆）→ scraper 跳過該筆待金額確定
  > - 候選 (a) TWSE OpenAPI `TWT48U_ALL` 不採用：僅預告表（無歷史、無發放日，且探測時查無兩支 ETF）；(b)(c) 無需再測
  > - TWSE 憑證鏈缺 Subject Key Identifier，requests 需比照既有 scraper 用 certifi context/verify=False
- [x] 1.2 [P] 建立 migration `supabase/migrations/20260706000011_etf_aum_series_mechanics_columns.sql`：`etf_aum_series` 加 close、premium_pct、inflow、market_pnl 四個 nullable numeric 欄位。完成標準：本地套用後既有查詢不受影響、新欄位可寫入
- [x] 1.3 [P] 建立 migration `supabase/migrations/20260706000012_etf_dividend_records.sql`：欄位與 UNIQUE(etf_code, period) 依 design contract，RLS 比照 etf_aum_series。完成標準：本地套用成功（實作 spec Requirement: Dividend records storage and sync 的 schema 部分）

## 2. Pipeline 計算層

- [x] 2.1 擴充 `ETF/pipeline/steps/aum_sync_step.py`：計算 premium_pct（close 取 FinLab ETF 收盤價；close 或 nav 缺 → NULL，不估計）與 inflow/market_pnl（無前日列 → NULL），計算失敗記 log 不中斷 pipeline。完成標準：pytest 覆蓋正常日/首日/NAV 缺漏三情境（實作 spec Requirements: Daily premium/discount computation、Daily flow decomposition metrics）
- [x] 2.2 NAV 覆蓋擴充：逐一檢視 `official_api_scraper.py` 既有各家 issuer JSON 回應，對照官網頁面驗證 NAV 欄位後補進解析；驗證不了的發行商列入 `ETF/CLAUDE.md`「NAV 未接清單」。完成標準：nav 非空的 ETF 支數相比現況（3 家）增加，且每一家新增都有官網對照證據（實作 spec Requirement: NAV coverage expansion）
- [x] 2.3 實作 `ETF/scrapers/etf_dividend_scraper.py`（依 1.1 選定來源）：`fetch_dividends(etf_code)` 回傳 period/cash_per_unit/ex_date/pay_date/yield_pct；掛進每日 pipeline 尾端輔助步驟，冪等 upsert，單一 ETF 失敗只 log。完成標準：連跑兩次筆數不變；無配息 ETF 不寫列不報錯（實作 spec Requirement: Dividend records storage and sync）
- [x] 2.4 一次性回補腳本 `ETF/scripts/backfill_aum_mechanics.py`：對 `etf_aum_series` 既有歷史列補算 close（FinLab 歷史價）/premium_pct/inflow/market_pnl，並回補配息史。完成標準：回補後任選一支有 NAV 的 ETF 任一日，premium_pct 與手算一致到小數第 2 位

## 3. 前端

- [x] 3.1 實作 Server Actions `getEtfMechanics(etfCode)` 與 `getAumGrowthRanking()`：讀時聚合 growth_mult/inflow_share_of_growth/top flow days，型別 export、server client、禁 any。完成標準：`yarn tsc --noEmit` 綠燈（實作 spec Requirement: Aggregated growth indicators on demand）
- [x] 3.2 實作 `src/components/features/investment/EtfMechanicsTab.tsx` 並掛進 `/investment/[etf]`：折溢價折線圖（±1% 帶、正溢價 rose/折價 emerald、NAV 未接顯示說明）、配息時間軸（無記錄顯示明確空狀態）、拆解堆疊圖 + 4 KPI（tooltip 註明近似公式）。完成標準：本地實跑一支有 NAV 的 ETF 三區塊皆渲染（實作 spec Requirements: Premium/discount chart、Dividend timeline display、Decomposition panel and cross-ETF ranking 的深潛頁部分）
- [x] 3.3 `/investment/compare` 新增「申購占成長比」可排序排行表（26 支，各列連到深潛頁）。完成標準：本地實跑排序切換正常（實作 spec Requirement: Decomposition panel and cross-ETF ranking 的 compare 部分）

## 4. 驗證與收尾

- [x] 4.1 全面驗證：`uv run ruff check ETF/ && uv run pytest ETF/`、`yarn tsc --noEmit`、相關 `yarn test` 全綠；派 fresh agent 實跑深潛頁市場機制 Tab 與 compare 排行截圖確認
- [x] 4.2 更新 `ETF/CLAUDE.md`：新增市場機制欄位（close/premium_pct/inflow/market_pnl）、配息表、NAV 未接清單說明
