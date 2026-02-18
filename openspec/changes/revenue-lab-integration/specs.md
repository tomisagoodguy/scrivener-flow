# Specs: Revenue Lab Integration

## 1. Python 資料取得腳本

### `scripts/fetch_revenue_lab_data.py`

**功能**：從 FinLab 取得 00981A 成份股的月營收與年度股價資料，計算三個模組所需的統計數據，輸出 JSON 至 `public/data/revenue-lab/`。

**執行方式**：

```bash
uv run python scripts/fetch_revenue_lab_data.py --years 2020,2021,2022,2023,2024
```

**FinLab 資料取得**：

```python
import finlab
from finlab import data

finlab.login(os.environ["FINLAB_API_KEY"])

# 月營收（含 YOY）
monthly_revenue = data.get('monthly_revenue')  # DataFrame: index=date, columns=stock_code
revenue_yoy = data.get('monthly_revenue_yoy')  # YOY %

# 日線股價（用於計算年度漲幅）
price_close = data.get('price')  # 收盤價

# 00981A 成份股（歷史）
etf_components = data.get('etf_components:00981A')  # DataFrame: index=date, columns=stock_code, value=weight
```

**輸出規格**：

`public/data/revenue-lab/win-rate-{year}.json`：

```typescript
interface WinRateYearData {
  year: number;
  metric: 'yoy_pct';
  threshold: { low: number; high: number };
  generatedAt: string; // ISO 8601
  data: WinRateBucket[];
}

interface WinRateBucket {
  burstCount: number;    // 達標次數 (0-12)
  stockCount: number;    // 股票檔數
  avgReturn: number;     // 平均年度漲幅 %
  medianReturn: number;  // 中位數漲幅 %
  winRate: number;       // 勝率 (漲幅 > 20%) %
  doubleRate: number;    // 翻倍率 (漲幅 > 100%) %
  stdDev: number;        // 標準差 %
  minReturn: number;     // 最低漲幅 %
  maxReturn: number;     // 最高漲幅 %
  stocks: StockDetail[]; // 最多 50 筆
}

interface StockDetail {
  code: string;
  name: string;
  annualReturn: number;
  burstMonths: number;
  avgYoy: number;
}
```

`public/data/revenue-lab/heatmap-{year}.json`：

```typescript
interface HeatmapYearData {
  year: number;
  generatedAt: string;
  returnBins: ReturnBin[];
  months: string[]; // ['2023-12', '2024-01', ..., '2024-11']
  cells: HeatmapCell[];
}

interface ReturnBin {
  id: string;       // '下跌-10%至0%'
  order: number;    // 排序用
  label: string;    // 顯示用標籤
  stockCount: number;
  avgAnnualReturn: number;
}

interface HeatmapCell {
  binId: string;
  month: string;
  median: number;
  mean: number;
  stdDev: number;
  positiveRate: number; // 正增長比例 %
  dataPoints: number;
}
```

`public/data/revenue-lab/golden-zone-stats.json`：

```typescript
interface GoldenZoneStats {
  updatedAt: string;
  yoyRange: { low: 50; high: 100 };
  stats: Record<string, StockHistoricalStats>; // key: stock_code
}

interface StockHistoricalStats {
  winRate: number;      // 歷史勝率 (漲幅 > 20%) %
  avgReturn: number;    // 歷史平均年度漲幅 %
  burstMonths: number;  // 當前連續爆發月數
  qualityScore: number; // avgReturn * winRate / stdDev（四捨五入至小數點後 2 位）
  sampleYears: number;  // 有效樣本年數
  sampleCount: number;  // 總樣本次數（年×月）
}
```

---

## 2. 型別定義

### `src/types/revenuelab.ts`

```typescript
export interface WinRateYearData { /* 同上 */ }
export interface WinRateBucket { /* 同上 */ }
export interface StockDetail { /* 同上 */ }
export interface HeatmapYearData { /* 同上 */ }
export interface ReturnBin { /* 同上 */ }
export interface HeatmapCell { /* 同上 */ }
export interface GoldenZoneStats { /* 同上 */ }
export interface StockHistoricalStats { /* 同上 */ }

// 模組 A UI 用
export interface WinRateFilters {
  year: number;
  yoyLow: number;  // 預設 50
  yoyHigh: number; // 預設 100
}

// 模組 B UI 用
export type HeatmapStatMode = 'median' | 'mean' | 'stdDev' | 'positiveRate';
```

