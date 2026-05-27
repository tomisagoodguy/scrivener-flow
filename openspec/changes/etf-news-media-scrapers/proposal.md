## Why

目前 ETF Pipeline 的新聞蒐集僅限於 MOPS 重大公告（官方揭露），缺乏財經媒體的市場分析報導。參考 stock-data-ai/stock-data 的架構，加入 CNYES、經濟日報、MoneyDJ 三個媒體來源，可讓 AI 報告掌握更完整的市場情緒與分析視角。

## What Changes

- 新增 `ETF/services/news/cnyes_client.py`：抓取鉅亨網個股新聞（`__NEXT_DATA__` SSR JSON，無需 Playwright）
- 新增 `ETF/services/news/udn_client.py`：抓取經濟日報個股新聞（UDN API）
- 新增 `ETF/services/news/moneydj_client.py`：抓取 MoneyDJ 個股新聞（BeautifulSoup 解析）
- 新增 `ETF/pipeline/steps/news_media_step.py`：`NewsMediaStep`，聚合三個媒體來源，寫入現有 `etf_news` 表
- 修改 `ETF/pipeline/orchestrator.py`：在 `NewsContextStep` 後插入 `NewsMediaStep`
- 現有 `etf_news` 表 schema 不需變更，透過 `source` 欄位區分來源

## Capabilities

### New Capabilities

- `cnyes-news-scraper`：從鉅亨網抓取指定股票代碼的近期新聞標題與連結
- `udn-news-scraper`：從經濟日報 UDN API 抓取指定股票代碼的近期新聞
- `moneydj-news-scraper`：從 MoneyDJ 抓取指定股票代碼的近期新聞
- `etf-news-media-step`：Pipeline 步驟，協調三個媒體爬蟲並批次寫入 `etf_news`

### Modified Capabilities

(none)

## Impact

- Affected specs: cnyes-news-scraper, udn-news-scraper, moneydj-news-scraper, etf-news-media-step
- Affected code:
  - New: ETF/services/news/cnyes_client.py
  - New: ETF/services/news/udn_client.py
  - New: ETF/services/news/moneydj_client.py
  - New: ETF/pipeline/steps/news_media_step.py
  - Modified: ETF/pipeline/orchestrator.py
