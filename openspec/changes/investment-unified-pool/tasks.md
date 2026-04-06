# Tasks: investment-unified-pool

## 1. ETF Registry

- [x] 1.1 新增 `src/lib/investment/etfRegistry.ts`，定義 `EtfRegistryEntry` 介面、`ETF_REGISTRY` 陣列（三支 ETF）、`ETF_CODES` derived export、`getEtfMeta(code)` helper
- [x] 1.2 替換 `src/app/investment/[etf]/page.tsx` 中的 `ETF_META`、`COMPARE_ETF_META`、`SUPPORTED_ETFS`、`COMPARE_ETF_CODES` 常數，改為從 `etfRegistry.ts` import

## 2. 路由重構

- [x] 2.1 改寫 `src/app/investment/page.tsx`：移除 redirect 邏輯，改為 Server Component 直接 render 選股池主頁（聚合所有 ETF 資料）
- [x] 2.2 新增 `src/app/investment/revenue-lab/page.tsx`：render `RevenueLab`，`currentHoldings` 傳入所有 ETF 聯集持股
- [x] 2.3 改寫 `src/app/investment/[etf]/page.tsx`：invalid code 改 redirect 到 `/investment`（非 `/investment/${DEFAULT_ETF}`）；移除 StockPickerHub / GoldenGrowthZone / EtfComparePanel，只保留持股明細和異動紀錄兩 tab

## 3. 選股池主頁資料層

- [x] 3.1 在 `src/app/investment/page.tsx` 實作 `getAllHoldings()`：對 `ETF_CODES` 執行 `Promise.all`，回傳 `Record<etfCode, Holding[]>`
- [x] 3.2 實作 `buildUnionHoldings(allHoldings)`：合併各 ETF 持股為唯一個股清單，重複個股取最高 `weight`，並為每支股票記錄 `in_etfs` 陣列與 `weights` map
- [x] 3.3 實作 `getAllDiffLogs()`：查詢所有 ETF 的 `etf_diff_logs`，合併後依日期降序排列，每筆保留 `etf_code` 欄位

## 4. StockPickerHub 升級

- [x] 4.1 `UnifiedHolding` 型別新增 `revenue_yoy: number | null` 欄位
- [x] 4.2 `buildUnifiedHoldings()` 從傳入的 holdings 資料中填入 `revenue_yoy`
- [x] 4.3 表格新增 `YOY%` 欄，顯示規則：≥50% 綠色、<0% 紅色、其餘中性；無資料顯示 `—`
- [x] 4.4 `FactorFilter` 型別新增 `'golden_zone'` 和 `'explosive_zone'`
- [x] 4.5 強勢因子篩選列新增「黃金區間」(YOY 50–100%) 和「爆發區間」(YOY > 100%) 兩個 chip
- [x] 4.6 `filteredHoldings` useMemo 加入 golden_zone / explosive_zone 篩選邏輯

## 5. InvestmentTabs 改為四 tab（池頁用）

- [x] 5.1 `InvestmentTabs` props 移除 `revenueLabContent`，新增可選 `ledgerContent` 接受多 ETF logs
- [x] 5.2 tab 清單改為：`選股池 / 策略分析 / 異動紀錄 / ETF 對比`（`VALID_TABS` 更新為 `['stock-picker', 'analysis', 'ledger', 'compare']`）
- [x] 5.3 池頁 header 新增 Revenue Lab 入口連結（`/investment/revenue-lab`）

## 6. DiffLedger 支援多 ETF

- [x] 6.1 `DiffLedger` props 新增 `showEtfFilter?: boolean`（預設 false，池頁傳 true）
- [x] 6.2 當 `showEtfFilter` 為 true 時，頂部渲染 ETF filter chips（「全部」+ 各 ETF code，顏色從 registry 取）
- [x] 6.3 選中 ETF chip 時過濾 logs，`etf_code` badge 顯示在每行左側

## 7. GoldenGrowthZone 接受聯集持股

- [x] 7.1 池頁 `buildUnionHoldings()` 結果傳入 `GoldenGrowthZone`（已有 `data: Holding[]` prop，直接傳即可）
- [x] 7.2 確認 `GoldenGrowthZone` 內的 hardcoded `THESIS-00981` badge 改為通用文案（移除特定 ETF 代號）

## 8. EtfSelector 更新

- [x] 8.1 `EtfSelector` 新增 `mode: 'drilldown' | 'pool'` prop
- [x] 8.2 `drilldown` 模式：現有行為（切換 ETF 跳對應深潛頁 `/investment/[etf]`）
- [x] 8.3 `pool` 模式：改為顯示「返回選股池」按鈕，連結到 `/investment`

## 9. 驗證

- [x] 9.1 `/investment` 頁面正常 render，顯示三 ETF 合併持股
- [x] 9.2 `/investment?etf=00981A` 正常 render 選股池（不 redirect，忽略 param）
- [x] 9.3 `/investment/00981A` 顯示深潛頁（持股明細 + 異動紀錄）
- [x] 9.4 `/investment/INVALID` redirect 到 `/investment`
- [x] 9.5 `/investment/revenue-lab` 正常 render Revenue Lab
- [x] 9.6 選股池黃金區間篩選：過濾後只剩 YOY 50–100% 個股
- [x] 9.7 異動紀錄 ETF filter：點選單一 ETF chip 後只顯示該 ETF 的 logs
- [x] 9.8 `yarn build` 無 TypeScript 錯誤
