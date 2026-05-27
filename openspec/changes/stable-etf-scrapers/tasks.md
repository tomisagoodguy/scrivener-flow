## 1. 台新直接 API — 台新 (00987A)：requests + BeautifulSoup 解析靜態 HTML

- [x] [P] 1.1 在 `ETF/scrapers/official_api_scraper.py` 的 CATALOG 中新增 `"00987A"` 條目：`issuer="taishin"`, `fund_code="00987A"`
- [x] [P] 1.2 實作 `_fetch_taishin(etf_code: str) -> list[dict]`（Fetch 00987A holdings via Taishin official HTML page）：GET `https://www.tsit.com.tw/ETF/Home/ETFSeriesDetail/{etf_code}`，BeautifulSoup 解析 `<input id="PUB_DATE">` 取日期，定位 `<th>` 含「代號」的表格，逐列取 code/name/shares/weight，過濾非 `^\d{4,6}$` 代號，任何例外回傳空 list 並 log error
- [x] [P] 1.3 在 `_dispatch()` 中加入 `if issuer == "taishin": return _fetch_taishin(fund_code)` 分支
- [x] [P] 1.4 本地 dry-run 驗證：`fetch_holdings("00987A")` 回傳非空 DataFrame，欄位 code/name/shares/weight 均有效

## 2. 第一金直接 API — 第一金 (00994A)：REST API POST JSON

- [x] [P] 2.1 在 CATALOG 新增 `"00994A"` 條目：`issuer="first_financial"`, `fund_code="182"`
- [x] [P] 2.2 實作 `_fetch_first_financial(fund_id: str) -> list[dict]`（Fetch 00994A holdings via First Financial REST API）：POST `https://www.fsitc.com.tw/WebAPI.aspx/Get_hd`，body `{"pStrFundID": fund_id, "pStrDate": ""}`，解析外層 `res["d"]`（`json.loads` 二次解碼）取持股列表，確認欄位名稱對應 code/name/shares/weight
- [x] [P] 2.3 在 `_dispatch()` 中加入 `if issuer == "first_financial": return _fetch_first_financial(fund_code)` 分支
- [x] [P] 2.4 本地 dry-run 驗證：`fetch_holdings("00994A")` 回傳非空 DataFrame，double-decode 正確

## 3. 中信兩步驟 API — 中信 (00995A)：兩步驟 REST API（先取 auth token）

- [x] [P] 3.1 在 CATALOG 新增 `"00995A"` 條目：`issuer="ctbc"`, `fund_code="E0036"`
- [x] [P] 3.2 實作 `_fetch_ctbc(fid: str) -> list[dict]`（Fetch 00995A holdings via CTBC two-step authenticated REST API）：Step 1 POST AuthToken 取 `Data.token`（每次重新取，不快取）；Step 2 POST ETFHoldingWeight body `{"token": token, "FID": fid, "StartDate": ""}`，解析 `Data.FundAssetsDetail`，篩選 `assetCode == "STOCK"`，對應欄位至 code/name/shares/weight
- [x] [P] 3.3 在 `_dispatch()` 加入 `if issuer == "ctbc": return _fetch_ctbc(fund_code)` 分支
- [x] [P] 3.4 本地 dry-run 驗證：`fetch_holdings("00995A")` 回傳非空 DataFrame，非 STOCK 資產已過濾

## 4. 兆豐直接 API — 兆豐 (00986A)：requests + BeautifulSoup 解析靜態 HTML

