## Why

`/investment/buying-patterns` 只列各買進模式的勝率與平均報酬，沒有對照組：2026 年多頭讓所有模式的絕對數字都偏高，看不出哪個模式真的比「隨便挑一天」好，小樣本模式也無從判斷是不是雜訊。更根本的是資料本身不完整（2026-11-01 實測）：

- `etf_buying_patterns` 共 6,058 筆，有 20 日報酬的只有 593 筆，5 月與 7 月事件為 0 筆。原因是 `BuyingPatternStep._fill_forward_returns` 抓最近 30 天的**全部**事件、新到舊排序後只取前 500 筆再補，每日約 50 筆新事件，最舊、正需要補長天期的事件每天都被截掉。股價（`stock_prices_daily`）實測是齊的，可回補。
- `backfill_future_returns.py` 有同樣的「先 LIMIT 500 再篩」問題，且報酬計算邏輯與 pipeline 步驟各寫一份（只算 4 個天期、不往後找交易日），兩者算出的值不一致。
- `getBuyingPatternStats` 一次 select 全表，PostgREST 單次上限 1000 列，實際有報酬的 4,998 列只聚合了 1000 列。

## What Changes

- 前瞻報酬計算抽成單一純函式，pipeline 步驟與回補腳本共用；補值改為「先篩出有到期且缺值天期的事件、不截斷」，寫入改批次。
- 回補腳本改為真正的全歷史回補（分批走完所有缺值事件），一次性補齊既有資料。
- 新增「平常日基準」：同一批股票在同期每個交易日的前瞻報酬，口徑與事件完全相同。
- 新增週區塊重抽（5,000 次）計算各模式相對基準的超額勝率與超額報酬 95% 信賴區間。
- 新增表 `etf_buying_pattern_stats`，pipeline 每日整批重算寫入；`getBuyingPatternStats` 改讀此表（約 70 列），不再聚合原始事件。
- 頁面新增「與平常日比較」表，標示每個模式在 5／10／20 日是「較好／較差／分不出高低／樣本不足」。

## Capabilities

### New Capabilities

- `buying-pattern-baseline-stats`: 平常日基準、週區塊重抽超額信賴區間、統計表每日重算與頁面比較表

### Modified Capabilities

- `etf-future-returns-backfill`: 補值選取改為不截斷且涵蓋全部 10 個天期；回補腳本改為全歷史分批並與步驟共用計算邏輯

## Impact

- Affected specs: buying-pattern-baseline-stats, etf-future-returns-backfill
- Affected code:
  - ETF/analysis/buying_pattern_stats.py（新增：前瞻報酬、基準、重抽純函式）
  - ETF/pipeline/steps/buying_pattern_step.py（補值選取修正、批次寫入、每日重算統計）
  - ETF/pipeline/steps/backfill_future_returns.py（全歷史分批、改用共用函式）
  - ETF/scripts/backfill_buying_pattern_returns.py（刪除：第三份重複的補值實作，apply 時發現，功能由 backfill_future_returns.py 涵蓋）
  - ETF/tests/test_buying_pattern_stats.py（新增）
  - ETF/tests/test_backfill_future_returns.py（配合共用函式更新）
  - supabase/migrations/20261101120000_add_etf_buying_pattern_stats.sql（新增表）
  - src/app/actions/getBuyingPatternStats.ts（改讀統計表）
  - src/lib/investment/buyingPatternStats.ts（新增：判定與列轉換純函式；'use server' 檔只能匯出 async 函式，apply 時拆出）
  - src/app/actions/__tests__/getBuyingPatternStats.test.ts（新增）
  - src/app/investment/buying-patterns/page.tsx（掛載比較表）
  - src/app/investment/buying-patterns/PatternBaselineTable.tsx（新增）
  - ETF/CLAUDE.md（替換過時的回測統計表）
