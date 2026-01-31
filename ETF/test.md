# ETF 功能開發討論紀錄

## 參考資料
- [00981A-ETF-Tracker (GitHub)](https://github.com/kf182698/00981A-ETF-Tracker)
- 標的全名：**主動統一台股增長 (00981A.TW)**

---

## 📅 2026-01-31 討論紀錄：V1 最終規格整合 (吸收參考專案優點) ✅

經過對參考專案的研究，我們決定將以下高級特性納入 V1 實作，確保系統的穩定性與專業度：

### 1. 抓取穩定性 (Scraping Robustness)
- **技術方案**：在 Python 模組中**預留 Playwright 介面**。
- **目的**：應對統一/復華官網可能的 JavaScript 渲染或防爬機制，確保資料下載不中斷。

### 2. 資料歷史與帳本 (History Ledger)
- **長期歷史帳本 (Supabase)**：除了今日快照，額外維護一個 `etf_holding_history` 資料表，記錄每支股票「進入」與「離開」組合的日期。
- **持有週期圖**：這將支持 Web 端顯示「該股票已被持有幾天」以及長期的持有週期分析。

### 3. 自動化備份機制 (Auto-Backup)
- **Git 自動 Commit**：捨棄純 Google Drive，改為每日執行完畢後，**自動將資料 commit 回 GitHub Repository** 中的 `ETF/data/` 目錄。
- **優點**：檔案管理更直觀、不佔資料庫容量，且能直接在 GitHub 看到異動歷史。

### 4. 數據細節 (V1 欄位)
- 除了權重，必備 **「股數變動」** 欄位，以區分「市值增長」與「經理人實際買入」。

---

## 🏗️ 實作計畫 (OpenSpec 更新版)

### Phase 1: 基礎設施
- Supabase Schema: `etf_holdings_snapshot`, `etf_diff_logs`, `etf_holding_periods`.
- Python: `uv add playwright`, `playwright install`.

### Phase 2: Python 核心
- 實作具備 Playwright 彈性的模組化 Scraper。
- 實作帶有 Git Auto-Commit 功能的 Storage 模組。

### Phase 3: LINE & Web
- LINE Flex Message (含新進/剔除標記)。
- Web 投資監控分頁 (支援雙向排序、持有週期顯示)。

---

**[結案存檔]：討論階段正式完成。規格已優化至最高水準。**
