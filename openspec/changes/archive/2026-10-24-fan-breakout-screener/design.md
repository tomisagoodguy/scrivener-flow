## Context

- 策略框架：每支策略繼承 `BaseStrategy`，實作 `get_positions(cache)`，回傳 index 為日期、columns 為股票代號的 DataFrame；註冊在 `ALL_STRATEGIES`。StrategySignalStep 每日只取每支策略**最新一天**的入選股寫入 `strategy_signals`（`UNIQUE(strategy_id, date, stock_id)`），`conditions` 欄位一律寫 null；入選股會併入 `ctx.secondary_stock_codes`，由後續 SyncOHLCVStep 同步到 `stock_prices_daily`。
- 保留期：`strategy_signals` 30 天，`stock_prices_daily` 260 天。
- 共用快取 `StrategyDataCache` 只有未還原收盤價 `close`，沒有還原價。
- 前端：策略頁在 `/investment/strategy`；`StockChart` 的均線寫死為 MA5/20/60，也不支援標記；資料來自 `/api/investment/prices`（讀 `stock_prices_daily`）。`DualAxisChart` 已示範 lightweight-charts v5 的 `createSeriesMarkers`。
- 回測依據（scratchpad 腳本，非專案檔）：條件組合在樣本內挑選、樣本外驗證後仍有 60 日超額 +7.2%；但自動化組合的風險調整報酬不如大盤，故定位為人工看圖的候選篩選器。
- 既有陷阱：多支策略把部位 reindex 到月營收揭露日，造成每月約 3 週停更（見 memory「策略訊號月頻 reindex 空窗期」）。本策略必須輸出日頻部位。

## Goals / Non-Goals

**Goals:**

- 每日輸出「均線發散＋營收確認」的候選股，附首次／再次、連續天數、發散幅度、市場別、近期訊號日。
- 提供候選清單頁，可篩選、分頁、逐檔切換，並看 K 線、五條均線、訊號標記與訊號後績效。
- 既有 9 支策略、`StockChart` 既有使用處的行為完全不變。

**Non-Goals:**

- 不做自動下單、不做組合回測頁、不提供買賣建議文字。
- 不保存超過 30 天的訊號清單（沿用 `strategy_signals` 保留期）；不新增資料表或 migration。
- 不在前端顯示還原價；訊號後績效以 `stock_prices_daily` 未還原價計算。
- 不把 `fan_breakout` 加入共識訊號的量化策略清單（`QUANT_STRATEGY_IDS`）。
- 不調整策略參數的 UI（K 值、門檻固定在程式常數）。

## Decisions

### D1：入選條件＝「當日均線發散」且「兩個營收條件皆成立」，不限首次

當日同時成立下列條件即入選：多頭排列 MA5 > MA10 > MA20 > MA60 > MA120；五條 MA 皆高於 5 個交易日前；發散幅度 spread = MA5 / MA120 − 1 高於 5 個交易日前；20 日均量 > 500,000 股；2 月均營收等於近 9 個月 2 月均營收最大值（min_periods=6）；YoY 連 6 月 > 0、6 月平均 > 25%，且 YoY 較前期上升。

首次／再次只當作標籤：前 10 個交易日內（不含當日）曾入選即為「再次」，否則為「首次」。

- 替代方案 A：只輸出首次訊號。樣本約每週 1–2 檔，清單過於稀疏，也無法呈現連續天數。不採用。
- 替代方案 B：只用均線條件、營收當前端篩選。每日約上百檔，會灌爆 secondary 同步與策略頁，且未經驗證的組合會混在清單中。不採用。

### D2：`BaseStrategy` 新增選用的 `get_signal_metadata(cache)`，由 StrategySignalStep 寫入 `conditions`

預設實作回傳 None。StrategySignalStep 在呼叫 `get_positions` 之後呼叫它；回傳 `dict[stock_id, dict]` 時，把對應股票的值序列化寫入 `conditions`，其餘股票或回傳 None 時維持 null。策略可以在 `get_positions` 內把中間結果存在實例上，避免重算。

- 替代方案：比照 `fund_momentum` 另寫一個 step。這樣會複製寫入、流動性、secondary 同步的邏輯，違反單一事實來源。不採用。

### D3：還原價只用於訊號計算；快取新增 `adj_close`

`StrategyDataCache` 新增 `adj_close`（`etl:adj_close`）。均線與 spread 用還原價，避免除權息造成假跌破。流動性用快取既有的 `v`（成交股數）；營收用 `rev`、`rev_yoy`。

### D4：股票池限上市櫃普通股

只保留代號符合 `^[1-9]\d{3}$` 的欄位，排除 ETF（0 開頭）、TDR 與權證（非 4 碼）。市場別由 FinLab 的證券分類資料取得，寫入中繼資料的 `market`（「上市」、「上櫃」，取不到為 null）。實作前須先用 `data.search` 確認該資料集的實際名稱與欄位；不得臆測欄位名。

### D5：score＝spread

`score` 寫入當日 spread，用於策略頁既有的排序；候選頁預設依訊號日新到舊、同日依 score 大到小排序。

### D6：前端資料由單一 server action 提供，訊號後績效在 server 端計算

新增 `getFanBreakoutSignals()`，讀取近 30 天 `strategy_id = 'fan_breakout'` 的列，帶出 `conditions`、`stock_basic_info` 名稱，再批次查 `stock_prices_daily` 計算訊號後績效。純計算函式放在 `src/lib/investment/fanBreakout.ts`，以便單元測試。使用 `unstable_cache`，key 為 `fan-breakout-signals-v1`，revalidate 3600 秒，與 `getStrategySignals` 一致。篩選與分頁在 client 端進行（30 天內資料量小）。

### D7：`StockChart` 以選用 props 擴充

