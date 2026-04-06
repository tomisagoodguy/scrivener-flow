# Design: investment-unified-pool

## Context

現有 `/investment/[etf]/page.tsx` 以「單一 ETF」為頁面主軸，六個 tab 的資料來源都綁定在當前 ETF。`StockPickerHub` 雖已做到三 ETF 合併，但它只是六個 tab 之一，其他 tab 仍各自為政。隨著主動式 ETF 數量增加，每支 ETF 一個 URL 的方式會讓分析視角更加破碎。

核心矛盾：使用者真正關心的不是「這支 ETF 持什麼」，而是「**哪些股票值得關注**」—— 這個問題天然需要跨 ETF 回答。

## Goals / Non-Goals

**Goals:**
- 第一層 `/investment`：跨全部已追蹤 ETF 的選股池，為主要決策畫面
- 第二層 `/investment/[etf]`：單一 ETF 深潛（持股明細 / 異動紀錄），保留原功能
- `etfRegistry.ts`：ETF 的 Single Source of Truth，新增 ETF 只需加一筆設定
- 黃金成長區間（YOY 50–100%）作為選股池的內建篩選條件，不再是獨立 tab
- Revenue Lab（勝率回測 / 熱力圖）維持為獨立分頁（`/investment/revenue-lab`）
- 策略洞察（GoldenGrowthZone）整合進選股池篩選欄

**Non-Goals:**
- 不改動個股詳情頁 `/investment/stock/[code]`
- 不改動 Python ETF pipeline 邏輯
- 不引入新的後端 API routes（繼續用 Server Components 直接查詢）

## Decisions

### 1. ETF Registry — 集中式設定檔

**決策**：新增 `src/lib/investment/etfRegistry.ts`，匯出 `ETF_REGISTRY` 陣列。

```ts
export interface EtfRegistryEntry {
  code: string;          // e.g. '00981A'
  shortCode: string;     // e.g. '00981'
  name: string;
  manager: string;
  color: string;         // hex，用於圖表 / badge
  dataSource: 'fhtrust' | 'moneydj';
}

export const ETF_REGISTRY: EtfRegistryEntry[] = [
  { code: '00981A', shortCode: '00981', name: '主動統一台股增長', manager: '統一投信', color: '#8b5cf6', dataSource: 'fhtrust' },
  { code: '00980A', shortCode: '00980', name: '野村智慧優選',    manager: '野村投信', color: '#3b82f6', dataSource: 'moneydj' },
  { code: '00991A', shortCode: '00991', name: '復華未來50',      manager: '復華投信', color: '#f59e0b', dataSource: 'moneydj' },
];

export const ETF_CODES = ETF_REGISTRY.map(e => e.code);
```

所有現有的 hardcoded `ETF_META`、`COMPARE_ETF_META`、`SUPPORTED_ETFS`、`COMPARE_ETF_CODES` 常數改為從這裡 derive，不再分散在頁面檔案中。

**替代方案考量**：放在 DB / env var → 過度設計，ETF 設定不常變且需要型別安全。

---

### 2. 路由結構

```
/investment                     → 選股池主頁（Server Component，聚合全部 ETF）
/investment/[etf]               → ETF 深潛頁（持股明細 + 異動紀錄，保留現有功能）
/investment/revenue-lab         → Revenue Lab 獨立分頁（勝率回測 + 熱力圖）
/investment/stock/[code]        → 個股詳情（不動）
```

`/investment/[etf]` 保留相容性：合法 ETF code → 深潛頁；非法 code → redirect 回 `/investment`。

**替代方案考量**：用 `?etf=` query param 在同一頁切換 → 難以 bookmark / SSR cache，且 URL 語義不清。

---

### 3. 選股池第一層 tab 結構

```
[ 🎯 選股池 ] [ 📊 策略分析 ] [ 🔄 異動紀錄 ] [ ETF 對比 ]
```

- **選股池**：合併持股表格，欄位：股票 / 共持 / 動能分 / 60d動能% / 投信10日 / YOY / 各ETF權重
- **策略分析**：GoldenGrowthZone，資料來源為所有 ETF 聯集持股
- **異動紀錄**：多 ETF 合併 diff logs，可按 ETF 篩選
- **ETF 對比**：現有 EtfComparePanel（不動）

Revenue Lab 從 tab 移出，改為頁面頂部的獨立入口連結。

---

### 4. 選股池整合 YOY 欄位

`StockPickerHub` 新增 `revenue_yoy` 欄位直接顯示，篩選條件新增：
- 「黃金區間」（YOY 50–100%）
- 「爆發區間」（YOY > 100%）

資料已在 `getHoldings()` 中從 `stock_revenue_monthly` join，只需把 `revenue_yoy` 傳入 `UnifiedHolding`。

---

### 5. 多 ETF DiffLedger

`DiffLedger` 現在只接受單一 ETF 的 logs。改為：
- 接受 `logs: DiffLog[]`（已含 `etf_code` 欄位）
- 頂部加 ETF 篩選 chips（全部 / 00981A / 00980A / ...）
- ETF badge 顏色從 registry 取

---

## Risks / Trade-offs

- **Server 端資料量增加**：`/investment` 需一次查三支 ETF 的持股 + 量化因子，約 150–200 支股票的多表 join。Supabase 免費方案有 DB pool 限制。
  → 緩解：`Promise.all` 並行查詢，已有 limit 控制；未來如效能有問題可加 Redis cache layer。

- **`/investment/[etf]` 深潛頁資料查詢重複**：池頁和深潛頁都查同一個 ETF 的持股。
  → 可接受，兩者查詢目的不同（池頁聚合、深潛頁完整明細），不值得共用複雜 cache。

- **舊書籤 `/investment/00981A` 失效**：改為深潛頁後語義改變（不再是「主畫面 + 00981A tab」）。
  → 緩解：`/investment/[etf]` 繼續存在，功能保留，只是不再是首頁。

## Migration Plan

1. 新增 `etfRegistry.ts`，同步替換各頁面的 hardcoded 常數
2. 改寫 `src/app/investment/page.tsx` 為選股池主頁
3. 改寫 `src/app/investment/[etf]/page.tsx` 為深潛頁（移除選股 / 策略 tab）
4. 新增 `src/app/investment/revenue-lab/page.tsx`
5. 升級 `StockPickerHub` 加入 YOY 欄位與黃金區間篩選
6. 升級 `DiffLedger` 支援多 ETF
7. 升級 `InvestmentTabs` 改為四 tab 結構
8. 升級 `GoldenGrowthZone` 接受聯集 holdings

Rollback：所有改動在同一 feature branch，可整體 revert。

## Open Questions

- Revenue Lab 的 `currentHoldings` 參數目前只傳當前 ETF 的持股。改為聯集後，勝率回測的母體會變大，結果可能有差異 — 這是預期行為還是需要保留「單 ETF 模式」？（暫定：改為聯集，視為改進）
