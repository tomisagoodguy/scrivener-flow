## Why

策略選股頁與族群強弱頁目前只顯示「哪些股票被選到」，但無法判斷選股條件本身是否仍然有效。引入 IC（Information Coefficient）衰減指標，讓使用者能一眼看出每個因子的當月預測力，以及過去 12 個月的有效性趨勢。

## What Changes

- 新增月頻 FinLab 計算步驟，計算 super8888 / capital_layer / low_vol_cap / broker_ranked 各策略核心因子在 1/5/20 日持有期的 Rank IC，並寫入 Supabase
- 策略選股頁（`/investment/strategy`）：每個策略卡片下方新增因子健康度列（當月 IC 快照 badge）
- 策略選股頁：點擊因子名稱展開近 12 個月 IC 走勢折線圖
- 族群強弱頁（`/investment/sectors`）：頂部新增族群強弱代理因子 IC 面板
- 新增 GitHub Actions 月頻 workflow，每月第一個交易日自動執行 IC 計算

## Capabilities

### New Capabilities

- `factor-ic-compute`: 月頻計算各策略核心因子 Rank IC（1/5/20d），寫入 `factor_ic_stats` 表
- `factor-ic-dashboard-ui`: 前端讀取 `factor_ic_stats`，在策略頁顯示快照 badge + 折線圖，在族群頁顯示 IC 面板

### Modified Capabilities

- `strategy-signal-compute`: 策略卡片新增 IC 健康度顯示，擴充 Server Action 回傳 IC 資料

## Impact

- Affected specs: strategy-signal-compute（修改顯示邏輯），新增 factor-ic-compute、factor-ic-dashboard-ui
- Affected code:
  - New: `ETF/compute_factor_ic.py`
  - New: `ETF/pipeline/steps/factor_ic_step.py`
  - New: `.github/workflows/factor_ic_monthly.yml`
  - New: `supabase/migrations/20260601000000_add_factor_ic_stats.sql`
  - New: `src/app/actions/getFactorIC.ts`
  - New: `src/components/features/FactorICPanel.tsx`
  - New: `src/components/features/FactorICSparkline.tsx`
  - Modified: `src/app/investment/strategy/page.tsx`
  - Modified: `src/app/investment/sectors/SectorDashboard.tsx`
  - Modified: `src/components/features/StrategySignalCard.tsx`
