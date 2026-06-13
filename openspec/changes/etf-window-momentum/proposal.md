## Why

現有 `/investment/consensus` 為「單日快照」共識（`etf_stock_overlap` / `etf_stock_divergence`），無法看出「短期內被多家投信持續同步加碼」的動能訊號。且 Pocket 來源的 ETF 公告日才更新，單日視角會漏掉稀疏公告的加碼；以 N 日窗口聚合 `etf_diff_logs` 可同時解決動能偵測與稀疏公告兩個問題（參考 simon99 active-etf-tracker momentum 頁）。

## What Changes

- 新增 `/investment/momentum` 頁面：過去 N 天（3/5/10 天可選）內，被 M 家以上（≥2/≥3/≥5 可選）主動式 ETF 同步加碼的個股卡片牆
- 新增 Server Action：窗口聚合 `etf_diff_logs`（BUY/IN 事件），結合 `stock_prices_daily` 計算每檔個股的：
  - 窗口加碼總股數、合計增幅（diff_weight 加總 pp）、最大單筆增幅
  - 吸量比 = 窗口加碼總股數 ÷ 窗口市場總成交股數
  - 吸量趨勢（窗口後半 vs 前半的吸籌量比較 → 加速/衰退）
  - 各 ETF 加碼明細（etf_code、加碼權重 pp）
- 每張卡片含近 N 日 mini K 線 + 成交量圖（SVG 自繪，資料來自 `stock_prices_daily` OHLCV）
- 投資模組側邊欄新增「同步加碼」導覽入口
- 色彩遵循台股慣例：紅漲綠跌（`text-rose-600` / `text-emerald-600`）

## Capabilities

### New Capabilities

- `etf-window-momentum`: 跨 ETF 的 N 日窗口同步加碼聚合（Server Action 資料層 + `/investment/momentum` 頁面呈現層）

### Modified Capabilities

(none)

## Impact

- Affected specs: 新增 `etf-window-momentum`；與既有 `etf-consensus-direction`（單日共識）、`fund-momentum-signal`（FinLab 投信買賣超動能）互補，不修改其需求
- Affected code:
  - New: `src/lib/investment/windowMomentumUtils.ts`、`src/app/actions/getWindowMomentum.ts`、`src/app/investment/momentum/page.tsx`、`src/app/investment/momentum/components/MomentumCard.tsx`、`src/app/investment/momentum/components/MiniKChart.tsx`、`src/app/investment/momentum/components/MomentumFilter.tsx`
  - Modified: `src/app/investment/layout.tsx`（新增導覽連結）
  - Removed: (none)
- 資料依賴：`etf_diff_logs`（保留 180 天）、`stock_prices_daily`（保留 260 天）、`market_breadth_daily`（交易日曆來源）、`src/lib/investment/etfRegistry.ts`（ETF 顏色/名稱）— 無 DB schema 變更、無 Python pipeline 變更