新增 `maPeriods?: number[]`（預設 `[5, 20, 60]`）與 `markers?: ChartMarker[]`（預設無）。標記用 `createSeriesMarkers` 畫在 K 線 series 上，形狀為 `arrowUp`、位置 `belowBar`。既有呼叫處不傳新 props，畫面不變。

### D8：路由 `/investment/strategy/fan-breakout`

候選頁是獨立路由，從 `/investment/strategy` 頁加入口連結；`fan_breakout` 同時會以一般策略卡片出現在既有策略頁。

## Implementation Contract

**行為**

- 每日 pipeline 跑完後，`strategy_signals` 會有 `strategy_id = 'fan_breakout'`、`date` 為最新交易日的列，每列 `conditions` 為下方 JSON 形狀；當日無候選時不寫任何列，也不視為錯誤。
- 使用者開啟 `/investment/strategy/fan-breakout`，看到近 30 天候選清單；選取一列後，下方 K 線顯示該股 MA5/10/20/60/120 與訊號日 ▲。

**`conditions` JSON 形狀（`fan_breakout` 專用）**

```json
{
  "signal_type": "first",
  "consec_days": 1,
  "spread": 0.1834,
  "market": "上市",
  "recent_signal_dates": ["2026-09-30", "2026-10-22"]
}
```

- `signal_type`：`"first"` 或 `"repeat"`（定義見 D1）。
- `consec_days`：截至當日連續入選的交易日數，最小為 1。
- `spread`：當日 MA5 / MA120 − 1，小數 4 位。
- `market`：`"上市"`、`"上櫃"` 或 null。
- `recent_signal_dates`：近 120 個交易日內（含當日）所有入選日，YYYY-MM-DD，遞增排序。

**介面**

- Python：`BaseStrategy.get_signal_metadata(self, cache) -> dict[str, dict] | None`，預設回傳 None。
- Python：`StrategyDataCache.adj_close`（cached property）。
- TypeScript：`getFanBreakoutSignals(): Promise<FanBreakoutResult>`。`FanBreakoutResult = { rows: FanBreakoutRow[]; latestDate: string | null; error?: string }`。`FanBreakoutRow` 包含 `date`、`stockId`、`name`、`score`、`signalType`、`consecDays`、`spread`、`market`、`recentSignalDates`、`signalClose`、`latestClose`、`latestDate`、`returnSinceSignal`、`highSinceSignal`、`lowSinceSignal`；價格類欄位缺資料時為 null。
- TypeScript：`StockChart` 新增 `maPeriods?: number[]`、`markers?: ChartMarker[]`，其中 `ChartMarker = { time: string; text?: string }`。

**失敗模式**

- `get_signal_metadata` 丟例外：該策略入選股照常寫入，`conditions` 為 null，並在 `ctx.validation_warnings` 加一筆含策略 id 的警告；不得吞掉例外而不留紀錄。
- 某入選股的中繼資料缺漏：只有該股 `conditions` 為 null。
- `getFanBreakoutSignals` 查詢失敗：回傳 `rows: []` 並附 `error` 訊息，頁面顯示錯誤提示，不顯示「無資料」。
- 價格缺資料（例如訊號當日尚未同步）：績效欄位為 null，畫面顯示「—」。

**驗收**

- `uv run pytest ETF/tests/test_fan_breakout_strategy.py ETF/tests/test_strategy_signal_step.py` 通過，涵蓋 spec 中每個 Scenario。
- `yarn test --testPathPatterns "fanBreakout|getFanBreakoutSignals|FanBreakoutScreener|StockChart"` 通過。
- `yarn tsc --noEmit` 與 `uv run ruff check ETF/` 無錯誤。
- `uv run python ETF/main.py --dry-run` 不報錯（只跑 ScrapeStep，確認 import 不壞）。
- 實跑候選頁：清單可篩選、分頁、切換個股，K 線出現五條均線與 ▲；`/investment/stock/[code]` 個股頁的 K 線外觀不變。

**範圍**

- 在範圍內：策略類別、快取欄位、中繼資料介面與寫入、server action、純計算模組、候選頁與元件、`StockChart` 選用 props、前端 registry 名稱。
- 不在範圍內：DB schema、保留期、共識訊號清單、其他 8 支策略的邏輯、LINE 推播、參數設定 UI。

## Risks / Trade-offs

- [未還原價計算的績效在除權息後失真] → 頁面在績效欄位標註「以收盤價計，未還原」；30 天視窗內受影響的股票有限。
- [前端用未還原價畫均線，與策略用還原價判斷的均線在除權息附近不一致] → 接受；在頁面說明列註明訊號以還原價計算。
- [訊號當日 `stock_prices_daily` 可能還沒有這檔股票] → 入選股會併入 secondary 同步，同一次 pipeline 的 SyncOHLCVStep 就會補上；仍缺時顯示「—」。
- [每日多抓 `etl:adj_close` 約 35 MB] → 對照 VIP 每日 5000 MB 額度影響小；額度耗盡時沿用既有 quota guard 告警。
- [回測的 edge 主要來自少數大漲股，多數候選會失敗] → 頁面標示「候選清單，非投資建議」，不提供買賣字樣。
- [證券分類資料集名稱不確定] → 列為實作第一步驗證；查不到時 `market` 為 null，市場篩選只顯示「全部」。

## Migration Plan

- 無 DB migration。部署順序：先合併 Python 端（策略與 step），等下一次每日 pipeline 寫入資料後，前端頁面才會有內容；前端在無資料時顯示空狀態，可同時部署。
- 回滾：從 `ALL_STRATEGIES` 移除 `fan_breakout` 即停止產生訊號；既有資料 30 天後由清理流程刪除。

## Open Questions

- (none)
