## Context

`etf_buying_patterns` 每筆事件存 `future_returns`（jsonb，key 為日曆天天期 `"1"`～`"30"`，value 為小數報酬）。計算口徑在 `BuyingPatternStep._compute_missing_returns`：以事件日收盤為基準，目標日 = 事件日 + h 個日曆天，目標日無價則往後最多找 2 天。

2026-11-01 實測現況：

| 項目 | 實測值 |
| --- | --- |
| 事件總數 / 有任一報酬 / 有 20 日報酬 | 6,058 / 4,998 / 593 |
| 事件期間 / 月數 / 股票數 | 2026-05-04～2026-10-30 / 6 / 636 |
| 2026-07-01 事件的 `stock_prices_daily` 價格 | 事件後 35 日曆天內有 25 個交易日價格，但 `future_returns` 只到 `"7"` |

三個缺陷：

1. `_fill_forward_returns` 取 30 天內全部事件 → `ORDER BY event_date DESC` → 截前 500 筆（`FILL_BATCH_SIZE`）才補值。每日事件數約 50 筆（6,058 筆 ÷ 約 125 個交易日，估計值），30 天窗口約 1,500 筆，最舊的事件（正需要補 20～30 日天期）永遠被截掉。
2. `backfill_future_returns.py` 同樣先 `LIMIT 500` 再篩，且自帶另一份計算邏輯（只算 1/5/10/20、目標日無價就放棄），與步驟算出的值不一致。
3. `getBuyingPatternStats` 用 anon client 一次 select 全表，PostgREST 單次回傳上限 1000 列，只聚合了 4,998 列中的 1000 列；另外查詢失敗時在 `unstable_cache` 內回 `[]`，會把空結果快取一小時。

## Goals / Non-Goals

**Goals:**

- 既有與未來事件的 10 個天期報酬都能補齊（股價存在時）。
- 每個模式、每個天期都有「平常日基準」與超額勝率／超額報酬的 95% 信賴區間。
- 頁面能一眼看出模式是「較好／較差／分不出高低／樣本不足」。

**Non-Goals:**

- 不改 7 種模式的分類規則。
- 不把天期改成交易日（會讓既有 4,998 筆存值失效）；日曆天口徑造成 `"3"` 與 `"5"` 常相同屬已知現象。
- 不改既有三張圖（折線／熱力／勝率）的呈現，只換資料來源。
- 不處理融資相關的另外兩項（融資圖說明、`margin_position` 回測）。

## Decisions

### 前瞻報酬計算收斂到單一純函式模組

新增 `ETF/analysis/buying_pattern_stats.py`，沿用步驟現行口徑（日曆天、往後最多找 2 天），提供 `HORIZONS`、`forward_return`、`compute_missing_returns`、`due_missing_horizons`。步驟與回補腳本都改呼叫它，刪除兩邊各自的實作。
替代方案：保留回補腳本的「目標日無價即放棄」口徑——否決，週末／假日會讓大量天期永遠補不到，且與已存的 4,998 筆口徑不同。

### 補值選取先篩後補、不截斷

步驟讀取窗口內事件後，先用 `due_missing_horizons`（`event_date + h <= today` 且該 key 缺值）篩出需要補的事件，全部處理不截斷；窗口由 30 天放寬為 35 天（最長天期 30 + 往後找 2 天 + 3 天容忍 pipeline 漏跑）。寫入改為每批最多 1000 筆、一次來回的 `UPDATE ... FROM (VALUES %s)`（psycopg2 `execute_values`），jsonb 仍用 `||` 增量合併。
替代方案：只把 `FILL_BATCH_SIZE` 調大——否決，每日事件數成長後同樣問題會再出現，且逐列 UPDATE 在 CI 每列約 140ms（見 ETF/CLAUDE.md 券商寫入事故）。

### 回補腳本以 id 鍵集分頁走完全表

`run_backfill` 以 `WHERE id > :last_id ORDER BY id LIMIT 1000` 分頁，每頁篩出需補事件、查該頁股票價格、批次寫入，直到沒有下一頁。冪等：重跑時已補的 key 不再出現在需補清單。

### 平常日基準採「同一批股票、同期全部交易日」

基準樣本 = `etf_buying_patterns` 出現過的所有 `stock_code`，在 [最早事件日, 最晚事件日] 之間每個有收盤價的交易日，各自用 `forward_return` 算 10 個天期。不排除事件日本身（對應「隨便挑一天」）。
替代方案：每筆事件配對同股票隨機日——否決，會把「ETF 挑中好股票」這部分訊號也扣掉，問題變成另一個。
估計量：約 636 檔 × 125 日 ≈ 8 萬個起始日（估計值；apply 時由統計步驟 log 實際 `baseline_n` 確認）。

### 信賴區間用週區塊配對重抽

區塊 = 起始日所屬 ISO 週。對每個（模式, 天期）：彙整每週的事件數、勝數、報酬和，以及基準的同樣三項；每次重抽從「有基準樣本的週」中有放回抽同數量的週，模式統計量與基準統計量用同一組抽樣權重計算，取差為超額。重抽 5,000 次，取 2.5／97.5 百分位；亂數種子固定（`np.random.default_rng(20261101)`）使結果可重現。抽樣中模式事件數為 0 的那次記為 NaN、以 `nanpercentile` 略過。
替代方案：月區塊（參考研究的做法）——否決，本資料只有 6 個月，6 個區塊的重抽區間不可信；週區塊約 26 個。

