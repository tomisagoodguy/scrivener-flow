## Why

現有投資儀表板只追蹤 ETF 持股異動（IN/OUT/BUY/SELL），缺乏籌碼面視角。加入股東分散表排行讓用戶一眼看出 11 支 E經理人 ETF 成分股中，哪些正在被大戶吸籌、哪些散戶在出走。

## What Changes

- 新增 `equity_distribution_stats` DB 表：每週儲存 ETF 成分股的股東分散快照（總股東人數、大戶持股%、與前期變化）
- 新增 Python 同步腳本 `ETF/sync_equity_distribution.py`：從 FinLab 拉 TDCC 股東分散表，股票池動態從 `etf_holdings_snapshot` 讀取（不寫死 ETF 代碼），確保新增 ETF 後自動涵蓋其成分股
- 新增頁面 `/investment/equity`：顯示兩個 Top 10 排行榜
  - **主力買進**：大戶持股比例（400 張以上）增加幅度 Top 10
  - **散戶減少**：總股東人數降幅 Top 10
  - 每列顯示：股票名稱、總股東人數、總股東人數變化率、大戶持股比例變化
- 新增 GitHub Actions 排程（每週一 09:00 UTC+8）執行同步腳本

## Capabilities

### New Capabilities
- `equity-distribution-sync`：Python 端同步腳本——動態讀取全部 ETF 成分股代碼 → 呼叫 FinLab 取最近兩期股東分散表 → 計算期間變化 → 寫入 `equity_distribution_stats`
- `equity-distribution-ranking-page`：前端排行榜頁面——從 DB 讀取最新一期資料、依兩種維度各取 Top 10、呈現卡片式排行榜

### Modified Capabilities
（無）

## Impact

- **新增 DB 表**：`equity_distribution_stats`（需新增 migration SQL）
- **新增 Python**：`ETF/sync_equity_distribution.py`（依賴 `ETF/config/etf_registry.py`，但不直接讀 ETF 清單——改讀 DB 中已有的成分股池，確保未來新 ETF 無需改腳本）
- **新增前端**：`src/app/investment/equity/page.tsx`
- **新增 GHA**：`.github/workflows/equity_weekly.yml`
- **FinLab 配額**：每次同步約 ~500 支股票 × 2 期資料，預估 < 50MB
- **無 breaking change**
