# Tasks: ETF Tracker V1

- [ ] **Phase 1: Database & Backend Infrastructure**
    - [ ] 執行 SQL 遷移，建立 `etf_holdings_snapshot` 與 `etf_diff_logs` 資料表。
    - [ ] 初始化 Python 模組結構於 `ETF/`。
    - [ ] 實作 `ETF/scrapers/unified_scraper.py` (針對 00981A 官網解析)。

- [ ] **Phase 2: Core Logic & Storage**
    - [ ] 實作 `ETF/engine/diff_processor.py`：比對今日 vs 昨日，產出異動清單。
    - [ ] 實作 `ETF/storage/cloud_backup.py`：將原始明細備份至 GitHub/Google Drive。

- [ ] **Phase 3: LINE Notification**
    - [ ] 實作 LINE Flex Message 生成器。
    - [ ] 整合已有的 `LINE_CHANNEL_ACCESS_TOKEN` 發送異動通報。

- [ ] **Phase 4: Web UI Development**
    - [ ] 建立 `/investment` 頁面與基礎排版。
    - [ ] 實作持股列表組件，支援雙向排序與異動圖示標記。
    - [ ] 實做簡單的權重分布圖表。

- [ ] **Phase 5: Task Automation**
    - [ ] 建立 `.github/workflows/etf_daily_sync.yml`。
    - [ ] 配置每日 20:00 (CST) 定時執行與相關 Secrets。