### 樣本不足不給區間

某（模式, 天期）事件數 < 30 或涵蓋週數 < 8 時，四個區間欄位存 NULL，頁面判定為「樣本不足」。

### 統計結果預算存表、頁面只讀

新增表 `etf_buying_pattern_stats`，`BuyingPatternStep` 補值之後整批重算，單一交易內 `DELETE` 全表後 `INSERT`；計算失敗則不進交易、保留前一日結果。`getBuyingPatternStats` 改讀此表（約 6 模式 × 10 天期 ≈ 60 列，估計值），不再聚合原始事件，同時解掉 1000 列上限。
替代方案：Server Action 即時算——否決，基準需讀約 10 萬列價格（估計值），PostgREST 要分頁上百次。

### 判定以超額平均報酬區間為準

`classifyExcess(excessRet: [lo, hi] | null)`：區間為 null → `insufficient`；`lo > 0` → `better`；`hi < 0` → `worse`；其他 → `indistinguishable`。超額勝率區間只顯示數字，不另給判定，避免同一列出現兩個互相矛盾的徽章。

## Implementation Contract

**行為**

- 每日 pipeline 跑完 `BuyingPatternStep` 後：35 天窗口內所有到期且有股價的天期都有值；`etf_buying_pattern_stats` 為當日重算結果。
- 手動執行 `uv run python ETF/pipeline/steps/backfill_future_returns.py` 一次即補完全歷史，印出更新筆數；重跑印出 `No records need backfill`。
- `/investment/buying-patterns` 既有三張圖照舊，數字改來自統計表；下方新增「與平常日比較」表，列出各模式在 5／10／20 日的樣本數、勝率與平常日勝率、超額勝率區間、平均報酬與平常日平均、超額報酬區間、判定徽章；表下附方法說明。

**資料形狀**

`etf_buying_pattern_stats`（PK `(pattern_type, horizon)`，RLS 開啟、公開讀取）：
`pattern_type TEXT, horizon INT, n INT, n_weeks INT, win_rate FLOAT, avg_return FLOAT, baseline_n INT, baseline_win_rate FLOAT, baseline_avg_return FLOAT, excess_win_lo FLOAT NULL, excess_win_hi FLOAT NULL, excess_ret_lo FLOAT NULL, excess_ret_hi FLOAT NULL, period_start DATE, period_end DATE, computed_at TIMESTAMPTZ DEFAULT NOW()`。比率與報酬皆為小數（0.07 = 7%）。

`PatternStats`（`getBuyingPatternStats` 回傳）保留 `patternType`、`n`（各天期最大樣本數）、`avgReturns`、`winRates`，新增 `byHorizon: Record<string, HorizonComparison>`，`HorizonComparison = { n, winRate, avgReturn, baselineWinRate, baselineAvgReturn, excessWin: [number, number] | null, excessRet: [number, number] | null, verdict: 'better' | 'worse' | 'indistinguishable' | 'insufficient' }`。

**失敗模式**

- 統計重算或補值失敗：`BuyingPatternStep` 為輔助步驟，`logger.error` 後不 raise；統計表保留前一次結果。
- `getBuyingPatternStats` 查詢失敗：在 `unstable_cache` 內 throw，外層 catch 記錄錯誤並回 `[]`（不快取空結果）；cache key 升為 `buying-pattern-stats-v2`。
- 目標日往後 2 天仍無價（停牌、長假）：該天期維持缺值，統計時略過，不估計。

**驗收**

- `uv run pytest ETF/tests/test_buying_pattern_stats.py ETF/tests/test_backfill_future_returns.py` 通過，涵蓋：選取不截斷、往後找交易日、基準樣本、重抽區間與種子可重現、樣本不足回 NULL。
- `yarn test --testPathPatterns getBuyingPatternStats` 通過，涵蓋 `classifyExcess` 四種判定與資料列轉換。
- 回補後 SQL 實測：`event_date + 22 <= 執行日` 且事件日有收盤價的事件中，有 `"20"` key 的比例 ≥ 95%。
- 頁面實跑：比較表顯示每個模式 3 列天期、徽章顏色正確（較好＝rose、較差＝emerald、其他＝灰）。

**範圍**

- 範圍內：上述三個缺陷修正、基準與區間、統計表、比較表、ETF/CLAUDE.md 統計段落改寫。
- 範圍外：模式分類規則、天期口徑、既有圖表樣式、融資相關功能。

## Risks / Trade-offs

- [週區塊低估長天期的相依性：20～30 日報酬跨越多週，相鄰週的樣本重疊] → 區間可能偏窄；方法說明註明，且判定只在區間完全不跨零時才給「較好／較差」。
- [樣本期只有 6 個月且多頭] → 超額是「相對同期平常日」，已扣掉多頭共同漲幅，但無法代表其他盤勢；頁面註明期間。
- [回補直接寫 production 的 `etf_buying_patterns`] → 只做 jsonb `||` 增量合併、不覆蓋既有 key、冪等；執行前需使用者同意。
- [基準需讀約 10 萬列價格（估計值）拖慢每日 pipeline] → apply 時 log 統計步驟耗時；若實測超過 60 秒，改為只在每週第一個交易日重算。
