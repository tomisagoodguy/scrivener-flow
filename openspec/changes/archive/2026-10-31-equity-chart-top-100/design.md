## Context

籌碼排行頁（`/investment/equity`）的圖表視角由 equity-ranking-chart-view change 建立：

- 前端 `selectEquityChartRows()` 對 `big`／`retail` 取 `EQUITY_CHART_LIST_LIMIT`（30）筆；`double` 本身最多 10 筆。
- `src/app/investment/equity/page.tsx` 在 Server 端以 `getStrategySnapshots()` 逐股查完全部圖表列的最新 `bare_k_snapshots`（含 OHLCV 等 JSON），整包傳給 Client 的 `EquityChartViewer`。
- `SyncBareKStep._fetch_equity_ranking_stocks()` 只用 `equity_distribution_stats` 的預計算週變化欄位，重現 1 週、不分級距的三份清單（10／30／30）。

前端多週邏輯（`equityPageData._fetchRankingData`）：第 N 週比較「最新 `snapshot_date`」與「往前第 N 個相異 `snapshot_date`」，以兩期的 `big_holder_pct` 差值、`total_shareholders` 變化率（百分比、四捨五入到小數 2 位）重新計算，`weeks=1` 也走這套動態計算，不讀預計算欄位。

實測（2026-10-31，Supabase SQL，最新裸K快照日 2026-10-30，當日同步 250 檔）：

| 範圍（主力買進前 100 ∪ 散戶減少前 100） | 檔數 | 目前無裸K快照 |
| --- | --- | --- |
| 1 週 | 143 | 55 |
| 2 週 | 142 | 60 |
| 3 週 | 144 | 56 |
| 4 週 | 137 | 54 |
| 1–4 週合併 | 241 | 107 |

選股池圖表頁（`/investment/pool-chart`）已有按需載入元件 `LazyBareKSlide`（IntersectionObserver 停留 `DWELL_MS`＝300ms 才呼叫 `getStrategySnapshots([code])`，一生只呼叫一次），並對上百檔清單以 `showJumpDots={false}` 隱藏跳轉點。

## Goals / Non-Goals

**Goals:**

- `big`／`retail` 圖表清單顯示前 100 名（不足 100 則全部）。
- 100 檔清單開頁不必等全部快照；捲到的段落才載入。
- 1–4 週、不分級距、預設排序視角的三份清單股票，在每日 pipeline 後都有裸K快照。

**Non-Goals:**

- 級距視角（`tier=200/400/1000`）與自訂排序（`sort`/`dir`）的名單不納入 pipeline 同步；這些視角超出預設名單的股票仍顯示「尚未同步」佔位文字。
- 不調整 `MAX_STOCKS`（400）與同步名單的來源優先序。
- 不改表格視角（`RankingPanelGrid`、`DoubleSignalSection`）。
- 不改 `bare_k_snapshots` 資料表結構。

## Decisions

### 決策 1：圖表清單上限 100，雙訊號維持 10

**Supersedes**: equity-ranking-chart-view / 決策 2：圖表清單每份上限 30 檔（`EQUITY_CHART_LIST_LIMIT = 30`），雙訊號本身 ≤10

`EQUITY_CHART_LIST_LIMIT` 改為 100，Python `EQUITY_LIST_LIMIT` 同步改為 100，兩邊註解互指的規則不變。雙訊號清單由排行邏輯本身限 10 檔，不受此常數影響。替代方案「不設上限、顯示全部（200 多檔）」被否決：使用者明確要 100，且全部顯示會讓 pipeline 同步量再增加一倍以上。

### 決策 2：圖表快照改用 LazyBareKSlide 按需載入

`EquityChartViewer` 的每個段落改渲染 `LazyBareKSlide`（傳入 code、name、ETF 標籤），不再接收 `snapshots` prop；`page.tsx` 不再呼叫 `getStrategySnapshots()`。理由：100 份快照（每份含 240 日 OHLCV 等 JSON）整包嵌入 RSC payload 會讓首屏變慢；選股池頁已驗證停留閘門的效果（components 規則：跳到第 150 檔 0.84s、只 2 個請求）。替代方案「Server 端只預載前 N 檔、其餘 lazy」被否決：要維護兩條載入路徑，收益只有第一檔少一次請求。

### 決策 3：清單超過 30 檔時隱藏跳轉點

`ScrollChartViewer` 的 `showJumpDots` 依圖表列數決定：≤30 檔顯示、>30 檔隱藏。理由：跳轉點超出畫面無法點擊（選股池頁同樣原因關閉）；雙訊號（≤10）與短清單保留原本的跳轉點體驗。門檻 30 取自舊上限，舊版 30 檔時跳轉點可正常使用。

### 決策 4：Pipeline 重現 1–4 週視角並各取前 100

**Supersedes**: equity-ranking-chart-view / 決策 4：Pipeline 只同步「預設視角」排行，直接用預計算欄位

`_fetch_equity_ranking_stocks()` 改用單一 SQL，以與前端相同的動態計算重現 `weeks` = 1..`EQUITY_MAX_WEEKS`（4）、`tier=null`、`sort=null` 的三份清單：

