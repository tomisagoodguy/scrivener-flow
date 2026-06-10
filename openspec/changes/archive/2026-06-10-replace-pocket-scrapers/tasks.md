## 1. CATALOG 更新與 dispatch 路由（Secondary ETF scraping uses a three-layer fallback chain）

- [x] 1.1 [P] 在 `ETF/scrapers/official_api_scraper.py` 的 `CATALOG` 新增 `"00400A"` 條目：`issuer="cathay"`、`fund_code="EA"`；修正 `"00996A"` 的 `fund_id` 由 `None` 改為 `"23"`（兆豐 00996A 直接補 fund_id=23；Secondary ETF scraping uses a three-layer fallback chain 中 00400A 改走 official_api 路徑）
- [x] 1.2 [P] 在 `CATALOG` 新增 `"00401A"` 條目：`issuer="jpm"`、`xlsx_url="https://am.jpmorgan.com/content/dam/jpm-am-aem/asiapacific/tw/zh/regulatory/etf-supplement/jpm_apac_tw_etf_pcf_updates_00401A_TW00000401A1.xlsx"`
- [x] 1.3 [P] 在 `CATALOG` 新增 `"00989A"` 條目：`issuer="jpm"`、`xlsx_url="https://am.jpmorgan.com/content/dam/jpm-am-aem/asiapacific/tw/zh/regulatory/etf-supplement/jpm_apac_tw_etf_pcf_updates_00989A_TW00000989A5.xlsx"`
- [x] 1.4 [P] 在 `CATALOG` 新增 `"00983A"` 條目：`issuer="ctbc_html"`、`fund_code="00983A"`

## 2. 實作 `_fetch_jpm()` — JPM XLSX 爬蟲（JPM scraper fetches holdings from fixed XLSX URL）

- [x] 2.1 實作「JPM scraper fetches holdings from fixed XLSX URL」：在 `official_api_scraper.py` 新增 `_fetch_jpm(xlsx_url: str) -> list[dict]`，用 `urllib.request` 下載 XLSX bytes，以 `openpyxl.load_workbook(io.BytesIO(raw))` 開啟，找 `summaryHeaderIndex`（含 `Fund Ticker` 的 `Record Type` 行）與 `detailHeaderIndex`（含 `Constituent Ticker` 的第二個 `Record Type` 行），過濾 `Record Type == "D"` 明細行，weight = `Market Value Base / Estimated Total Market Value * 100`（摩根 XLSX 爬蟲使用固定 URL + openpyxl 解析）
- [x] 2.2 在 `_dispatch()` 的 `issuer == "jpm"` 分支中呼叫 `_fetch_jpm(cat_entry["xlsx_url"])`，驗證 `fetch_holdings("00401A")` 與 `fetch_holdings("00989A")` 均回傳非空 DataFrame（兩支 JPM ETFs 使用不同 XLSX URLs）

## 3. 實作 `_fetch_cathay()` — 國泰 REST API 爬蟲（Cathay scraper fetches holdings from REST API）

- [x] 3.1 實作「Cathay scraper fetches holdings from REST API」：在 `official_api_scraper.py` 新增 `_fetch_cathay(fund_code: str) -> list[dict]`，呼叫 `_get("https://cwapi.cathaysite.com.tw/api/ETF/GetIndexStockWeights?fundCode={fund_code}")` 取得 JSON，解析 `result.stockWeights[]`（`stockCode→code`、`stockName→name`、`weights→weight_pct`），`shares` 設 `0`（官方不揭露股數），weights 為空時回傳空 list（國泰 REST API 使用雙 GET 取得 assets + weights）
- [x] 3.2 在 `_dispatch()` 新增 `issuer == "cathay"` 分支呼叫 `_fetch_cathay(fund_code)`，驗證 `fetch_holdings("00400A")` 回傳非空 DataFrame 且所有 `shares == 0`（fund code 透過 CATALOG 可配置）

## 4. 實作 `_fetch_ctbc_html()` — 中信 HTML 爬蟲（CTBC HTML scraper parses ASP.NET holdings page for 00983A）

- [x] 4.1 實作「CTBC HTML scraper parses ASP.NET holdings page for 00983A」：在 `official_api_scraper.py` 新增 `_fetch_ctbc_html(etf_code: str) -> list[dict]`，`_get("https://www.ctbcinvestments.com.tw/CTWEB/Content/ETF/pcd.aspx?ETF_ID={etf_code}", verify_ssl=False)`，BeautifulSoup 解析，從 `id="Label_AUM01"` 取揭露日期（log 用），遍歷 `<tr>` 找 4 個 `<td>` 的明細行（[0]=代號、[1]=名稱、[2]=股數、[3]=比重%），過濾非 4 位數代號（中信 ARK 使用 HTML 爬蟲（與 00995A 使用不同端點））
- [x] 4.2 在 `_dispatch()` 新增 `issuer == "ctbc_html"` 分支呼叫 `_fetch_ctbc_html(fund_code)`，確認路由不影響現有 `issuer == "ctbc"` 分支（00995A 繼續用 auth-token API）；驗證 `fetch_holdings("00983A")` 回傳非空 DataFrame（issuer 路由區分 00983A 與 00995A）

## 5. ETF Registry 同步

- [x] 5.1 [P] 修改 `ETF/config/etf_registry.py`：將 `00400A`、`00401A`、`00983A`、`00989A` 的 `source` 從 `"pocket"` 改為 `"official_api"`；`00996A` 已是 `"official_api"`，確認不需改動（`00998A` 維持 `"pocket"` 不動）
- [x] 5.2 [P] 修改 `src/lib/investment/etfRegistry.ts`：對應將 `00400A`、`00401A`、`00983A`、`00989A` 的 `dataSource` 從 `'pocket'` 改為 `'official_api'`（`etf_registry.py` 與 `etfRegistry.ts` 同步）

## 6. 驗證

- [x] 6.1 執行 `uv run python -c "from ETF.scrapers.official_api_scraper import fetch_holdings; print(fetch_holdings('00400A').head())"` 確認國泰回傳非空
- [x] 6.2 執行相同指令測試 `00401A`、`00989A`（JPM XLSX）與 `00983A`（中信 HTML）均回傳非空 DataFrame，且 `00996A` 不再回傳空（`fund_id=23` 生效）
- [x] 6.3 執行 `uv run python ETF/main.py --dry-run` 確認 pipeline 整體無錯誤（需設定 `FORCE_RUN=true`）
