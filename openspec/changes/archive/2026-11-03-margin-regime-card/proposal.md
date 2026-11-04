## Why

`/investment/market-chips` 的融資融券走勢圖只畫餘額，看圖的人容易把「融資創新高」讀成大跌前兆。2026-11-03 用 FinLab 重現外部研究（2008-01～2026-08，4,563 個交易日，月份區塊重抽 5,000 次）：

- 融資（上市＋上櫃融資金額）創一年新高 588 天，之後 60 個交易日內加權指數盤中曾跌一成的比例 13.8%，平常日 20.1%，差距區間約 [-13.6, +1.5] pp 跨零：分不出高低。
- 融資創高日 93.5% 指數離一年高點不到 3%（平常日 40%）：融資高點只是股價高點的影子。
- 指數創一年新高但融資沒創高的 196 天，跌一成比例 10.2%，與融資創高組也分不出高低。

另外驗證過 GA 條件池的 `margin_position`（融資趨勢）：排除 2009 年前無個股融資資料的日子後，成立 13.8% vs 不成立 21.9%，四種參數的差距區間全部跨零，不是穩健的風險訊號，不放上頁面。

讓頁面在融資圖旁說清楚：融資創新高不是賣訊，也不是安全的理由，只代表現在在高點。

## What Changes

- 新增 pipeline 輔助步驟 `MarginRegimeStep`（緊接 `TaiexMa60RegimeStep`），每日寫一列至新表 `market_margin_regime_daily`：融資餘額、是否創一年新高、指數是否離一年高點不到 3%，以及每日全歷史重算的統計（各組 60 日內跌一成比例、60 日平均報酬、差距 95% 區間、影子比例）。
- 純函式放 `ETF/analysis/margin_regime.py`；區塊重抽共用 `ETF/analysis/buying_pattern_stats.py` 的 `bootstrap_excess`（以月份為區塊鍵）。
- 新增 Server Action `getMarginRegime` 與 `MarginRegimeCard`，掛在市場籌碼頁的融資融券圖下方：顯示今日狀態、歷史比例對照與說明文字（數字取自當日統計，不寫死）。

## Capabilities

### New Capabilities

- `margin-regime-indicator`: 融資創一年新高的每日狀態、全歷史跌一成統計與市場籌碼頁說明卡

### Modified Capabilities

(none)

## Impact

- Affected specs: margin-regime-indicator
- Affected code:
  - ETF/analysis/margin_regime.py（新增：狀態與統計純函式）
  - ETF/analysis/buying_pattern_stats.py（bootstrap_excess 文件改為通用區塊鍵，行為不變）
  - ETF/pipeline/steps/margin_regime_step.py（新增）
  - ETF/pipeline/orchestrator.py（註冊步驟）
  - ETF/tests/test_margin_regime.py（新增）
  - ETF/tests/fixtures/margin_regime_20080101_20261102.csv（新增：FinLab 匯出對帳資料，欄位 date, margin, close, low）
  - supabase/migrations/20261103120000_add_market_margin_regime_daily.sql（新增）
  - src/app/actions/getMarginRegime.ts（新增）
  - src/lib/investment/marginRegime.ts（新增：型別與顯示純函式）
  - src/lib/investment/__tests__/marginRegime.test.ts（新增）
  - src/components/features/investment/market-chips/MarginRegimeCard.tsx（新增）
  - src/components/features/investment/market-chips/__tests__/MarginRegimeCard.test.tsx（新增）
  - src/app/investment/market-chips/page.tsx（掛載說明卡）
  - ETF/CLAUDE.md（市場籌碼資料線補新表）
