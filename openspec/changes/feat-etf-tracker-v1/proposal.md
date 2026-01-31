# Proposal: ETF Tracker V1 - 00981A Tracking & Automation

## ID: feat-etf-tracker-v1
## Author: Antigravity
## Status: Drafting

## Problem
用戶需要追蹤主動式 ETF「主動統一台股增長 (00981A.TW)」的持股變動，目前缺乏自動化抓取、歷史對比、LINE 通報及 Web 端視覺化呈現的整合方案。需解決資料庫容量限制與爬蟲抓取穩定性的問題。

## Proposed Changes
實作一套高度穩定且節省資源的 ETF 追蹤系統：
1. **強化版爬蟲**：每日 20:00 執行，預留 **Playwright** 介面以應對動態網頁，抓取 Excel 並計算「今日 vs 昨日」之權重與**股數變動**。
2. **混合儲存策略 (Hybrid Storage)**：
    - **Supabase (DB)**：僅存儲「最新持股快照」、「異動紀錄 (Diff)」及「持股週期紀錄」，確保在免費層級下數據庫空間不爆掉。
    - **GitHub Repository (Git)**：每日自動將完整歷史資料 (CSV) commit 並備份至 `ETF/history/`，提供無限量的歷史存檔。
3. **LINE 異動通報**：透過現有 LINE Bot 發送專業的 **Flex Message**。
4. **Web 端視覺化**：新增獨立「投資監控」分頁，支援雙向排序（投資比例、比例增減）及持有週期分析展示。

## Capabilities
- **Robust Scraping**: 支援 Requests/Playwright 雙模抓取，確保穩定性。
- **Delta Analysis**: 識別新進、剔除、加減碼及股數異動。
- **Auto-Commit Backup**: 自動化 Git 歷史存檔機制。
- **Performance-First Dashboard**: 最小化 DB 查詢，提供流暢的 Web 體驗。

## Impact
- **Database**: 新增 `etf_holdings_snapshot`, `etf_diff_logs`, `etf_holding_periods`。
- **Infrastructure**: 新增 GitHub Actions 工作流定義。
