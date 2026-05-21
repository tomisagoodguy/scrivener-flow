## Context

**現有資料盤點：**

| 資料 | 來源 | 狀態 |
|------|------|------|
| 個股 OHLCV | `stock_prices_daily` | ✅ 每日同步 |
| ETF 持股權重 | `etf_holdings_snapshot` | ✅ official_api = 日更；pocket = 月更 |
| ETF 自身市場報酬 | 無 | ❌ ETF 代碼（00981A 等）不在 stock_prices_daily |
| 台灣加權指數 | 無 | ❌ 需從 FinLab 抓取 |
| 0050 報酬 | 無 | ❌ 需從 FinLab 抓取 |
| 持股貢獻度 | 無 | ❌ 需計算 |

**FinLab 資料可用性確認（待執行時驗證）：**
- `index_price:收盤價`：加權指數、櫃買指數
- `price:收盤價`：ETF 代碼（00981A、0050 等）應在台股 price 資料集中

## Goals / Non-Goals

**Goals:**

- ETF 市場報酬 vs 加權指數 / 0050 的每日 alpha 追蹤，前端累積報酬折線圖
- 以持股權重 × 個股報酬計算月持股貢獻度，前端顯示前 5 大貢獻者與拖累者
- 兩個新步驟均為輔助步驟，失敗不中斷 Pipeline

**Non-Goals:**

- 不計算 NAV（淨值）報酬，僅用市場價格（ETF 溢折價不在考慮範圍）
- 不做策略 vs ETF 回測比較
- 不計算 Sharpe / Sortino / Information Ratio（保留未來）

## Decisions

### 決策 1：BenchmarkSyncStep 的資料來源

**選擇**：使用 FinLab `price:收盤價` 同時抓取 ETF 代碼（00981A 等）和 0050，以 `index_price:收盤價` 抓加權指數。

**理由**：FinLab 有台股所有上市 ETF 的市場收盤價，資料對齊現有的 `stock_prices_daily` 邏輯，不需新增外部資料來源。

**替代方案**：用 Supabase `stock_prices_daily` 補充 ETF 代碼 → 需修改 `SyncOHLCVStep` 的同步清單，scope 更大；延後至 `SyncOHLCVStep` 整合改版時再處理。

### 決策 2：etf_benchmark_comparison 的報酬計算區間

儲存**1 個月、3 個月、6 個月、1 年**的累積報酬（`return_1m`, `return_3m`, `return_6m`, `return_1y`），以及對應的 alpha（ETF 報酬 - 加權指數報酬）。

**理由**：單日報酬雜訊大，月/季區間更有分析價值；但儲存多個區間的計算結果，前端可直接查而不需即時計算。

### 決策 3：etf_holding_attribution 的計算頻率

**選擇**：以月為單位計算（每月最後一個交易日執行一次），而非每日。

**理由**：Pocket.tw 的 ETF 持股快照為月更，日頻計算會有大量零貢獻；月頻對所有 ETF 一致，官網 API ETF（00981A）也能對齊。`AttributionComputeStep` 在執行時判斷當日是否為月末交易日，若否則 skip。

### 決策 4：持股貢獻度的計算方式

簡化的 Brinson 模型（持股 attribution）：

```
contribution_i = w_i(t-1) × r_i(t)
```

其中：
- `w_i(t-1)`：上期持股權重（`etf_holdings_snapshot` 前一期）
- `r_i(t)`：本期個股報酬（`stock_prices_daily` 計算）
- 總貢獻加總 ≈ ETF 本期報酬（不含費用、現金、槓桿誤差）

### 決策 5：DB Schema

**etf_benchmark_comparison**
```sql
CREATE TABLE etf_benchmark_comparison (
    id          BIGSERIAL PRIMARY KEY,
    date        DATE NOT NULL,
    etf_code    TEXT NOT NULL,
    etf_return_1m  NUMERIC,
    etf_return_3m  NUMERIC,
    etf_return_6m  NUMERIC,
    etf_return_1y  NUMERIC,
    taiex_return_1m NUMERIC,
    taiex_return_3m NUMERIC,
    taiex_return_6m NUMERIC,
    taiex_return_1y NUMERIC,
    alpha_1m    NUMERIC,  -- etf_return_1m - taiex_return_1m
    alpha_3m    NUMERIC,
    created_at  TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (date, etf_code)
);
```

**etf_holding_attribution**
```sql
CREATE TABLE etf_holding_attribution (
    id          BIGSERIAL PRIMARY KEY,
    date        DATE NOT NULL,        -- 月末日期
    etf_code    TEXT NOT NULL,
    stock_code  TEXT NOT NULL,
    stock_name  TEXT,
    weight      NUMERIC,              -- 上期權重 (%)
    period_return NUMERIC,            -- 本期個股報酬 (%)
    contribution NUMERIC,             -- weight × period_return / 100
    created_at  TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (date, etf_code, stock_code)
);
```

## Risks / Trade-offs

- **[風險] FinLab 無 ETF 市場價格**：00981A 等主動 ETF 代碼在 FinLab `price:收盤價` 可能無資料（FinLab 以股票為主） → 緩解：實作時先驗證，若無資料則 BenchmarkSyncStep 改用 `yfinance` 或 etfdb 等備用源
- **[Trade-off] 月頻 attribution 資訊量有限**：月末快照無法捕捉月中換倉的貢獻 → 可接受，優先有而不是沒有
- **[風險] attribution 加總與 ETF 實際報酬偏差**：ETF 有費用、現金部位、槓桿，簡化模型誤差 ±2–5% → 頁面加「本計算為估算值，以持股公告日為基準」說明

## Migration Plan

1. 新增兩個 Supabase migration SQL（建表）
2. 實作 `BenchmarkSyncStep`，本地 `--dry-run` 驗證 FinLab 資料可用性
3. 實作 `AttributionComputeStep`，月末本地手動執行驗證
4. 前端頁面開發
5. 合併至 main，CI 次日起自動執行
