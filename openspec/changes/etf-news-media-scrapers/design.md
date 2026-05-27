## Context

ETF Pipeline 目前透過 `NewsContextStep` 呼叫 MOPS API 取得官方重大公告，存入 `etf_news` 表（`source = "公開資訊觀測站"`）。`etf_news` 已有 `stock_code, etf_code, pub_date, pub_time, title, source, url, company_name, content` 欄位，可直接容納媒體新聞（`content / speaker / event_date` 對媒體新聞為 NULL）。

參考 stock-data-ai/stock-data 的架構，三個目標媒體：
- **CNYES（鉅亨網）**：`https://www.cnyes.com/twstock/{code}/news` 頁面含 `__NEXT_DATA__` SSR JSON
- **經濟日報（UDN）**：UDN REST API `https://udn.com/api/more?page=1&id=search&type=news&kw={keyword}`
- **MoneyDJ**：`https://www.moneydj.com/KMDJ/News/NewsViewer.aspx?a={code}` HTML 列表

Pipeline 位置：`NewsMediaStep` 插入 `NewsContextStep` 之後、`NotifyStep` 之前。

## Goals / Non-Goals

**Goals:**
- 為 ETF 前十大持股抓取三個媒體來源的近期新聞（標題 + URL + 日期）
- 寫入現有 `etf_news` 表，`source` 欄位區分來源
- 輔助步驟：失敗不中斷 Pipeline
- 僅用 `requests` + `BeautifulSoup`，不引入 Playwright / Selenium
- 寫入後 `ctx.news_context` 補充媒體新聞（供 AI 報告使用）

**Non-Goals:**
- 不抓取新聞全文（只要標題 + URL）
- 不新增 DB schema（直接用現有 `etf_news` 欄位）
- 不處理付費牆內容
- 不支援美股或非台股標的
- MoneyDJ 若 HTML 結構變動導致解析失敗，靜默跳過（不報警）

## Decisions

### 不使用 Playwright，改用 requests + SSR JSON 解析

CNYES 頁面為 Next.js SSR，直接 `requests.get()` 即可取得含 `__NEXT_DATA__` 的 HTML，再用 `re.search` 或 `BeautifulSoup` 提取 JSON。stock-data-ai 使用 Playwright 是因其同時需要截圖與互動功能，我們只取資料不需要瀏覽器渲染。

替代方案：Playwright headless → 否決，依賴重（需安裝 chromium）、速度慢、CI 需額外配置。

### UDN 用關鍵字 API，不用 undetected-chromedriver

UDN 有公開搜尋 API：`https://udn.com/api/more?page=1&id=search&type=news&kw={stock_code}`，回傳 JSON 含標題、URL、時間，無需繞過 bot 偵測。stock-data-ai 使用 undetected-chromedriver 是因為他們需要公司**名稱**關鍵字搜尋（有 bot 保護），我們可用股票代碼作為關鍵字，直接打 API。

替代方案：undetected-chromedriver → 否決，依賴重、本地/CI 環境複雜。

### 每支股票單獨查詢，限速 0.3s 間隔

三個媒體均對頻繁請求有限速，單獨查詢 + sleep 可避免 429。每個 ETF 最多查 TOP_N=10 支股票，跨 ETF 去重後通常 30–50 支，總查詢次數可控（每個來源 < 50 次，約 15–20 秒）。

替代方案：批次 API → CNYES 與 MoneyDJ 無批次端點，UDN 批次需付費。

### `ctx.news_context` 合併 MOPS + 媒體新聞

`NewsContextStep` 已將 MOPS 公告放入 `ctx.news_context`。`NewsMediaStep` 執行後，將媒體新聞（限 00981A 持股）**追加**到 `ctx.news_context`，使 AI Prompt 同時包含官方公告與市場報導。

替代方案：分開欄位 → 否決，`reporter.py` 只讀 `ctx.news_context` 一個欄位，改它需修改更多地方。

### DB 去重用 ON CONFLICT DO NOTHING

`etf_news` 已有 unique constraint（`etf_code, stock_code, pub_date, title`），媒體新聞 upsert 時直接 `ON CONFLICT DO NOTHING`，避免同日重複抓取覆蓋已有資料。

## Risks / Trade-offs

- [CNYES `__NEXT_DATA__` 結構變動] → 靜默跳過，記錄 warning，不中斷 Pipeline
- [UDN API 未來需付費或改版] → 靜默降級，`udn_client.py` 模組化設計，可獨立替換
- [MoneyDJ HTML 解析脆弱] → `try/except` 全包，失敗只 log，不影響其他來源
- [CI 執行時間增加] → 預估每日新增 ~30 秒（50 支股票 × 3 來源 × 0.2s），在預算內
