## 1. Context 欄位

- [x] 1.1 在 ETF/pipeline/context.py 的 PipelineContext 新增 `etf_fund_assets: dict[str, dict]` 欄位（預設空 dict），實作「以 PipelineContext.etf_fund_assets 傳遞，比照 secondary_stock_codes」決策，作為 Fund asset summary propagation via PipelineContext 的傳遞容器

## 2. Scraper 擷取基金資產摘要

- [x] 2.1 [P] 在 ETF/scrapers/official_api_scraper.py 的各家解析（JSON API：`fundAsset.Aum/Nav/Units/NavDate`；中信 `#Label_AUM02/04/03/01`；台新／野村 th-td map；群益 `.td.cell.auto`；元大 `pcf.totalav`）擷取 aum/nav/units/nav_date，回傳結構擴充為含 holdings 與資產摘要，落實「由 scraper 在持股解析時一併擷取基金資產摘要」決策，滿足 Fund asset summary extraction during holdings scrape
- [x] 2.2 [P] 確認單一欄位解析失敗時回 null 且不中斷持股解析（Fund asset summary extraction during holdings scrape 的容錯情境）

## 3. 寫入 Context

- [x] 3.1 在 ETF/pipeline/steps/multi_etf_step.py 各 ETF 爬取成功處，將資產摘要寫入 `ctx.etf_fund_assets[code]`，完成 Fund asset summary propagation via PipelineContext；無摘要的 ETF 不寫入

## 4. AumSyncStep 改讀 Context

- [x] 4.1 在 ETF/pipeline/steps/aum_sync_step.py 將 `_sync_all` 改為讀取 `ctx.etf_fund_assets`，依 `aum_100m = aum/1e8`、`units = units/1e8`、`nav` 不變組 records 並 upsert，實作「AumSyncStep 改讀 ctx、移除 FinLab 路徑、修正 _upsert 簽章」決策，滿足 AumSyncStep persists fund assets from context
- [x] 4.2 移除 `_fetch_finlab_etf_data`、`_try_tables`、`_NAV_TABLE_CANDIDATES`、`_UNITS_TABLE_CANDIDATES` 死路；`_build_row` 容許 nav/units 為 None
- [x] 4.3 修正 `_upsert` 呼叫端為 `self._upsert(services, records)`，對齊兩引數定義（AumSyncStep persists fund assets from context 的簽章情境）
- [x] 4.4 確認 `_sync_aum_series` 增量計算邏輯不變，維持 Incremental inflow computation unchanged

## 5. 驗證

- [x] 5.1 新增／更新 ETF/ 下單元測試：mock `ctx.etf_fund_assets` 驗證 AumSyncStep 產生正確 etf_aum_series records 與單位換算，並驗證空 dict 時只 log warning 不寫入
- [x] 5.2 執行 `uv run ruff check --fix && uv run ruff format` 與 `uv run pytest ETF/`，確認全綠