1. 取 `equity_distribution_stats` 最新 `EQUITY_MAX_WEEKS + 1` 個相異 `snapshot_date`，依日期遞減編號 0..4；第 0 個為最新期（全局最新，不依賴特定股票）。
2. 對每個 N（1..4）以最新期與第 N 期的同股票列計算：`big_change = 最新 big_holder_pct − 第 N 期 big_holder_pct`；`sh_rate = ROUND((最新 total_shareholders − 第 N 期 total_shareholders) / 第 N 期 total_shareholders × 100, 2)`，第 N 期 `total_shareholders` 非正或任一值為 NULL 時視為 NULL。
3. 每個 N 取三份清單：雙訊號（`big_change > 0 AND sh_rate < 0`，`big_change` 遞減，前 `EQUITY_DOUBLE_LIMIT`）、主力買進（`big_change > 0`，`big_change` 遞減，前 `EQUITY_LIST_LIMIT`）、散戶減少（`sh_rate < 0`，`sh_rate` 遞增，前 `EQUITY_LIST_LIMIT`）；同值以 `stock_code` 遞增。
4. 結果依（週數遞增、清單序 雙訊號→主力買進→散戶減少、名次遞增）排序，Python 端串接去重保留首次出現。

SQL 轉型用 `CAST(... AS numeric)`，不可用 `::`（SQLAlchemy `text()` 參數衝突，既有測試會檢查）。歷史快照不足 N+1 期時，該週自然沒有結果，其他週照常。替代方案「沿用預計算欄位只做 1 週、上限改 100」被否決：使用者截圖的 `weeks=4` 視角會有約一半股票沒圖。替代方案「四週各發一次查詢」被否決：一次查詢即可，減少來回。

### 決策 5：籌碼排行股維持在選股池股之前

**Supersedes**: equity-ranking-chart-view / 決策 5：籌碼股排在同步名單最後

順序維持 investment-pool-chart-view 後的現況：自選股 → 策略股 → 同步加碼股 → 籌碼排行股 → 選股池股，`MAX_STOCKS` 400。籌碼排行股約 241 檔中有約 134 檔與目前已同步名單重疊，新增約 107 檔後總數約 357（實測值推算），未達上限；若日後超過，最先截斷的是選股池尾端，警告 log 會列出總數。

## Implementation Contract

**行為（使用者可觀察）：**

- `/investment/equity?view=chart&list=big` 與 `list=retail` 顯示該排行的前 100 列（依當前 `tier`/`weeks`/`sort`/`dir` 的排行順序），不足 100 則全部；清單切換連結上的數字同步顯示（最多 100）。
- 圖表段落初始為載入中骨架（`data-testid="lazy-bare-k-loading"`），連續停留視窗 300ms 後載入；無快照時顯示「此股票尚未同步裸K資料，將於下次 Pipeline 執行後更新」；載入失敗顯示「圖表載入失敗」。
- 圖表列數 >30 時不顯示跳轉點；≤30 時照舊。
- 表格視角與圖表視角的 Server 端都不再查 `bare_k_snapshots`。
- 每日 pipeline 的 Sync BareK Snapshots 步驟 log 中，同步名單包含 1–4 週視角三份清單的股票。

**介面：**

- `EQUITY_CHART_LIST_LIMIT = 100`（`equityChartUtils.ts`）；`selectEquityChartRows(data, list)` 簽章不變。
- `EquityChartViewer` props 移除 `snapshots`；其餘 props（`rows`、`etfMap`、`tier`、`backHref`、`listKey`）不變。
- Python 常數：`EQUITY_DOUBLE_LIMIT = 10`、`EQUITY_LIST_LIMIT = 100`、新增 `EQUITY_MAX_WEEKS = 4`（必須等於前端 `VALID_WEEKS` 最大值，兩邊註解互指）。
- `_fetch_equity_ranking_stocks(ctx, services) -> list[str]` 簽章不變，改為一次 `conn.execute`，參數含 `max_weeks`、`double_limit`、`list_limit`。

**失敗模式：** SQL 例外時 `logger.error` 並回傳空列表、不 raise（輔助步驟規則）；無資料回傳空列表；前端單檔快照請求失敗只影響該段落。

**驗收：**

- `yarn test --testPathPatterns "equityChartUtils|EquityChartViewer"` 通過（含上限 100、lazy 骨架、跳轉點門檻的測試）。
- `uv run pytest ETF/tests/test_sync_bare_k_step.py` 通過（常數值、單一查詢形狀、週數→清單→名次的去重順序、失敗不 raise）。
- 以 Supabase 唯讀 SQL 執行新查詢，去重結果檔數與本文件實測表的「1–4 週合併」同量級（實測 241）。
- `yarn tsc --noEmit` 無新錯；實跑 `/investment/equity?view=chart&list=big&weeks=4` 確認清單數字顯示 100 且捲動時逐檔載入。

**範圍：** 只動上述前端三檔、pipeline 一檔與對應測試；不動 `ScrollChartViewer`、`LazyBareKSlide`、`getStrategySnapshots` 本身。

## Risks / Trade-offs

- [Pipeline 多約 9 分鐘（以既有 5.2 秒／檔估計，未實測）] → 合併後觀察下一次 GitHub Actions 的 Sync BareK Snapshots 步驟耗時；若明顯超出，再評估縮減週數範圍。
- [Python SQL 與前端計算邊界不一致（例如名次 100 附近同值、四捨五入差異）] → 計算式對齊前端（`ROUND(...,2)` 百分比、同值 `stock_code` 遞增）；前端同值時依 DB 回傳順序，第 100 名附近最多少數檔差異，該檔顯示「尚未同步」佔位，不影響其他檔。
- [按需載入使第一檔多一次 Client 請求] → 停留閘門 300ms，首檔延遲可接受，選股池頁已採用同機制。
- [同步總數逼近 400 時選股池尾端被截斷] → 現況 357（推算），警告 log 會列出總數；不在本 change 調整。
