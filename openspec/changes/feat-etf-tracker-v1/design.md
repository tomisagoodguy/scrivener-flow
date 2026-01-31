# Design: ETF Tracker V1

## Architectural Reasoning

本系統設計核心為「節省雲端成本」與「提升抓取韌性」。

### 1. 儲存架構 (Storage Strategy)
為了讓 Supabase 免費版 (500MB) 永不爆掉，我們採用以下對策：
- **DB 精簡化**：不儲存每日重複的持股明細，轉而儲存：
    1. `etf_holdings_snapshot`: 只保留最後一次成功的完整數據（用於 Web 報表）。
    2. `etf_diff_logs`: 只存有變動的事件（用於通知與異動清單）。
    3. `etf_holding_periods`: 紀錄個股「何時進、何時出」，數據量極小。
- **Git 長期備份**：全量的歷史 CSV 明細由 GitHub Actions 在執行結束後，自動 `git commit` 回 Repo。GitHub 提供巨大的存儲空間，且檔案系統在檢閱歷史數據上非常高效。

### 2. 資料獲取與穩定性 (Fetch & Robustness)
- **Scraper Engine**: 優先使用輕量級 `requests` 抓取下載連結。若偵測到網頁結構改變或需要 JS 執行，則無縫切換至 `Playwright` 模擬瀏覽器行為。
- **Data Cleanup**: 統一處理不同日期格式 (ROC/AD) 與欄位名稱映射。

### 3. LINE Flex Message 設計
- 使用 JSON 結構定義卡片。
- 將 `新進 (🚀)` 與 `剔除 (🗑️)` 置於頂部以提升可讀性。
- 提供 Web Dashboard 的深層鏈接（Deep Link）。

### 4. 網頁端 UX
- 使用 React Query 緩存資料。
- 支援「投資比例」與「比例增減」兩套排序排序邏輯。
- 色彩方案：紅漲綠跌（台股慣例），加強視覺回饋。
