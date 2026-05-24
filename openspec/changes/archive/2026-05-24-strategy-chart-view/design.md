## Context

策略選股頁（`/investment/strategy`）目前有兩個視角：策略視角（預設）和監控清單（`?view=monitor`）。監控清單顯示小卡片，無法直接瀏覽 K 線圖表。

裸K看盤（`/investment/bare-k/[code]`）已有完整的六面板圖表元件（`BareKScrollViewer` + `BareKChart`），資料來源是 `bare_k_snapshots` 資料表。`SyncBareKStep` 目前只從 `watch_list` 讀取股票 ID 進行同步。

策略股來自 `strategy_signals` 資料表（每日 CI 更新），不在 `watch_list` 中，因此 `bare_k_snapshots` 通常沒有策略股資料。

## Goals / Non-Goals

**Goals:**

- 策略頁新增圖表視角（`?view=chart`），讓使用者直接在策略頁看所有策略股的連續 K 線圖
- Pipeline 同步策略股到 `bare_k_snapshots`，確保圖表有資料可顯示
- 重用現有 `BareKScrollViewer` 元件，不重造輪子

**Non-Goals:**

- 不修改 `bare_k_snapshots` 資料表 schema
- 不將策略股加入使用者的 `watch_list`（兩者保持獨立）
- 不為策略股建立獨立的圖表資料管線（重用裸K快照機制）
- 不支援個別策略的圖表篩選（圖表視角顯示所有策略股）

## Decisions

### 前端圖表視角新增第三個 toggle

在 `strategy/page.tsx` 的 view toggle 新增「圖表」選項（`?view=chart`）。圖表視角呼叫 `getStrategySnapshots(stockIds)` Server Action，批次查詢 `bare_k_snapshots`，再傳給 `StrategyChartViewer`（薄包裝 `BareKScrollViewer`）渲染。

**替代方案**：直接重導到 `/investment/bare-k/[code]`。**否決**：使用者要的是「一口氣瀏覽所有策略股」，逐支點擊體驗不好。

### StrategyChartViewer 薄包裝 BareKScrollViewer

新建 `StrategyChartViewer.tsx`，接收策略股清單和快照 Map，轉換為 `StockSlide[]` 傳入 `BareKScrollViewer`。`isOwner` 固定傳 `false`（圖表視角不顯示「加入自選股」提示）。back link 改為返回策略頁。

**替代方案**：直接在 page.tsx 組裝 StockSlide[]。**否決**：保持 page.tsx 的 Server Component 純度，View 邏輯抽到獨立元件。

### Pipeline：SyncBareKStep 額外納入策略股

在 `SyncBareKStep._fetch_watch_list_stocks()` 後，額外查詢 `strategy_signals` 最新 `date` 的所有 `is_selected = true` 股票，合併 de-dup 後一起同步。`MAX_STOCKS` 上限不變（50），策略股和 watch_list 股共用配額。策略股優先序較低（watch_list 在前）。

**替代方案**：新建獨立 `SyncStrategyBareKStep`。**否決**：共用 `BareKService` 的全市場資料載入成本高，拆步驟會重複載入兩次，增加約 5-8 分鐘 CI 時間。

## Risks / Trade-offs

- [風險] `MAX_STOCKS=50` 配額：若 watch_list + 策略股超過 50，策略股可能被截斷 → 緩解：watch_list 優先排前，策略股塞在後面，超出就跳過（非關鍵數據）
- [風險] 策略股每日變動，bare_k_snapshots 只保留最新快照；昨日策略股今日不在清單就不再更新 → 可接受，圖表視角只保證「當日策略股有圖」
- [Trade-off] 前端若 bare_k_snapshots 無資料，顯示佔位而非空白，使用者可能不解 → 佔位文案改為「此股票尚未同步裸K資料，將於今日 Pipeline 執行後更新」
