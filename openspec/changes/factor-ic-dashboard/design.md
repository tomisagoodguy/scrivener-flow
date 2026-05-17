## Context

策略選股頁（`/investment/strategy`）與族群強弱頁（`/investment/sectors`）目前只顯示最終被選出的股票，但使用者無法判斷策略的因子在當前市場環境下是否仍具備預測力。

本設計引入「因子 IC 儀表板」：月頻計算 Rank IC 並寫入 Supabase，前端在策略卡片和族群頁面顯示 IC 快照 badge 與 12 個月走勢 sparkline。

現有系統：
- Pipeline 每日執行，但無 IC 計算步驟
- `strategy_signals` 表有策略命中資料，無因子效力評估
- 前端策略頁只讀取 `strategy_signals`

## Goals / Non-Goals

**Goals:**

- 月頻獨立腳本計算 8 個因子的 Rank IC（1/5/20 日），寫入 `factor_ic_stats`
- 策略卡片新增因子健康度 badge（當月 `ic_20d`，色彩編碼）
- badge 點擊展開 12 個月 sparkline（SVG，無外部 chart 依賴）
- 族群頁頂部新增可折疊 IC 面板（4 個代理因子）
- GitHub Actions 月頻 workflow

**Non-Goals:**

- 不在主 daily pipeline 中跑 IC（節省 FinLab 配額）
- 不計算日頻 IC（月頻已足夠判斷因子有效性趨勢）
- 不自動調整策略權重（IC 僅供參考，人工判斷）
- 不計算族群層級的 IC（改用個股層級代理因子）

## Decisions

### 月頻獨立腳本而非整合進 daily pipeline

月頻 IC 計算需要拉 ~252 個交易日資料，每次約耗費 FinLab 200–300 MB 配額。Daily pipeline 若每日執行會大量消耗配額，且 IC 不需要每日更新。

**選擇**：獨立腳本 `ETF/compute_factor_ic.py` + 獨立 monthly workflow。

### Rank IC 採用 Spearman 橫截面均值

橫截面 Rank IC（每個日期對全市場計算 Spearman r，再取時序均值）是因子分析業界標準，對異常值不敏感。

計算窗口：最近 252 個交易日（約一年），每月更新。

### SVG Sparkline 不引入新 chart 套件

`FactorICSparkline` 用原生 SVG path 畫折線，無需安裝 recharts / lightweight-charts 等額外依賴。資料點最多 12 個，複雜度低。

### Supabase 直接讀取（anon client）

`factor_ic_stats` 設定 public read RLS，讓前端 Server Action 用 anon client 讀取，無需 service role。

### 因子簡短顯示標籤

| factor_name        | 顯示標籤  |
| ------------------ | --------- |
| rev_momentum_3_12  | 營收動能  |
| rsv_180            | RSV180    |
| rs_100             | RS100     |
| ma_trend_score     | 均線趨勢  |
| broker_force       | 主力籌碼  |
| vol_breakout       | 量能突破  |
| smallcap_pct       | 小市值    |
| price_to_high_240  | 近高點    |

## Risks / Trade-offs

- [FinLab 配額] 每月拉 252 日資料約 200–300 MB → 月頻觸發，配額影響可接受
- [IC 解讀誤差] 代理因子（個股代替族群）IC 可能低估真實族群 IC → 說明文字標注「代理因子」
- [資料延遲] 月初第一天如遇假日，workflow 會等到下個工作日 → cron 設 `0 15 1-5 * 1`（月初一到五取最早的一天）
- [IC 為負時的 UX] IC 為負的因子顯示紅色 badge，使用者可能困惑 → tooltip 說明「因子近期預測力下降，非錯誤」

## Migration Plan

1. 執行 DB migration：`supabase/migrations/20260601000000_add_factor_ic_stats.sql`
2. 手動執行一次 `ETF/compute_factor_ic.py` 回填近 12 個月歷史 IC（跑 12 次，每次指定不同月份）
3. 部署前端（badge + sparkline + sector panel）
4. 啟用 monthly workflow
