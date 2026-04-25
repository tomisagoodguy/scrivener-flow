## 1. 資料補齊（Backfill）

- [x] 1.1 確認 `etf_flow_daily` 表在 Supabase 已存在（migration `20260424115900` 已 apply）
- [x] 1.2 本地執行 `uv run python ETF/scripts/backfill_flow.py --days 90`，觀察 log 無嚴重錯誤
- [x] 1.3 在 Supabase Studio 驗證 `etf_flow_daily` 有 >= 1 筆 `totals->>'stocks_count' != '0'` 的記錄
- [x] 1.4 確認 `FlowComputeStep` 已在 `ETF/pipeline/orchestrator.py` 的步驟列表中

## 2. PreMarketGuide 元件

- [x] 2.1 新增 `src/components/features/investment/PreMarketGuide.tsx`（Server Component）
- [x] 2.2 實作 `fetchPreMarketData()` Server function：讀 `etf_flow_daily` 最新一筆（service client，bypass RLS）
- [x] 2.3 實作共識買進區塊：過濾 `inflow[].etf_count >= 3`，依 `total_nt` 降序
- [x] 2.4 實作集中加碼區塊：過濾 `etf_count < 3 且 total_nt >= 300_000_000`，最多 6 檔
- [x] 2.5 實作共識賣區塊：過濾 `outflow[].etf_count >= 3`，無則顯示「無」
- [x] 2.6 實作 basket buy 偵測：`by_etf` 最大 ETF net_flow / total_in_nt > 0.5 時顯示橘色警示
- [x] 2.7 實作淨流入總結行：正值 rose-600，負值 emerald-600（台股慣例）
- [x] 2.8 無資料時返回 null（不渲染任何 DOM）

## 3. 整合至投資首頁

- [x] 3.1 在 `src/app/investment/page.tsx` 的 `InvestmentTabs` 前插入 `<PreMarketGuide />`
- [x] 3.2 確認 `PreMarketGuide` 使用 service client（`src/lib/supabase/service.ts`），不用 anon client

## 4. 驗證

- [x] 4.1 `yarn dev` 本地啟動，確認盤前指引卡片正常顯示在 Tab 上方
- [x] 4.2 確認深色模式下色彩正確（不被 `dark-theme.css !important` 覆蓋）
- [x] 4.3 確認 `DailyFlowPanel`（資金流向 tab）也正常顯示資料（有了 backfill 後）
- [x] 4.4 確認無 TypeScript 錯誤：`yarn build` 通過
