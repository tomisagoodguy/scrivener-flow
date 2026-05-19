## 1. Python Pipeline — SyncCompanyStep 寫入 industry 欄位

- [x] 1.1 在 `ETF/pipeline/steps/sync_company_step.py` 中確認 FinLab `company_basic_info` DataFrame 欄位，找到對應 `industry` 的欄位名稱（通常為「產業別」或 `industry`）
- [x] 1.2 依照「SyncCompanyStep 寫入 industry 欄位」設計決策，在 `save_company_info()` 或 `SyncCompanyStep.run()` 的 upsert mapping 中加入 `industry` 欄位，並新增欄位存在性檢查：若 DataFrame 無 `industry` 欄則 log warning 並跳過（實作「SyncCompanyStep writes industry to stock_basic_info」需求）
- [x] 1.3 確認 `stock_basic_info` 資料表有 `industry TEXT` 欄位（查 `supabase/migrations/`），若無則新增 migration 加入該欄

## 2. TypeScript — strategyUtils 型別擴充（策略命中計算 StrategyStock 型別）

- [x] 2.1 在 `src/lib/investment/strategyUtils.ts` 的 `StrategyStock` interface 新增 `name?: string | null` 與 `industry?: string | null` 欄位，滿足「策略命中計算」spec 對 StrategyStock 型別的新增需求

## 3. Server Action — getStrategySignals 用 JOIN 而非獨立查詢取得 stock_basic_info

- [x] 3.1 依照「Server Action 用 JOIN 而非獨立查詢」設計決策，在 `src/app/actions/getStrategySignals.ts` 的 Step 2 查詢完成後，收集所有 `allStockIds`，對 `stock_basic_info` 發出 `select('stock_code, name_short, industry').in('stock_code', allStockIds)` 查詢（實作「Strategy stock displays name and industry tag」需求）
- [x] 3.2 建立 `stockInfoMap: Map<string, { name: string | null; industry: string | null }>` 供 Step 5 group 時使用
- [x] 3.3 在 Step 5 建立 `StrategyStock` 時，從 `stockInfoMap` 取對應的 `name` 與 `industry`（`stockInfoMap.get(stockId) ?? { name: null, industry: null }`）

## 4. UI — StrategySignalCard 顯示名稱與產業標籤樣式

- [x] 4.1 在 `src/components/features/StrategySignalCard.tsx` 的每支股票列中，在股票代號旁顯示 `name`（若非 null），格式為 `<code> <name>`（實作「StrategySignalCard displays name and industry tag」需求）
- [x] 4.2 依照「產業標籤樣式」設計決策，在股票列加入產業標籤 badge：當 `industry` 非 null 時，顯示 `<span className="text-xs px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-700 dark:text-blue-300">{industry}</span>`；null 時不渲染