---

## 3. Server Actions

### `src/app/actions/revenueLabActions.ts`

```typescript
'use server';

import { unstable_cache } from 'next/cache';
import type { WinRateYearData, HeatmapYearData, GoldenZoneStats } from '@/types/revenuelab';

// 模組 A：勝率回測資料
export const getWinRateData = unstable_cache(
  async (year: number): Promise<WinRateYearData | null> => {
    // 讀取 public/data/revenue-lab/win-rate-{year}.json
    // 若檔案不存在，回傳 null
  },
  ['revenue-lab-win-rate'],
  { revalidate: 86400 } // 24 小時
);

// 模組 B：熱力圖資料
export const getHeatmapData = unstable_cache(
  async (year: number): Promise<HeatmapYearData | null> => {
    // 讀取 public/data/revenue-lab/heatmap-{year}.json
  },
  ['revenue-lab-heatmap'],
  { revalidate: 86400 }
);

// 模組 C：黃金區間歷史統計
export const getGoldenZoneStats = unstable_cache(
  async (): Promise<GoldenZoneStats | null> => {
    // 讀取 public/data/revenue-lab/golden-zone-stats.json
  },
  ['revenue-lab-golden-zone'],
  { revalidate: 86400 }
);
```

---

## 4. React 元件規格

### 4.1 `WinRateLab.tsx`（模組 A）

**Props**：

```typescript
interface WinRateLabProps {
  initialYear?: number; // 預設 2024
}
```

**UI 結構**：

```
WinRateLab
├── 控制列
│   ├── 年度選擇器 (Select: 2020-2024)
│   └── YOY 門檻滑桿 (Slider: 0-500%, 預設 50-100%)
├── 統計摘要卡片列（4 個 Metric Card）
│   ├── 最佳爆發次數
│   ├── 最高勝率
│   ├── 最高平均漲幅
│   └── 總樣本股票數
├── 主圖表（Recharts ComposedChart）
│   ├── Bar: 平均年度漲幅%
│   ├── Line: 中位數漲幅%
│   └── X 軸: 爆發次數
├── 勝率表格（DataTable）
│   └── 欄位: 爆發次數 | 股票數 | 平均漲幅 | 中位數 | 勝率 | 翻倍率 | 標準差
└── 詳細名單展開（Accordion）
    └── 按爆發次數選擇，顯示 StockDetail 列表
```

**互動行為**：

- 年度切換：重新 fetch 對應年度資料（Client-side state + Server Action）
- 滑桿調整：僅前端篩選（不重新 fetch，從已載入資料中過濾）
- 表格行點擊：展開/收合詳細名單

---

### 4.2 `RevenueHeatmap.tsx`（模組 B）

**Props**：

```typescript
interface RevenueHeatmapProps {
  initialYear?: number;
  initialStatMode?: HeatmapStatMode;
}
```

**UI 結構**：

```
RevenueHeatmap
├── 控制列
│   ├── 年度選擇器
│   └── 統計模式切換 (Tabs: 中位數 | 平均值 | 標準差 | 正增長比例)
├── 熱力圖主體（CSS Grid）
│   ├── Y 軸標籤（漲幅區間，由下跌到上漲）
│   ├── X 軸標籤（月份）
│   └── Cell 矩陣（顏色 = 統計值的 HSL 映射）
│       ├── 下跌區間：紅色系（值越低越深紅）
│       └── 上漲區間：綠色系（值越高越深綠）
├── 色階圖例（Legend）
└── 區間統計摘要表（可展開）
    └── 欄位: 漲幅區間 | 股票數 | 均漲幅 | YOY 中位數 | 正增長% | 標準差
```

**顏色映射規格**：

