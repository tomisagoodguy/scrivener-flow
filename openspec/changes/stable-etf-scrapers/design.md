## Context

ETF Pipeline 目前有 4 支主動 ETF（00986A/00987A/00994A/00995A）使用 Selenium headless Chrome 爬 Pocket.tw，這是因為當初這 4 家投信官網 API 尚未破解。經研究 stock-data-ai/stock-data 開源專案，已確認各家投信均有可直接呼叫的 API 或可用 requests + BeautifulSoup 解析的靜態 HTML，不需要 Selenium。

元大 (00990A) 目前已使用 Playwright + `window.__NUXT__`，但 Nuxt 版本升級可能使 `__NUXT__` 結構改變，歷史上已發生過一次。MoneyDJ 有對應的靜態 HTML 頁面可作備援。

## Goals / Non-Goals

**Goals:**

- 為 00986A/00987A/00994A/00995A 實作投信直接 API fetcher，整合至 `official_api_scraper.py`
- 更新 `etf_registry.py` 與 `etfRegistry.ts` 中這 4 支 ETF 的來源欄位
- 為元大 (00990A) 加入 MoneyDJ HTML fallback，當 Playwright 失敗或 `__NUXT__` < 3 筆時觸發

**Non-Goals:**

- 統一 ezmoney XLSX（00981A/00988A/00403A）不在本期
- 安聯 antiforgery token 機制重構不在本期
- MoneyDJ 作為全體 ETF 通用第三層 fallback 不在本期

## Decisions

### 台新 (00987A)：requests + BeautifulSoup 解析靜態 HTML

**選擇**：GET `https://www.tsit.com.tw/ETF/Home/ETFSeriesDetail/00987A`，用 BeautifulSoup 解析 `<th>代號</th>` 後的表格，以及 `id="PUB_DATE"` input 取資料日期。

**放棄**：Selenium（沒必要，頁面為 server-side rendering，HTML 直接含資料）。

回傳格式：`code(str), name(str), shares(int), weight(float)`

### 第一金 (00994A)：REST API POST JSON

**選擇**：`POST https://www.fsitc.com.tw/WebAPI.aspx/Get_hd`，body `{"pStrFundID": "182", "pStrDate": ""}`，解析 `res["d"]` JSON 字串（需再做一次 `json.loads`）。

**放棄**：Selenium（官方 API 已存在，直接使用）。

fund_id `182` 對應 `主動第一金台股優`，如未來新增第一金其他 ETF 需另查。

### 中信 (00995A)：兩步驟 REST API（先取 auth token）

**選擇**：
1. `POST https://www.ctbcinvestments.com.tw/API/home/AuthToken` body `{"token": "www.ctbcinvestments.com"}` 取 `Data.token`
2. `POST https://www.ctbcinvestments.com.tw/API/etf/ETFHoldingWeight` body `{"token": token, "FID": "E0036", "StartDate": ""}` 解析 `Data.FundAssetsDetail`，篩選 `asset code == "STOCK"`

**放棄**：Selenium（官方 API 已存在）。

Token 無須持久化，每次請求前取新的即可（有效期短）。

### 兆豐 (00986A)：requests + BeautifulSoup 解析靜態 HTML

**選擇**：GET `https://www.megafunds.com.tw/MEGA/etf/etf_product.aspx?id={fund_id}`，解析 `<div id="fund_content_list_1">` 下所有 `<div class="fund-info">`。

**關鍵**：`fund_id` 需預先確認（00996A = 23，00986A fund_id 待驗證）。在 CATALOG 中紀錄，`fetch_mega()` 執行前自行查閱 `https://www.megafunds.com.tw/MEGA/etf/` 確認。實作時以 `fund_id=None` guard，若未設定則靜默回傳空 DataFrame 並 log warning。

### 元大 (00990A) MoneyDJ fallback 觸發條件

**選擇**：`yuanta_scraper.py` 的 `fetch_holdings()` 中，以下任一條件觸發 fallback：
1. Playwright 拋出任何例外
2. `window.__NUXT__` 為空
3. 解析出的 `stock_weights` 長度 < 3

fallback 函式：`_fetch_moneydj_fallback(etf_code: str) -> pd.DataFrame`，GET `https://www.moneydj.com/ETF/X/Basic/Basic0007B.xdjhtm?etfid={etf_code}.TW`，BeautifulSoup 解析 `table.datalist tr`，取代號/名稱/權重三欄（MoneyDJ 無法取到 shares，填 0）。

### 備援策略：直接 API 失敗後仍 fallback 到 Pocket.tw

`multi_etf_step.py` 的現有邏輯：`official_api_scraper` 失敗時已有 fallback 到 `pocket_scraper`，本次只需把 4 支 ETF 的 `source` 改成 `official_api` 即可利用此機制，**不需修改 `multi_etf_step.py`**。

## Risks / Trade-offs

- **兆豐 fund_id 不確定** → 實作前需手動瀏覽 `megafunds.com.tw` 確認 00986A 的 fund_id，若無法確認則暫時保留 pocket 來源，下一期補完
- **中信 auth token 有效期未知** → 每次抓取前重新取 token，不快取，確保每次都有效；代價是多一次 HTTP round-trip
- **MoneyDJ shares 欄位缺失** → MoneyDJ 表格不含股數，fallback 路徑 shares 欄位填 0；前端顯示 shares 為 0 時不影響權重顯示

## Migration Plan

1. 新增 4 個 fetcher 到 `official_api_scraper.py` 的 CATALOG + dispatch
2. 更新 `etf_registry.py` 和 `etfRegistry.ts`（4 支改為 `official_api`）
3. 修改 `yuanta_scraper.py` 加入 MoneyDJ fallback 路徑
4. 本地 dry-run 驗證 5 支 ETF 均可抓到持股
5. 推送，CI 自動驗證

Rollback：若任一 API 失敗，`multi_etf_step` 的現有 fallback 機制會切回 Pocket.tw，不需額外操作。
