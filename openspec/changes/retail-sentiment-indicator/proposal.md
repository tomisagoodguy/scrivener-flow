## Why

系統目前的 `/investment/breadth` 頁面只有 ADL/ADR 廣度指標，缺乏散戶籌碼層面的市場情緒資訊。
FinLab `etl:inventory` 資料已涵蓋集保股權分散資料（小於十張人數占比、零股占比），能夠量化「散戶參與度加速」與「籌碼碎片化」兩種截然不同的市場狀態，歷史回測顯示前者為短中天期偏多信號（20D 勝率 83%、超額報酬 +3.25pp），後者為長天期偏弱信號（120D）。

## What Changes

- 新增 ETF Pipeline 輔助步驟 `RetailSentimentStep`：每週從 FinLab `etl:inventory:小於十張佔比` 與 `etl:inventory:零股佔比` 計算市場層級散戶指標，寫入 `market_breadth_daily`
- 新增 DB 欄位：`small_holder_chg_12w`、`small_holder_z_score`、`is_retail_accelerating`、`is_odd_lot_fragmented`
- 新增 Server Action `getRetailSentiment()`
- 新增前端卡片元件 `RetailSentimentCard`，整合進 `/investment/breadth` 頁面
- 修改 `market-breadth-indicator` spec：`market_breadth_daily` 擴充新欄位

## Non-Goals

- 不做個股層級的散戶指標（只做全市場中位數聚合）
- 不新增獨立頁面，整合進現有 `/investment/breadth`
- 不做歷史回測介面，只顯示當前讀數 + 歷史趨勢圖
- 不替換現有 `equity_distribution_stats`（個股層級保留現有架構）

## Capabilities

### New Capabilities

- `retail-sentiment-pipeline`: ETF Pipeline 輔助步驟，每週計算市場層級小戶人數占比 12 週變化與零股占比，判斷是否超過近 3 年 P90 門檻，寫入 `market_breadth_daily`
- `retail-sentiment-display`: `/investment/breadth` 頁面新增散戶情緒卡片，顯示當前讀數、Z-score、信號狀態（資金擴散 / 矛盾期 / 籌碼尾端 / 中性）與歷史走勢

### Modified Capabilities

- `market-breadth-indicator`: `market_breadth_daily` 資料表新增 4 個散戶指標欄位，`/investment/breadth` 頁面新增卡片區塊

## Impact

- Affected specs: `retail-sentiment-pipeline`（新）、`retail-sentiment-display`（新）、`market-breadth-indicator`（修改）
- Affected code:
  - New: `ETF/pipeline/steps/retail_sentiment_step.py`
  - New: `src/app/actions/getRetailSentiment.ts`
  - New: `src/components/features/RetailSentimentCard.tsx`
  - New: `supabase/migrations/20260606140000_add_retail_sentiment.sql`
  - Modified: `ETF/pipeline/orchestrator.py`
  - Modified: `src/app/investment/breadth/page.tsx`
