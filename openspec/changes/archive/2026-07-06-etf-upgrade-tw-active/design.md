## Context

目前 ETF Pipeline 以 FinLab API 為主要股價來源，以 FHTrust/EzMoney（00981A）和 Pocket.tw Selenium（其餘 10 支）為持股資料來源。Pocket.tw 是非官方爬蟲，2026-04-12~17 事件已證明輔助步驟脆弱性。

tw-active（`reference/tw-active/`）已驗證六家投信官方 API 可直接存取，並有完整的 AUM 時序、21 支 ETF 持股、5 種策略訊號設計可供移植。

## Goals / Non-Goals

**Goals:**
- 讓 FinLab 維持主力，官網 API 作備援，消除 Pocket.tw 單點風險
- 擴充到 21 支 ETF，etfRegistry 為唯一真實來源
- 新增 AUM 申購占成長比儀表板
- 單一 ETF 深潛頁新增持股比重 + 股價雙軸疊圖
- 新增 5 種策略訊號偵測，寫入資料庫並在前端展示

**Non-Goals:**
- 不替換 FinLab（成本效益不佳，FinLab 付費穩定）
- 不引入 Playwright/Selenium 用於新資料來源（官方 API 不需要）
- 不修改現有 RLS 架構或 Auth 邏輯
- 不實作 tw-active 的 SQLite datastore（Supabase 已是 SSOT）

## Decisions

### 決策 1：FinLab 主力 + 官網 API 備援，雙軌策略

**選擇**：`PriceAttachStep` 維持 FinLab；新增 `OfficialApiBackupStep`，於 FinLab 失敗或資料缺失時啟用。

**理由**：
- FinLab 已付費，資料完整（OHLCV、營收、籌碼），替換成本高
- 官網 API 只提供持股比重，不提供股價，無法完整取代
- 備援策略：`ScrapeStep` 先跑 FinLab；若 `price` 欄位空缺率 > 30%，自動觸發官網 API fallback

**放棄**：完全替換 Pocket.tw → 官網 API 只在必要時使用，不影響主流程效能。

### 決策 2：CATALOG 直接移植，不抽象化

**選擇**：將 `reference/tw-active/tools/etfdaily.py` 的 `CATALOG` dict 直接移植到 `ETF/scrapers/official_api_scraper.py`，不建立通用框架。

**理由**：
- 各家投信 HTTP 認證方式差異極大（cookie jar / POST JSON / ASP.NET antiforgery），強行抽象化反而增加維護負擔
- 目前只需 6 家，over-engineering 無必要
- tw-active 已驗證可行，直接移植最安全

### 決策 3：AUM 時序獨立新表 `etf_aum_series`

**選擇**：新增 `etf_aum_series(etf_code, data_date, aum_100m, nav, units, inflow_100m)` 表，不修改現有 `etf_aum` 表。

**理由**：
- 現有 `etf_aum` 是月快照，`etf_aum_series` 是日時序，語義不同不應混用
- 申購占成長比需要完整時序才能計算，不能只存月快照
- 資料來源：`AumSyncStep` 讀 NAV（FinLab）× units（投信官網） 計算 AUM，寫入時序

### 決策 4：雙軸疊圖資料完全來自現有表

**選擇**：持股比重折線從 `etf_weight_history`，股價走勢從 `stock_prices_daily`，前端 join，不新增資料表。

**理由**：兩表已有所需欄位，不需額外 pipeline 步驟，減少 DB 複雜度。

### 決策 5：訊號存 `etf_signals` 表，不即時計算

**選擇**：`SignalDetectStep` 每日批次計算 5 種訊號，結果寫入 `etf_signals(signal_type, stock_code, etf_codes, data_date, metadata)`，前端直接查詢。

**理由**：
- 訊號計算涉及跨 ETF join，即時計算對前端負擔過大
- 批次計算可以在 Pipeline 末段執行，不影響主流程
- `metadata` JSONB 欄位保持彈性，不同訊號可存不同附加資料

## Risks / Trade-offs

- **[風險] 投信官網 API 無版本保證** → 加 `try/except`，降級為輔助步驟，失敗不中斷 pipeline；監控 HTTP status code，失敗時 LINE 通知
- **[風險] 21 支 ETF 使 FinLab 配額壓力增加** → `SyncOHLCVStep` 加增量判斷，當日已同步的股票跳過；監控每日用量
- **[風險] `etf_aum_series` 歷史資料空白** → 第一次部署後執行一次性 backfill，從 tw-active `site/preview/scale.json` 匯入歷史資料
- **[風險] 訊號偵測 false positive** → 訊號在前端以「參考指標」呈現，不作自動交易信號，降低誤判影響

## Migration Plan

1. **Phase 1**：ETF 擴增 + 官網 API backup scraper（無 DB schema 變更，風險最低）
2. **Phase 2**：新增 `etf_aum_series` migration + `AumSyncStep` + 前端 AUM 面板
3. **Phase 3**：新增 `etf_signals` migration + `SignalDetectStep` + 前端訊號顯示
4. **Phase 4**：單一 ETF 深潛頁雙軸疊圖（純前端，無 DB 變更）

回滾策略：每個 Phase 獨立可回滾；etfRegistry 新增 ETF 不影響舊資料；新表 migration 只加不改。

## Open Questions

- 00986A（兆豐）、00994A（第一金）、00995A（中信）、00987A（台新）等投信官方 API 尚未破解（tw-active CATALOG 也標記待破解）；這些 ETF 暫時維持 FinLab 主力、無備援
- `etf_aum_series` 的 backfill 資料品質：tw-active `scale.json` 涵蓋 2025-05 至今，更早資料需另外處理
