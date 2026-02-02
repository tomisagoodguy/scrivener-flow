---
title: 投資儀表板增強 - 財務與籌碼分析 (Financials & Chips Analysis)
status: proposed
author: Antigravity
created: 2026-02-02
---

# 投資儀表板增強 - 財務與籌碼分析

## 1. 目標 (Objective)

增強 `/investment` 儀表板的詳細視圖 (`PriceChartModal`)，納入 **歷史營收** 與 **股權分散 (籌碼)** 分析，以完整移植原先 `看盤及券商分析.ipynb` 的分析能力。

## 2. 問題陳述 (Problem Statement)

目前儀表板僅提供 ETF 持股的 K 線圖 (價格/成交量)。使用者需要檢視基本面數據 (營收成長) 與籌碼面分析 (股權集中度/股東人數變化) 來輔助投資決策，這些關鍵指標目前僅存在於 Jupyter Notebook 中，無法即時在 Web UI 查看。

## 3. 解決方案 (Proposed Solution)

### 3.1 資料庫架構 (Database Schema - Supabase)

新增資料表以儲存個股的歷史財務與籌碼數據。

**資料表：`stock_revenue_monthly` (個股月營收)**

- `stock_code` (PK, Text): 股票代號
- `data_date` (PK, Date): 資料日期 (月)
- `revenue` (Numeric): 當月營收
- `revenue_yoy` (Numeric): 去年同月增減(%)
- `revenue_mom` (Numeric): 上月比較增減(%)
- `created_at` (Timestamp): 建立時間
- **資料範圍**：儲存近 **12 個月**

**資料表：`stock_shareholder_weekly` (個股股權分散 - 週資料)**

- `stock_code` (PK, Text): 股票代號
- `data_date` (PK, Date): 資料日期 (週)
- `shareholder_tier` (PK, Integer): 持股分級 (1-17，依照集保資料標準)
- `holder_count` (Integer): 該級距人數
- `shares_held` (Numeric): 該級距持有股數
- `custody_ratio` (Numeric): 占集保庫存數比例 (%)
- `created_at` (Timestamp): 建立時間
- **資料範圍**：儲存近 **48 週**

**持股分級定義 (與 Finlab `inventory` 一致)**：

- 1-9: 散戶級距 (1-999股 ~ 50-100張)
- 10: 100-200張
- 11-15: 大戶級距 (200-400張 ~ 1000張以上)
- 17: 總計 (用於總股東人數)

### 3.2 後端 ETL (Python)

建立新的同步腳本 `ETF/sync_stock_financials.py`：

1. **取得目標股票**：從 `etf_holdings_snapshot` 讀取目前追蹤 ETF (如 00981A) 的所有成分股。
2. **Finlab 資料抓取**：
    - `monthly_revenue`: 抓取近 3-5 年數據。
    - `shareholder_distribution`: 抓取對應的歷史籌碼數據。
3. **寫入資料庫**：使用 `upsert` 將數據同步至 Supabase。

### 3.3 前端 (Next.js)

1. **API Endpoints**：
    - `GET /api/investment/revenue?code=XXXX` (營收數據)
    - `GET /api/investment/price-monthly?code=XXXX` (月線股價，經 resample 處理)
    - `GET /api/investment/chips?code=XXXX` (籌碼數據)
2. **UI 元件 (`PriceChartModal`)**：
    - 新增 **Tabs (分頁)** 切換功能：
        - **K 線圖 (Technical)**: 維持現有的 Lightweight Charts。
        - **營收 vs 股價 (Revenue & Price)**:
            - 使用 `Recharts` 繪製「營收金額 (長條圖, 左軸)」+「月均價 (折線圖, 右軸)」雙軸圖表。
            - 月均價透過日線股價 `resample('M').mean()` 計算。
            - 顯示近 **24 個月**數據。
            - **長條圖顏色邏輯**：
              - 🟡 金色：營收創新高（9個月滾動窗口）
              - 🔴 紅色系：YoY 正成長（>20% 深紅, >10% 中紅, >0% 淺紅）
              - 🟢 綠色系：YoY 負成長（<-20% 深綠, <-10% 中綠, <0% 淺綠）
            - **均線**：顯示 MA(3) 與 MA(12)
            - **YoY 標註**：在最近 6 個月的長條圖上方顯示 YoY% 文字
        - **籌碼分析 (Chips)**: 包含四個子圖表：
            1. **股權分散疊圖** (Shareholder Distribution Overlay):
               - 左軸：總股東人數（長條圖，動態顏色：增綠減紅）
               - 右軸：持股百分比折線圖（1-100張、100-1000張、1000張以上）
               - 顯示近 **48 週**數據
            2. **大戶籌碼堆疊流向圖** (Large Holders Flow):
               - 左軸：各級距週變化張數（堆疊長條圖，200-1000張+）
               - 右軸：累積淨流向 + 股價（標準化折線圖）
               - 顯示近 **10 週**數據
            3. **散戶籌碼堆疊流向圖** (Retail Holders Flow):
               - 左軸：各級距週變化張數（堆疊長條圖，1-50張）
               - 右軸：散戶累積淨流向 + 股價（標準化折線圖）
               - 顯示近 **10 週**數據
            4. **總股東人數 vs 股價趨勢** (Total Shareholders & Price):
               - 左軸：總股東人數（動態顏色長條圖）
               - 右軸：股價週線
               - 包含「資金流向分析」文字（1週/6週趨勢分析）
               - 顯示近 **10 週**數據

## 4. 實作步驟 (Implementation Steps)

1. [DB] 在 Supabase 建立 `stock_revenue_monthly` 與 `stock_shareholder_distribution` 資料表。
2. [ETL] 開發 `sync_stock_financials.py` 並執行初次同步。
3. [API] 建立 Next.js API Routes 以提供前端數據。
4. [UI] 升級 `PriceChartModal`，實作 Tabs 與視覺化圖表。

## 5. 待確認事項

- ✅ **資料範圍已定義**：
  - 營收：近 **24 個月**
  - 集保（籌碼）：近 48 週（約 1 年）
  - 股權分散細部圖表：近 10 週
- ✅ **持股分級定義**：沿用 Finlab `inventory` 標準 (1-17 級距)
- ⚠️ **前端實作優先級**：建議先實作「營收 vs 股價」與「股權分散疊圖」，其餘籌碼圖表視需求逐步加入