- 統計值 < 0：`hsl(0, 70%, {lightness}%)` — 紅色系
- 統計值 0-50：`hsl(45, 70%, {lightness}%)` — 黃色系
- 統計值 > 50：`hsl(120, 70%, {lightness}%)` — 綠色系
- lightness 由統計值在資料範圍內的百分位決定（20% ~ 80%）

**Cell Tooltip**：

```
漲幅區間: 上漲0-100%
月份: 2024-03
YOY 中位數: 67.3%
股票數: 12 檔
```

---

### 4.3 `GoldenGrowthZone.tsx`（模組 C 強化）

**新增 Props**（向下相容，全部可選）：

```typescript
interface GoldenGrowthZoneProps {
  data: Holding[];
  historicalStats?: Record<string, StockHistoricalStats>; // 新增
}
```

**股票卡片強化**（當 `historicalStats` 存在時）：

```
股票卡片
├── [現有] 股票代號 + 名稱 + 產業 + 權重
├── [現有] YOY % 顯示
└── [新增] 歷史統計列
    ├── 歷史勝率徽章 (Badge: "勝率 82%")
    ├── 平均漲幅 (小字: "歷史均漲 +65%")
    ├── 連續爆發月數 (小字: "連爆 8 個月")
    └── 品質評分 (星星圖示: ★★★☆☆)
```

**品質評分映射**：

- qualityScore < 1：1 顆星
- qualityScore 1-2：2 顆星
- qualityScore 2-3：3 顆星
- qualityScore 3-4：4 顆星
- qualityScore ≥ 4：5 顆星

---

### 4.4 `RevenueLab.tsx`（整合容器）

**功能**：作為 Revenue Lab Tab 的根元件，管理年度選擇狀態，協調三個子模組的資料載入。

**Props**：

```typescript
interface RevenueLabProps {
  goldenZoneData: Holding[];           // 從父層傳入（現有資料）
  goldenZoneStats: GoldenZoneStats | null; // Server Action 預取
}
```

**UI 結構**：

```
RevenueLab
├── 頁首說明卡（策略背景說明）
├── Tabs
│   ├── Tab 1: 🎲 勝率回測 → <WinRateLab />
│   ├── Tab 2: 🔥 熱力圖 → <RevenueHeatmap />
│   └── Tab 3: ⭐ 黃金區間強化 → <GoldenGrowthZone historicalStats={...} />
└── 資料更新時間戳
```

---

## 5. 投資頁面整合

### 修改目標檔案

投資策略頁面（需確認實際路徑，預期為 `src/app/investment/page.tsx` 或類似）：

**新增**：

```typescript
// Server Component 預取資料
const goldenZoneStats = await getGoldenZoneStats();

// 在現有 Tab 列新增
<TabsTrigger value="revenue-lab">📊 Revenue Lab</TabsTrigger>

// 在 TabsContent 新增
<TabsContent value="revenue-lab">
  <RevenueLab
    goldenZoneData={holdingsData}
    goldenZoneStats={goldenZoneStats}
  />
</TabsContent>
```

---

## 6. Mock 資料規格

為了讓開發時不需要執行 Python 腳本，提供 mock 資料：

`public/data/revenue-lab/win-rate-2024.mock.json`：

- 包含 2024 年的模擬勝率資料
- 爆發次數 1-12，每個 bucket 有合理的模擬數值

開發環境自動使用 mock 資料：

```typescript
const isDev = process.env.NODE_ENV === 'development';
const filename = isDev ? `win-rate-${year}.mock.json` : `win-rate-${year}.json`;
```

---

## 7. 測試規格

### 單元測試

- `revenueLabActions.ts`：測試 JSON 讀取失敗時回傳 null
- `WinRateLab.tsx`：測試年度切換後顯示正確資料
- `RevenueHeatmap.tsx`：測試顏色映射函數（邊界值）
- `GoldenGrowthZone.tsx`：測試 `historicalStats` 為 undefined 時，元件行為與原本相同

### 整合測試

- 投資頁面載入後，Revenue Lab Tab 可正常切換
- 點擊 Tab 後，WinRateLab 顯示 2024 年資料（mock）