- [x] [P] 4.1 瀏覽 `https://www.megafunds.com.tw/MEGA/etf/` 確認 00986A 的 `fund_id`（Fetch 00986A holdings via Mega Funds official HTML page，預期為數字字串如 `"22"` 等）
- [x] [P] 4.2 在 CATALOG 新增 `"00986A"` 條目：`issuer="mega"`, `fund_code="<確認值>"`, `fund_id="<確認值>"`（若無法確認則 `fund_id=None`）
- [x] [P] 4.3 實作 `_fetch_mega(fund_id: str | None) -> list[dict]`：若 `fund_id` 為 None，log warning `"[MEGA] fund_id not configured for 00986A"` 並 return `[]`；否則 GET `https://www.megafunds.com.tw/MEGA/etf/etf_product.aspx?id={fund_id}`，BeautifulSoup 解析 `<div id="fund_content_list_1">` 下 `<div class="fund-info">`，取四欄（code/name/shares/weight），過濾非 `^\d{4,6}$` 代號，regex 取日期 `(\d{4})/(\d{2})/(\d{2})`
- [x] [P] 4.4 在 `_dispatch()` 加入 `if issuer == "mega"` 分支，從 CATALOG 讀取 `fund_id`
- [x] [P] 4.5 本地 dry-run 驗證：`fetch_holdings("00986A")` 回傳非空 DataFrame（或若 fund_id 未確認，確認 warning log 正確觸發）

## 5. 元大 MoneyDJ Fallback — 元大 (00990A) MoneyDJ fallback 觸發條件

- [x] [P] 5.1 在 `ETF/scrapers/yuanta_scraper.py` 新增 `_fetch_moneydj_fallback(etf_code: str) -> pd.DataFrame`（MoneyDJ HTML fallback for 00990A when Playwright fails）：GET `https://www.moneydj.com/ETF/X/Basic/Basic0007B.xdjhtm?etfid={etf_code}.TW`，`verify=False`，BeautifulSoup 解析 `table.datalist tr`，取 code(col 0)/name(col 1)/weight(最後欄, strip `%`)，shares=0，過濾非 `^\d{4,6}$` 代號；任何例外回傳空 DataFrame
- [x] [P] 5.2 修改 `fetch_holdings()` 的 Playwright 區塊：`except` 捕捉所有例外時，log warning 並呼叫 `_fetch_moneydj_fallback(etf_code)` 回傳（Fetch complete PCF holdings from Yuanta official website 在此路徑仍有保障）
- [x] [P] 5.3 修改 `fetch_holdings()` 的 `__NUXT__` 為空判斷：在 `if not nuxt_state:` 分支改為 log warning 並 fallback 到 MoneyDJ
- [x] [P] 5.4 修改 `fetch_holdings()` 的持股數不足判斷：`_extract_stock_weights()` 回傳 `None` 或 `len < 3` 時 log warning（含數量）並呼叫 MoneyDJ fallback
- [x] [P] 5.5 本地 dry-run 驗證：模擬 Playwright 失敗路徑（暫時改 url 為無效 url），確認 fallback 從 MoneyDJ 取到 00990A 資料

## 6. 備援策略確認 — 備援策略：直接 API 失敗後仍 fallback 到 Pocket.tw

- [x] 6.1 確認 `multi_etf_step.py` 的 `official_api` → Pocket.tw fallback 邏輯仍正常運作（備援策略：直接 API 失敗後仍 fallback 到 Pocket.tw），無需修改
- [x] 6.2 修改 `ETF/config/etf_registry.py`：將 `00987A`、`00994A`、`00995A` 的 `source` 由 `"pocket"` 改為 `"official_api"`（`00986A` 視 fund_id 確認結果決定）
- [x] 6.3 修改 `src/lib/investment/etfRegistry.ts`：對應 `00987A`、`00994A`、`00995A` 的 `dataSource` 由 `'pocket'` 改為 `'official_api'`

## 7. 清理與驗證

- [x] 7.1 刪除 `ETF/scrapers/official_api_scraper.py` 中 CATALOG 的 `"00990A"` 條目（元大已改走 `issuer="yuanta"` dispatch 路徑，CATALOG 重複條目需移除）
- [x] 7.2 執行 `uv run pytest ETF/` 確認現有測試通過
- [x] 7.3 執行 `uv run ruff check --fix && uv run ruff format` 確認 lint 通過
- [x] 7.4 執行完整 pipeline dry-run `uv run python ETF/main.py --dry-run`，確認 5 支 ETF（00986A/00987A/00990A/00994A/00995A）的 scrape log 顯示來源正確
