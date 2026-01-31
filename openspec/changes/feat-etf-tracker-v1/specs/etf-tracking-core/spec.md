# Spec: ETF Tracking Core

## MODIFIED Requirements

### Req: Hybrid Storage Mechanism
系統必須在節省資料庫空間的前提下，保留完整歷史與即時查詢功能。
- #### Scenario: Database Cleanup
    - **Given** 系統完成今日抓取。
    - **When** 寫入 Supabase 時。
    - **Then** 更新最新快照並僅寫入「異動事件」，不儲存冗餘的重複持股資料。
- #### Scenario: Git Auto-Archive
    - **Given** 爬蟲任務執行結束。
    - **When** 產生 CSV 報表後。
    - **Then** 自動透過 git 指令將檔案提交至 `ETF/history/` 目錄。

### Req: Robust Scraping with Playwright
系統必須能應對具備動態內容或防爬機制的官網。
- #### Scenario: JS Rendering Handling
    - **Given** 官網改版為單頁應用 (SPA)。
    - **When** 基本 requests 抓取失敗。
    - **Then** 自動調用 Playwright 模擬點擊下載。

### Req: Investment Analytics UI
Web 介面必須提供多維度排序與週期追蹤。
- #### Scenario: Sorting Capabilities
    - **Given** 用戶在投資監控頁面。
    - **When** 切換「投資比例」或「比例增減」排序。
    - **Then** 表格內容立即反應更新。
