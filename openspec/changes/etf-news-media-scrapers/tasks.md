## 1. CNYES 爬蟲（cnyes-news-scraper）

- [x] 1.1 建立 `ETF/services/news/cnyes_client.py`，實作 `fetch_cnyes_news(stock_codes: list[str]) -> list[dict]`：不使用 Playwright，改用 requests + SSR JSON 解析策略（見設計決策）；對每支 `stock_code` GET `https://www.cnyes.com/twstock/{code}/news`，用 `re.search(r'<script id="__NEXT_DATA__"[^>]*>(.*?)</script>', html)` 提取 JSON，從 `props.pageProps.symbolNews.data` 取前 10 筆，每筆回傳 `{stock_code, title, url("https://news.cnyes.com/news/id/{newsId}"), pub_date(Unix timestamp → YYYY-MM-DD), source("鉅亨網")}`；任何例外靜默回傳 `[]`；每支股票單獨查詢，限速 0.3s 間隔（`time.sleep(0.3)`）；實作「Fetch stock news from CNYES」需求
- [x] 1.2 處理「Graceful degradation when __NEXT_DATA__ is absent」場景：`re.search` 返回 None 或 JSON 缺少 `props.pageProps.symbolNews.data` 時，`logger.warning(f"CNYES no data for {code}")` 後 return `[]`
- [x] 1.3 處理「Graceful degradation on HTTP error」場景：`requests.get()` 拋出例外或 status_code >= 400 時，`logger.warning(...)` 後 return `[]`；timeout 設 15 秒；加 `User-Agent` header 模擬瀏覽器

## 2. 經濟日報爬蟲（udn-news-scraper）

- [x] 2.1 建立 `ETF/services/news/udn_client.py`，實作 `fetch_udn_news(stock_codes: list[str]) -> list[dict]`：UDN 用關鍵字 API，不用 undetected-chromedriver（見設計決策），直接 GET `https://udn.com/api/more?page=1&id=search&type=news&kw={code}`，解析回傳 JSON 的 `result.items` 陣列，取前 10 筆，每筆回傳 `{stock_code, title(item["title"]), url(item["url"]), pub_date(item["time"] 前 10 字元), source("經濟日報")}`；任何例外靜默回傳 `[]`；每支股票單獨查詢，限速 0.3s 間隔；實作「Fetch stock news from UDN Economic Daily」需求
- [x] 2.2 處理「Graceful degradation when API returns unexpected JSON」場景：JSON 缺少 `result` 或 `items` 時，`logger.warning(...)` 後 return `[]`，不 raise
- [x] 2.3 處理「Graceful degradation on HTTP error」場景：HTTP 4xx/5xx 時 log warning 後 return `[]`；timeout 設 15 秒

## 3. MoneyDJ 爬蟲（moneydj-news-scraper）

- [x] 3.1 建立 `ETF/services/news/moneydj_client.py`，實作 `fetch_moneydj_news(stock_codes: list[str]) -> list[dict]`：對每支 `stock_code` GET `https://www.moneydj.com/KMDJ/News/NewsViewer.aspx?a={code}`，用 BeautifulSoup 找新聞列表（selector: `table.datalist tr` 或 `div.news-list a`，依實際 HTML 為準），取前 10 筆，每筆回傳 `{stock_code, title, url("https://www.moneydj.com" + href), pub_date(YYYY-MM-DD), source("MoneyDJ")}`；任何例外靜默回傳 `[]`；每支股票間 `time.sleep(0.3)`；實作「Fetch stock news from MoneyDJ」需求
- [x] 3.2 處理「Graceful degradation when HTML structure changes」場景：BeautifulSoup 找不到預期 selector 時，`logger.warning(f"MoneyDJ HTML structure changed for {code}")` 後 return `[]`
- [x] 3.3 處理「Graceful degradation on HTTP error」場景：HTTP error 時 log warning 後 return `[]`；timeout 設 15 秒；加 `Referer: https://www.moneydj.com/` header

## 4. Pipeline 步驟（etf-news-media-step）

- [x] 4.1 建立 `ETF/pipeline/steps/news_media_step.py`，繼承 `BaseStep`，實作 `name = "News Media"`；`should_skip()` 回傳 `ctx.is_dry_run or ctx.df is None or ctx.df.empty`；`execute()` 外層 `try/except` 不 raise，只 `logger.error()`；實作「NewsMediaStep integrates media scrapers into pipeline」需求
- [x] 4.2 在 `execute()` 中複用 `NewsContextStep._fetch_all_etf_top_codes()`（或獨立查詢邏輯）取得各 ETF 前十大持股，對 all_codes（去重）依序呼叫三個爬蟲，收集 media_news；實作「Step does not interrupt pipeline on partial scraper failure」場景：三個爬蟲各自包 try/except，互不影響
- [x] 4.3 對每個 ETF 依持股代碼篩選 media_news，呼叫 `services.sql_storage.upsert_etf_news(etf_code, etf_news)`；實作「DB 去重用 ON CONFLICT DO NOTHING」設計決策：確認 `upsert_etf_news()` 的 ON CONFLICT 子句為 `DO NOTHING`（如現有為 `DO UPDATE`，改為：`DO UPDATE SET content = COALESCE(EXCLUDED.content, etf_news.content)` 等，保持媒體新聞不覆蓋已有 MOPS 內容）；「DB upsert uses ON CONFLICT DO NOTHING for media news」場景驗證
- [x] 4.4 實現「`ctx.news_context` 合併 MOPS + 媒體新聞」設計決策：將 00981A（`ctx.etf_code`）持股的媒體新聞 append 到 `ctx.news_context`（過濾重複 title），使 AI Prompt 同時包含官方公告與市場報導
- [x] 4.5 在 `ETF/pipeline/orchestrator.py` 中 `import NewsMediaStep`，插入到 `NewsContextStep` 之後（找到 `steps` 列表中 `NewsContextStep` 的位置，在其後加入 `NewsMediaStep()`）；實作「Step skips on dry run」場景驗證方式：dry run 時 `should_skip()` 回傳 True

## 5. 驗證

- [x] 5.1 本地執行 `uv run python -c "from ETF.services.news.cnyes_client import fetch_cnyes_news; r = fetch_cnyes_news(['2330']); print(len(r), r[:1])"` 確認至少取到 1 筆且 source 為「鉅亨網」
- [x] 5.2 本地執行 `uv run python -c "from ETF.services.news.udn_client import fetch_udn_news; r = fetch_udn_news(['2330']); print(len(r), r[:1])"` 確認至少取到 1 筆且 source 為「經濟日報」
- [x] 5.3 本地執行 `uv run python -c "from ETF.services.news.moneydj_client import fetch_moneydj_news; r = fetch_moneydj_news(['2330']); print(len(r), r[:1])"` 確認至少取到 1 筆且 source 為「MoneyDJ」，若 MoneyDJ selector 不匹配則調整 3.1 的 selector
- [x] 5.4 執行 `uv run python ETF/main.py --dry-run` 確認 Pipeline 可正常啟動且 NewsMediaStep 出現在步驟列表中（因 dry run，`should_skip()` 回傳 True，不實際抓取）
