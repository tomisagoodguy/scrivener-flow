## 1. 新增 yuanta_scraper.py 模組

- [x] 1.1 建立獨立模組 `yuanta_scraper.py`（非直接嵌入 official_api_scraper），實作 `fetch_holdings(etf_code: str) -> pd.DataFrame`：使用 Playwright 而非 requests + HTML 解析，以 `playwright.sync_api` 啟動 headless Chromium，導航至 `https://www.yuantaetfs.com/tradeInfo/pcf/{etf_code}`，等待 `networkidle`（最多 60 秒），再以 `page.evaluate()` 取得 `window.__NUXT__` 並按照 NUXT state 解析路徑：遍歷 `.data[]` 找含 `pcfData` 的項目，取 `pcfData.FundWeights.StockWeights`
- [x] 1.2 實作 stock code 清理邏輯：去除 `s.code` 的交易所後綴（`TW` / `US` / `JP` / `HK` / `KP` 等），符合「fetch complete PCF holdings from Yuanta official website」規格中的 code cleanup 範例
- [x] 1.3 欄位映射：`s.code` → `code`，`s.name or s.ename` → `name`，`s.qty`（去逗號轉 int）→ `shares`，`s.weights`（float）→ `weight`；過濾 `weight <= 0` 的列
- [x] 1.4 加入完整錯誤處理：`window.__NUXT__` 為 None、`pcfData` 缺失、page load timeout 時 log warning 並回傳 empty DataFrame（不 raise）；符合「Empty NUXT state」與「Page load timeout」場景

## 2. 整合 official_api_scraper

- [x] [P] 2.1 在 `ETF/scrapers/official_api_scraper.py` 的 `CATALOG` dict 新增 `"00990A": {"issuer": "yuanta", "name": "元大AI新經濟", "fund_code": "00990A"}`；符合「integrate yuanta scraper into official_api_scraper dispatch」規格
- [x] [P] 2.2 在 `official_api_scraper.fetch_holdings()` 的 issuer dispatch 區塊加入 `elif issuer == "yuanta"` 分支，lazy import `ETF.scrapers.yuanta_scraper` 並呼叫 `yuanta_scraper.fetch_holdings(etf_code)`

## 3. 更新 ETF Registry

- [x] [P] 3.1 修改 `ETF/config/etf_registry.py`：將 00990A 的 `source` 從 `"pocket"` 改為 `"official_api"`；符合「register 00990A as official_api in ETF registries」規格
- [x] [P] 3.2 修改 `src/lib/investment/etfRegistry.ts`：將 00990A 的 `dataSource` 從 `'pocket'` 改為 `'official_api'`

## 4. 手動驗證

- [x] 4.1 本地執行 `uv run python -c "from ETF.scrapers.yuanta_scraper import fetch_holdings; import pandas as pd; df = fetch_holdings('00990A'); print(df.shape, df.head(3))"` 確認回傳 40+ 筆持股
- [x] 4.2 執行 `uv run python ETF/main.py --dry-run` 確認 multi_etf_step 對 00990A 調用 `official_api_scraper`（觀察 log 出現 `[Yuanta]` 而非 `pocket`）
