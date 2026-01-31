# Tasks: ETF Tracker V1

- [x] **Phase 1: Database & Backend Infrastructure**
    - [x] 執行 SQL 遷移，建立 `etf_holdings_snapshot` 與 `etf_diff_logs` 資料表。
    - [x] 初始化 Python 模組結構於 `ETF/`。
    - [x] 實作 `ETF/scrapers/unified_scraper.py` (針對 00981A 官網解析)。

- [x] **Phase 2: Core Logic & Storage**
    - [x] 實作 `ETF/engine/diff_processor.py`：比對今日 vs 昨日，產出異動清單。
    - [x] 實作 `ETF/storage/cloud_backup.py`：將原始明細備份至 GitHub。

- [x] **Phase 3: LINE Notification**
    - [x] 實作 LINE Flex Message 生成器。
    - [x] 整合已有的 `LINE_CHANNEL_ACCESS_TOKEN` 發送異動通報。

- [x] **Phase 4: Web UI Development**
    - [x] 建立 `/investment` 頁面與基礎排版。
    - [x] 實作持股列表組件，支援雙向排序與異動圖示標記。
    - [ ] 實做簡單的權重分布圖表 (Pie Chart)。

- [x] **Phase 5: Task Automation**
    - [x] 建立 `.github/workflows/etf_daily.yml`。
    - [x] 配置每日 20:00 (CST) 定時執行與相關 Secrets。
