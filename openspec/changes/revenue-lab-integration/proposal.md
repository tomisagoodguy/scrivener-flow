# Proposal: Revenue Lab Integration

## Summary

將 StockRevenueLab（開源 Streamlit 量化分析工具）的三大核心分析模組，以 Next.js + FinLab 資料源重新實作，整合進 scrivener-flow 的 00981A 投資策略頁面。

## Problem Statement

現有的 `GoldenGrowthZone` 元件只能顯示「當前」命中黃金區間（YOY 50-100%）的成份股清單，缺乏：

1. **歷史勝率驗證**：無法回答「這個策略過去真的有效嗎？」
2. **爆發次數與報酬的關係**：無法量化「YOY 50-100% 爆發幾次，勝率最高？」
3. **跨漲幅區間的營收特徵分佈**：無法視覺化「漲得好的股票，它們的營收長什麼樣？」

這三個缺口導致投資決策缺乏歷史數據支撐，策略說服力不足。

## Proposed Solution

新增三個分析模組，資料來源統一使用 **FinLab API**（`finlab.data`），以 Next.js Server Actions 取代原 Streamlit 的 PostgreSQL 直連：

---

### 模組 A：歷史勝率回測面板（`WinRateLab`）

**對應原始碼**：`pages/probability.py`

**核心邏輯**：

- 從 FinLab 取得 00981A 歷史成份股的月營收資料
- 設定 YOY 爆發門檻（預設 50-100%）
- 統計每支股票在一個年度內「達標幾次」
- 計算各爆發次數對應的年度股價報酬分佈

**輸出指標**：

| 爆發次數 | 股票檔數 | 平均漲幅 | 中位數漲幅 | 勝率(>20%) | 翻倍率(>100%) |
|---------|---------|---------|-----------|-----------|--------------|

**UI 元件**：

- 爆發次數 vs 平均/中位數漲幅的長條圖
- 勝率熱力表
- 期望值綜合評分卡
- 詳細股票名單（可按爆發次數篩選）

---

### 模組 B：營收-股價熱力圖（`RevenueHeatmap`）

**對應原始碼**：`app.py`（主頁熱力圖）

**核心邏輯**：

- 將 00981A 歷史成份股按「年度股價漲幅區間」分組
  - 下跌：每 10% 一個區間（-100% ~ 0%）
  - 上漲：每 100% 一個區間（0% ~ 1000%+）
- 在每個漲幅區間內，計算該組股票的月 YOY 統計值
- 支援多種統計模式：中位數、平均值、標準差、正增長比例

**輸出**：

- 漲幅區間 × 月份的熱力圖（X 軸：月份，Y 軸：漲幅區間，顏色：YOY 統計值）
- 各區間詳細統計摘要表

**UI 元件**：

- Recharts 熱力圖（或 D3 heatmap）
- 統計模式切換器（Tab 或 Select）
- 各區間股票詳細名單展開

---

### 模組 C：黃金區間強化（`GoldenGrowthZone` 升級）

**對應原始碼**：現有 `GoldenGrowthZone.tsx` + `probability.py` 的勝率計算

**強化內容**：

- 在現有黃金區間股票卡片上，加入「歷史勝率標籤」
- 顯示該股票過去 N 年在相同 YOY 區間時的平均年度報酬
- 新增「連續爆發月數」指標（連續幾個月 YOY 在 50-100%）
- 新增「爆發品質分數」= 勝率 × 平均漲幅 / 標準差

---

## Data Architecture

### FinLab 資料對應

| 原始 PostgreSQL 表 | FinLab API | 說明 |
|-------------------|-----------|------|
| `monthly_revenue` | `data.get('monthly_revenue')` | 月營收（含 YOY/MOM） |
| `stock_annual_k` | `data.get('price:年開盤價')` + `data.get('price:年收盤價')` | 年度股價 |
| 成份股清單 | `data.get('etf_components:00981A')` | 00981A 歷史成份股 |

### Server Actions 架構

```
src/app/actions/
├── revenueLabActions.ts       # 主要資料取得 Actions
│   ├── fetchWinRateData()     # 模組 A 資料
│   ├── fetchHeatmapData()     # 模組 B 資料
│   └── fetchGoldenZoneStats() # 模組 C 強化資料
└── revenueLabTypes.ts         # 共用型別定義
```

### 資料快取策略

- FinLab 資料以 `unstable_cache` 快取，TTL = 24 小時（月營收每月更新一次）
- 計算結果在 Server Component 層完成，不傳送原始資料到 Client

---

## New Capabilities

### 模組 A：WinRateLab

- 使用者可設定 YOY 爆發門檻（滑桿：0% ~ 500%）
- 選擇分析年度（2020-2024）
- 查看各爆發次數對應的勝率統計
- 展開查看特定爆發次數的股票名單

### 模組 B：RevenueHeatmap

- 視覺化呈現「漲幅區間 × 月份 × YOY」三維關係
- 切換統計模式（中位數 / 平均值 / 標準差 / 正增長比例）
- 點擊區間查看該組股票詳情

### 模組 C：GoldenGrowthZone 強化

- 每支黃金區間股票顯示歷史勝率徽章
- 連續爆發月數指標
- 爆發品質評分

---

## Modified Capabilities

### `GoldenGrowthZone.tsx`

- 新增 `historicalWinRate` prop（可選，向下相容）
- 新增 `burstMonths` prop（連續爆發月數）
- 新增 `qualityScore` prop（爆發品質分數）

### 投資策略頁面 (`/investment` 路由)

- 新增「Revenue Lab」Tab 或 Section
- 包含模組 A、B、C 的整合展示

---

## Impact

### 受影響的檔案

- `src/components/features/investment/GoldenGrowthZone.tsx`（修改）
- `src/app/actions/revenueLabActions.ts`（新增）
- `src/types/revenuelab.ts`（新增）
- `src/components/features/investment/WinRateLab.tsx`（新增）
- `src/components/features/investment/RevenueHeatmap.tsx`（新增）
- 投資頁面主元件（修改，加入新 Tab）

### 依賴

- FinLab Python SDK（已存在於專案中）
- Recharts（已安裝）
- 無需新增外部依賴

### 風險

- FinLab API 的 `etf_components:00981A` 歷史資料完整性需驗證
- 年度股價資料的 FinLab key 名稱需確認（可能需要用 `price` + 自行計算年度漲幅）
- 計算量較大，需確認 Server Action 的執行時間在 Vercel 限制內（10s）

## Success Criteria

1. 模組 A（WinRateLab）能正確顯示 2020-2024 年各爆發次數的勝率統計
2. 模組 B（RevenueHeatmap）熱力圖能正確渲染，顏色反映 YOY 統計值
3. 模組 C（GoldenGrowthZone 強化）現有功能不受影響，新增歷史勝率標籤正確顯示
4. 所有資料來源切換至 FinLab，不依賴原始 PostgreSQL 連線
5. 頁面載入時間 < 3 秒（Server Component 預渲染）
