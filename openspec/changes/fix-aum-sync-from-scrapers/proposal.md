## Why

`AumSyncStep` 唯一的資料來源是 FinLab 的 `fund_price:收盤價` 與 `fund_price:已發行受益權單位數`，但這兩張表在 FinLab 根本不存在（實測 `data.get` 回 `Cannot find data`、`data.search('受益權')` 回空），導致每次執行都在取數階段拿到 `None` 後靜默 `return`。因為 `AumSyncStep` 是輔助步驟（例外不 re-raise），pipeline 一路綠燈、無人察覺。`etf_aum_series` 自一次性 backfill 後再無新資料（最新 `2026-04-22`、僅 14/22 覆蓋），`/investment/compare` 規模分析頁因此停更 7 週。

## What Changes

- 各投信官方 scraper（`official_api_scraper.py` 及其分派的各家解析）在解析持股的**同一份回應**中，順手抽出基金資產摘要 `aum`／`nav`／`units`／`nav_date`，做法比照參考專案 TW_Active_Tracker（其每個 `fetchSnapshot` 皆同時回傳 `{ aum, nav, units, holdings }`）。
- 新增 `PipelineContext` 欄位 `etf_fund_assets`（`dict[code, {aum, nav, units, nav_date}]`），由 scraper 寫入、`AumSyncStep` 消費，比照既有 `secondary_stock_codes` 的傳遞模式。
- `AumSyncStep._sync_all` 改為讀取 `ctx.etf_fund_assets` 並 upsert 進 `etf_aum_series`，**移除** FinLab `fund_price:*` 取數與 `_fetch_finlab_etf_data` / `_try_tables` 等死路邏輯。
- 修正 `_upsert` 呼叫端簽章不符的潛在 bug：呼叫端傳三個引數（`self._upsert(services, records, services)`）、定義端只收兩個，目前被前一個失敗遮蔽，換來源後會立即觸發 `TypeError`，故一併修正為 `self._upsert(services, records)`。
- `inflow_100m` 與 `cumulative_inflow_yi` 等增量欄位維持現有 `_sync_aum_series` 日差計算邏輯，不變動。

## Non-Goals

- 不改動 `etf_aum_series` 資料表 schema、不新增欄位。
- 不重做 `_sync_aum_series` 的累積流入／成長佔比計算。
- 不回頭沿用或修補 FinLab `fund_price:*` 路徑（該來源確認不存在，直接移除而非保留 fallback）。
- 不處理 backfill 腳本（`backfill_aum_from_twactive.py`）的歷史補資料；本變更只負責「日常每天有新資料」。
- 不新增獨立的 AUM 專用爬蟲請求（避免額外 HTTP 流量，一律複用持股爬取的同一回應）。

## Capabilities

### New Capabilities

- `etf-fund-asset-sync`: 從各投信持股爬取回應中擷取基金資產摘要（AUM／NAV／流通單位數／淨值日期），經 PipelineContext 傳遞並每日 upsert 至 `etf_aum_series`，取代失效的 FinLab 來源。

### Modified Capabilities

(none)

## Impact

- Affected specs: `etf-fund-asset-sync`（新增）
- Affected code:
  - Modified:
    - ETF/pipeline/steps/aum_sync_step.py
    - ETF/scrapers/official_api_scraper.py
    - ETF/pipeline/context.py
    - ETF/pipeline/steps/multi_etf_step.py
  - New: (none)
  - Removed: (none)
