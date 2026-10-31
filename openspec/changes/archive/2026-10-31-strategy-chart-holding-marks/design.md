## Context

策略圖表視角由 `StrategyPage`（Server Component）查 `getStrategySignals` / `getStrategySnapshots` / `getFanBreakoutSignals`，交給 `StrategyChartViewer` → `ScrollChartViewer` → `BareKSlideContent` → `BareKChart`。K 線主圖由 `createKLinePanel`（lightweight-charts v5）建立，目前已用 `createSeriesMarkers` 為均線發散訊號日畫「K 棒下方紅色 arrowUp」。

持有紀錄已存在 `strategy_trades`（`strategy_id, stock_id, entry_signal_date, entry_date, exit_date, …`），由 ETF pipeline 的 `strategy_trade_step.py` 每日寫入；`getStrategyTradePerformance` 已示範用 `getPublicClient()` 分頁讀取。

## Goals / Non-Goals

**Goals:**

- 在策略圖表視角的 K 線主圖標出選股日「選」與買進日「買」。
- 以單一淡色背景標出持有期間（買進日 → 出場日，未出場到最新 K 棒），多策略取聯集。
- 查詢失敗不影響圖表本身。

**Non-Goals:**

- 不在成交量、融資、月營收、籌碼等副圖畫背景（只畫 K 線主圖）。
- 不標出場日（背景結束處已表示出場）；不顯示各筆報酬或 tooltip。
- 不依策略篩選器過濾標記：篩選器只決定顯示哪些股票，標記一律畫該股所有策略的紀錄。
- 不改裸K、動能、選股池等其他使用 `BareKChart` 的頁面。
- 不改 DB schema 與 pipeline。

## Decisions

### 標記用 K 棒上方文字「選」「買」

選股日與買進日用 `position: 'aboveBar'`、`shape: 'circle'`、`text: '選'`/`'買'` 的 series marker；「選」用 amber（`#d97706`），「買」用 rose-600（`#e11d48`，台股利多色）。均線發散訊號維持 K 棒下方紅箭頭。兩組 marker 合併成一個依時間排序的陣列，只呼叫一次 `createSeriesMarkers`。

替代方案：用不同形狀的箭頭（arrowDown 等）——與發散箭頭太像且語意不清，捨棄。

### 持有背景用隱藏價格軸的滿高 HistogramSeries

在 K 線主圖、K 線 series 之前加一個 `HistogramSeries`，`priceScaleId: 'holding-bg'`，該價格軸 `visible: false`、`scaleMargins: { top: 0, bottom: 0 }`；持有中的每根 K 棒放 value 1、顏色 `rgba(225, 29, 72, 0.08)`，`priceLineVisible: false`、`lastValueVisible: false`。先加入的 series 畫在下層，所以背景位於 K 棒之後；獨立價格軸不會影響 K 線的自動縮放。

替代方案：自訂 series primitive 畫連續矩形——視覺更乾淨（無柱間縫隙），但程式碼量大且需處理座標換算；本次先用 Histogram，若柱間縫隙觀感不佳再另開 change。

### 區間聯集在純函式中計算，圖表只吃「日期集合」

新增純函式 `buildHoldingMarks(rows)`（不依賴快照）：Server 端把 `strategy_trades` 依股票彙整成 `StrategyHoldingMarks { signalDates: string[]; entryDates: string[]; periods: { start: string; end: string | null }[] }`（`end: null` 代表持有中）。圖表端 `buildHoldingBackground(ohlcv, periods)` 對每根有 o/c 的 K 棒判斷是否落在任一區間（`end` 為 null 視為無上限），天然得到聯集、同色、不疊深。日期以 `YYYY-MM-DD` 字串比較。

替代方案：Server 端先合併區間——仍要在圖表端對齊 K 棒，合併只是多一步，捨棄。

### 新 Server Action 依股票代碼查 strategy_trades

新增 `getStrategyChartTrades(stockIds)`：用 `getPublicClient()` 以 `in('stock_id', chunk)`（每批 300）查 `strategy_id, stock_id, entry_signal_date, entry_date, exit_date`，條件 `exit_date is null or exit_date >= 今日-400 天`（涵蓋裸K快照長度），分頁取完；查詢錯誤時 throw，由 `page.tsx` 的 `.catch` 記錄並回空物件。回傳 `Record<stockId, StrategyHoldingMarks>`。不重用 `getStrategyTradePerformance`：後者會撈全部策略近 60 天並補名稱，且結果被快取，條件不同。

## Implementation Contract

**資料形狀**

```ts
interface StrategyHoldingMarks {
    signalDates: string[];   // entry_signal_date，去重升冪
    entryDates: string[];    // 非 null entry_date，去重升冪
    periods: { start: string; end: string | null }[]; // start = entry_date；end = exit_date（null = 持有中）
}
```

**行為**

- `StrategyPage` 在 `isChart` 時與快照、均線發散並行呼叫 `getStrategyChartTradesOrEmpty(monitorStocks 的代碼)`：包住 `getStrategyChartTrades`，失敗 → `console.error('[getStrategyChartTrades]', 訊息)`，以 `{}` 繼續（可單元測試的降級路徑）。查詢依唯一鍵 `strategy_id, stock_id, entry_signal_date` 排序分頁；`periods` 以 `start|end` 去重。
- `StrategyChartViewer` 新 prop `holdingMarksByStock: Record<string, StrategyHoldingMarks>`，每個 slide 傳 `holdingMarks={holdingMarksByStock[code]}` 給 `BareKSlideContent` → `BareKChart` → `createKLinePanel`。
- `createKLinePanel` 新增選填參數 `holdingMarks?: StrategyHoldingMarks`；未傳時輸出與現在完全相同。
- 「選」「買」只標在有 o/c 的 K 棒日期；同一日期同一文字只標一次。
- 背景只畫在 K 線主圖。

**驗收**

- 單元測試：`buildHoldingMarks`（去重、null entry 不產生區間）、`buildHoldingBackground`（spec 範例表三列）、文字標記建構函式（略過快照外日期、與發散箭頭合併後依時間排序）。
- `StrategyChartViewer` 測試：`holdingMarks` 依股票傳到圖表 props。
- 實跑 `/investment/strategy?view=chart`：有持有紀錄的股票看得到「選」「買」與淡色背景，發散箭頭仍在。

**範圍外**：副圖背景、出場標記、tooltip、其他頁面。

## Risks / Trade-offs

- [Histogram 柱間有縫隙，背景呈條紋] → 透明度低（0.08）時觀感可接受；不佳再改自訂 primitive。
- [`BareKChart` 的 effect 依賴 `[snapshot, markerKey]`，新 prop 若不納入依賴，資料變動不會重畫] → 以穩定字串 key（`JSON.stringify(holdingMarks)`）納入依賴。
- [400 天的篩選窗口是估計值，快照實際長度未量測] → 實作時以快照 `ohlcv` 長度核對；窗口外的紀錄只會被略過，不會畫錯。
- [股票數多時 in() 查詢次數] → 圖表股票數約數十到兩百支（估計），每批 300，通常 1 批。

## Migration Plan

純前端與讀取查詢，無 schema 變更；回滾即 revert commit。

## Open Questions

(none)
