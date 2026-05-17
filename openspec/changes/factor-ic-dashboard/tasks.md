## 1. 資料庫 Migration

- [x] 1.1 新增 `supabase/migrations/20260601000000_add_factor_ic_stats.sql`：建立 `factor_ic_stats` 表（month date, factor_name text, ic_1d float, ic_5d float, ic_20d float, computed_at timestamptz），PRIMARY KEY (month, factor_name)，並設定 public read RLS policy（anon 可讀，service role 可寫）—— 對應 Requirement: factor_ic_stats Database Schema

## 2. Python 計算腳本（月頻獨立腳本而非整合進 daily pipeline）

- [x] 2.1 新增 `ETF/compute_factor_ic.py`：載入 `.env.local`，用 `FINLAB_API_KEY` 登入 FinLab，下載 close / amt / rev / cap / buy_vol / sell_vol 資料，計算 8 個因子的連續值（rev_momentum_3_12、rsv_180、rs_100、ma_trend_score、broker_force、vol_breakout、smallcap_pct、price_to_high_240）—— 對應 Requirement: Monthly Factor IC Computation
- [x] 2.2 在 `ETF/compute_factor_ic.py` 中實作 `compute_rank_ic(factor_df, fwd_ret_df)` 函式：對齊日期後對每個日期算 `scipy.stats.spearmanr`（最少 30 支股票），取時序均值，回傳 float —— 對應 Rank IC 採用 Spearman 橫截面均值設計決策
- [x] 2.3 在 `ETF/compute_factor_ic.py` 中對 horizons 1/5/20 各算一次 Rank IC，組成結果列表，用 SQLAlchemy 對 `factor_ic_stats` 執行 upsert（ON CONFLICT (month, factor_name) DO UPDATE）—— 對應 Requirement: Monthly Factor IC Computation（Existing month overwrite 場景）
- [x] 2.4 支援 `--month YYYY-MM` 命令列參數（預設當月）以便手動回填歷史 IC —— 對應 Migration Plan 中「回填近 12 個月歷史 IC」

## 3. GitHub Actions 月頻 Workflow（月頻獨立腳本）

- [x] 3.1 新增 `.github/workflows/factor_ic_monthly.yml`：cron `0 15 1-5 * 1`（月初一到週一取最早）觸發，`uv run python ETF/compute_factor_ic.py`，使用 secrets：FINLAB_API_KEY、SUPABASE_DB_URL、NEXT_PUBLIC_SUPABASE_URL、SUPABASE_SERVICE_ROLE_KEY —— 對應 Requirement: Monthly GitHub Actions Workflow

## 4. 前端 Server Action

- [x] 4.1 新增 `src/app/actions/getFactorIC.ts`：實作 `getFactorIC(factors: string[], months: number)` Server Action，依設計決策「Supabase 直接讀取（anon client）」使用 `src/lib/supabase/server.ts`（anon client，不用 service role），查詢 `factor_ic_stats`，回傳型別 `{ factor: string; month: string; ic_1d: number | null; ic_5d: number | null; ic_20d: number | null }[]`，months 最大 24 —— 對應 Requirement: getFactorIC Server Action

## 5. 前端元件：FactorICSparkline

- [x] 5.1 新增 `src/components/features/FactorICSparkline.tsx`：接收 `data: { month: string; ic_20d: number | null }[]`（最多 12 筆），用原生 SVG path 畫折線，y=0 用灰虛線標注，正值段路徑用 emerald 色，負值段用 rose 色；少於 3 筆時回傳 null —— 對應設計決策「SVG Sparkline 不引入新 chart 套件」與 Requirement: Strategy Page Factor IC 12-Month Sparkline

## 6. 前端元件：FactorICPanel（族群頁）

- [x] 6.1 新增 `src/components/features/FactorICPanel.tsx`：接收 `data: ReturnType<typeof getFactorIC>`，顯示 4 個代理因子（sector_ret_1d、sector_ret_5d、vol_ratio_20d、above_ma20_pct）的當月 ic_1d/ic_5d/ic_20d 值與 12 個月 sparkline，預設折疊，header 標籤「篩選條件效力（IC）」—— 對應 Requirement: Sector Page Factor IC Panel

## 7. 修改策略頁元件

- [x] 7.1 修改 `src/components/features/StrategySignalCard.tsx`：新增 optional prop `factorIC: FactorICRow[]`，在股票列表下方渲染因子健康度列；badge 色彩：ic_20d ≥ 0.04 → emerald，0.02–0.04 → yellow，< 0.02 → rose；badge 點擊展開 `FactorICSparkline`；無資料時不渲染 badge 列 —— 對應 Requirement: StrategySignalCard Displays Factor IC Badges 與 Requirement: Strategy Page Factor IC 12-Month Sparkline
- [x] 7.2 修改 `src/app/investment/strategy/page.tsx`：呼叫 `getFactorIC`（傳入各策略對應因子清單，months=12），將 IC 資料按 strategy_id 分組後作為 `factorIC` prop 傳入對應的 `StrategySignalCard` —— 對應因子簡短顯示標籤設計決策與 Requirement: Strategy Page Factor IC Snapshot Badges

## 8. 修改族群強弱頁

- [x] 8.1 修改 `src/app/investment/sectors/SectorDashboard.tsx`：在頂部插入 `<FactorICPanel>`，呼叫 `getFactorIC(['sector_ret_1d','sector_ret_5d','vol_ratio_20d','above_ma20_pct'], 12)` 取資料，且「代理因子」字樣顯示在 panel 副標題 —— 對應 Requirement: Sector Page Factor IC Panel 與設計說明中「IC 解讀誤差」風險緩解
