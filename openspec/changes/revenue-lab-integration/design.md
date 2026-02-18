# Design: Revenue Lab Integration

## Context

StockRevenueLab 是一個以 Streamlit + PostgreSQL 構建的量化分析工具，核心洞見是：
「YOY 50-100% 的成長股，在多頭/空頭市場均有最佳風險報酬比」。

我們的目標是將其三大分析模組移植至 Next.js 架構，資料源改為 FinLab API，並整合進現有的 00981A 投資策略頁面。

**現有架構**：

- `GoldenGrowthZone.tsx`：Client Component，接收 `Holding[]` 資料，純前端渲染
- `src/app/actions/`：Server Actions 目錄，已有 `parseDocx.ts`
- FinLab 資料透過 Python 腳本取得，結果存入 Supabase 或直接 JSON

---

## Goals / Non-Goals

**Goals:**

- 將 `probability.py` 的勝率回測邏輯移植為 Next.js Server Action
- 將 `app.py` 的熱力圖分析移植為 React 元件（Recharts）
- 強化現有 `GoldenGrowthZone.tsx`，加入歷史勝率標籤
- 所有計算在 Server 端完成，Client 只接收結果資料
- 維持現有 `GoldenGrowthZone.tsx` 的向下相容性

**Non-Goals:**

- 不移植 AI 分析提示詞功能（ChatGPT/Claude 連結）
- 不實作「前後年度比較」功能（`show_multi_year`，複雜度高，第二階段）
- 不建立獨立的 Streamlit 服務，完全整合進 Next.js
- 不支援即時資料（月營收每月更新一次，快取 24 小時即可）

---

## Decisions

### 決策 1：資料取得層 — Python Script + JSON Cache

**問題**：FinLab SDK 是 Python 套件，無法直接在 Next.js Server Action 中呼叫。

**方案比較**：

| 方案 | 優點 | 缺點 |
|------|------|------|
| A. Python FastAPI 微服務 | 彈性高 | 需要額外部署，架構複雜 |
| B. Next.js API Route 呼叫 Python subprocess | 簡單 | Vercel 不支援長時間 subprocess |
| C. **預先計算 JSON 快取**（選擇此方案） | 最簡單，Vercel 友善 | 需要定期執行 Python 腳本更新資料 |

**決策**：採用方案 C。建立 `scripts/fetch_revenue_lab_data.py`，定期（或手動）執行，將計算結果存為 `public/data/revenue-lab/` 下的 JSON 檔案。Server Action 讀取這些 JSON 檔案並做最終聚合計算。

**理由**：月營收資料每月更新一次，不需要即時查詢。預計算可以避免 Vercel Function 的 10 秒超時限制，且計算結果可以 CDN 快取。

---

### 決策 2：熱力圖渲染 — Recharts CustomCell

**問題**：Recharts 沒有內建 Heatmap 元件。

**方案**：使用 Recharts 的 `<ResponsiveContainer>` + 自訂 SVG 渲染，或改用 `react-grid-heatmap`。

**決策**：使用 **CSS Grid + 自訂顏色插值**實作熱力圖，不引入新依賴。每個 cell 是一個 `<div>`，背景色由 YOY 值線性映射到 `hsl()`。

**理由**：避免引入新的圖表庫，保持 bundle size 穩定。CSS Grid 實作足夠靈活，且效能優於 SVG 大量元素。

---

### 決策 3：模組整合位置 — 新增 Tab

**問題**：三個新模組放在哪裡？

**方案**：

- A. 在現有投資頁面新增 Section（向下滾動）
- B. **新增 Tab「Revenue Lab」**（選擇此方案）
- C. 獨立路由 `/investment/revenue-lab`

**決策**：採用方案 B，在投資策略頁面的 Tab 列新增「📊 Revenue Lab」Tab。

**理由**：Tab 結構不影響現有頁面佈局，使用者可以選擇性查看，且與現有 Tab 架構一致。

---

### 決策 4：GoldenGrowthZone 強化 — 可選 Props

**問題**：如何在不破壞現有功能的前提下強化 `GoldenGrowthZone`？

**決策**：新增可選 props，當 props 不存在時，元件行為與現在完全相同：

```typescript
interface GoldenGrowthZoneProps {
  data: Holding[];
  // 新增（可選）
  historicalStats?: Record<string, StockHistoricalStats>; // key: stock_code
}

interface StockHistoricalStats {
  winRate: number;        // 勝率 (>20%) %
  avgReturn: number;      // 平均年度漲幅 %
  burstMonths: number;    // 連續爆發月數
  qualityScore: number;   // 爆發品質分數
  sampleYears: number;    // 樣本年數
}
```

---

## Architecture

### 資料流

```
Python Script (scripts/fetch_revenue_lab_data.py)
    ↓ FinLab API
    ↓ 計算 WinRate / Heatmap / GoldenZone Stats
    ↓ 輸出 JSON
public/data/revenue-lab/
    ├── win-rate-{year}.json      # 模組 A 資料
    ├── heatmap-{year}.json       # 模組 B 資料
    └── golden-zone-stats.json    # 模組 C 資料

Server Actions (src/app/actions/revenueLabActions.ts)
    ↓ 讀取 JSON
    ↓ 最終聚合（篩選、排序）
    ↓ 回傳型別化資料

React Components
    ├── WinRateLab.tsx            # 模組 A UI
    ├── RevenueHeatmap.tsx        # 模組 B UI
    └── GoldenGrowthZone.tsx      # 模組 C（強化）
```

### 檔案結構

```
scripts/
└── fetch_revenue_lab_data.py     # FinLab 資料取得腳本

public/data/revenue-lab/
├── win-rate-2020.json
├── win-rate-2021.json
├── win-rate-2022.json
├── win-rate-2023.json
├── win-rate-2024.json
├── heatmap-2020.json
├── ...
└── golden-zone-stats.json

src/
├── types/
│   └── revenuelab.ts             # 共用型別
├── app/
│   └── actions/
│       └── revenueLabActions.ts  # Server Actions
└── components/
    └── features/
        └── investment/
            ├── GoldenGrowthZone.tsx    # 修改（加入可選 props）
            ├── WinRateLab.tsx          # 新增
            ├── RevenueHeatmap.tsx      # 新增
            └── RevenueLab.tsx          # 新增（整合容器）
```

### JSON 資料格式

**win-rate-{year}.json**：

```json
{
  "year": 2024,
  "metric": "yoy_pct",
  "threshold": { "low": 50, "high": 100 },
  "data": [
    {
      "burstCount": 12,
      "stockCount": 8,
      "avgReturn": 87.3,
      "medianReturn": 72.1,
      "winRate": 87.5,
      "doubleRate": 37.5,
      "stdDev": 45.2,
      "stocks": [
        { "code": "2330", "name": "台積電", "return": 120.5, "burstMonths": 12 }
      ]
    }
  ]
}
```

**golden-zone-stats.json**：

```json
{
  "updatedAt": "2026-02-18",
  "stats": {
    "2330": {
      "winRate": 82.5,
      "avgReturn": 65.3,
      "burstMonths": 8,
      "qualityScore": 3.2,
      "sampleYears": 4
    }
  }
}
```

---

## Risks / Trade-offs

### 風險 1：FinLab API 資料完整性

- **風險**：`etf_components:00981A` 的歷史成份股資料可能不完整（00981A 成立時間較短）
- **緩解**：Python 腳本加入資料驗證，若成份股資料不足 3 年，降級顯示「樣本不足」警告

### 風險 2：年度股價計算

- **風險**：FinLab 的年度開收盤價 key 名稱需要確認，可能需要從日線資料自行計算
- **緩解**：Python 腳本使用 `data.get('price')` 取得日線，自行 resample 為年度開收盤

### 風險 3：JSON 檔案大小

- **風險**：若包含所有股票的詳細名單，JSON 可能過大（>1MB）
- **緩解**：詳細名單資料（`stocks` 陣列）只保留前 50 筆，其餘只保留統計摘要

### 風險 4：Python 腳本執行環境

- **風險**：需要 FinLab 授權的環境才能執行資料更新腳本
- **緩解**：將腳本設計為可在 GitHub Actions 中執行，使用 Secret 管理 FinLab API Key；同時提供 mock 資料供開發測試

### Trade-off：預計算 vs 即時查詢

- **代價**：資料有延遲（最多 1 個月），無法即時反映最新月營收
- **收益**：頁面載入速度快，不受 FinLab API 速率限制影響，Vercel 部署無問題
