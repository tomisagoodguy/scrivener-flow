## Context

`/investment/strategy` 應顯示 9 支現役量化策略（super8888 / super888 / capital_layer / broker_ranked / low_vol_alpha / low_vol_cap / htf_gvi / trend_template / fundamental_momentum），但目前只剩 `fund_momentum`。

實測 `strategy_signals` 資料：`fund_momentum` 每日更新至最新交易日；9 支現役策略各只在 2026-06-10 寫過一筆、之後再無寫入。前端 `getStrategySignals()` 先取全表 `max(date)`，再 `.eq('date', targetDate)` 過濾，因此只剩到達最新日期的 `fund_momentum`。

寫入路徑現況：

- daily CI（.github/workflows/etf_daily.yml）在同一 shell step 先跑 `main.py --days 30` 再跑 `run_strategies.py --days 5`。
- `main.py` 的 `StrategySignalStep`（orchestrator 第 78 位，在 `SyncOHLCVStep` 之前）執行 9 支策略，並把選中股加入 `ctx.secondary_stock_codes` 供 `SyncOHLCVStep` 同步 K 線。
- `run_strategies.py` 之後又獨立建立一次 `StrategyDataCache` 再跑同樣 9 支策略。
- `StrategyDataCache` 會下載 `etl:broker_transactions`（top15_buy/sell）與 `inventory`（集保）——皆為全市場巨型 FinLab 資料集。兩條路徑各下載一次 = 一天兩次。
- 兩條路徑的 per-strategy 例外都被 `except ... continue` 吞掉；`run_strategies.py` 在全空時 upsert no-op、CI 仍綠燈、無告警。
- `fund_momentum` 由 `FundMomentumStep` 寫入，改讀 DB 投信買超、不耗 FinLab 配額，故獨活。

`finlab-quota-guard` spec 既有規範：`StrategySignalStep` 在 FinLab 配額不足時優雅 skip 而非崩潰。本設計在其上補強「全空時必須告警」。

## Goals / Non-Goals

**Goals:**

- 策略選股頁穩健顯示所有有近期訊號的現役策略，不因更新節奏差異被單一日期過濾掉。
- 每日只執行一次完整策略運算（單一 FinLab 巨型資料集下載），讓 9 支策略的寫入路徑有足夠配額成功。
- 策略訊號「整批無輸出」時可被觀測（告警），不再靜默資料停更。

**Non-Goals:**

- 不調整任一策略的選股邏輯或門檻。
- 不改變 `fund_momentum`（`FundMomentumStep`）的計算與寫入。
- 不重寫 `StrategyDataCache` 的資料抓取或實作 FinLab 結果跨日持久化快取（屬後續優化）。
- 不刪除 `run_strategies.py` 檔案（保留供手動補跑歷史訊號）。
- 不更動 `strategy_signals` 資料表 schema。

## Decisions

### 決策一：保留 `StrategySignalStep`，自每日 CI 移除 `run_strategies.py` 呼叫

`StrategySignalStep`（orchestrator 第 78 位）在 `SyncOHLCVStep`（第 79 位）之前執行，其副作用是把策略選中股加入 `ctx.secondary_stock_codes`，使這些股票的 K 線/股價在同一次 pipeline 內被 `SyncOHLCVStep` 同步——前端個股顯示依賴此資料。`run_strategies.py` 殿後於 `main.py` 之外執行，無法把選股回饋進同一次 pipeline 的 `SyncOHLCVStep`，且重複下載巨型資料集。

因此移除每日 CI 中的 `run_strategies.py` 呼叫，由 `main.py` 的 `StrategySignalStep` 作為每日唯一寫入者。

替代方案（已否決）：移除 `StrategySignalStep`、改留 `run_strategies.py`——會喪失 `secondary_stock_codes` 副作用，導致策略股 K 線缺漏，且 `run_strategies.py` 殿後無法回饋同次 pipeline。

### 決策二：前端改 per-strategy 最新日期聚合（限近期視窗）

`getStrategySignals()` 改為：先以單一查詢取「近 N 個交易日（預設 14 個日曆日視窗）」內所有 `is_selected = true` 的列，於 Server 端依 `strategy_id` 分組、各取該策略最新日期的那批股票呈現。回傳結構 `StrategySignalsResult` 維持不變（`{ date, strategies[] }`），其中 `date` 取所有入選策略中的最新日期作為頁面「資料日期」顯示；各策略內部仍以自身最新日期的股票為準。

替代方案（已否決）：對每個 strategy_id 各發一次「該策略 max(date)」查詢——N 支策略 N+1 次往返，較慢且無必要。

### 決策三：`StrategySignalStep` 全空時發告警

當步驟跑完 `all_rows` 為空（所有策略皆未產生任何 `is_selected` 列），視為異常停更訊號：將訊息加入 `ctx.validation_warnings`，並沿用 pipeline 既有的 LINE 警報管道通知管理員。個別單一策略回空仍只 log（屬正常，如某策略當日無選股），唯有「全數皆空」才升級為告警。

## Implementation Contract

**Behavior：**

- 開啟 `/investment/strategy`「策略視角」時，凡在近 14 個日曆日內有 `is_selected` 訊號的現役策略卡片皆顯示，各卡片內容為該策略最新一個有訊號日期的股票；不再因其他策略（如 `fund_momentum`）日期較新而被隱藏。
- 每日 CI 對每支現役策略只執行一次 `get_positions()`（單次 `StrategyDataCache` 建立 → 單次巨型資料集下載）。
- 當某日所有現役策略皆無輸出時，管理員收到 LINE 告警，內容指明「策略訊號全空」與日期。

**Interface / data shape：**

- `getStrategySignals(date?)` 簽章與回傳型別 `StrategySignalsResult`（`{ date: string; strategies: StrategyEntry[] }`）不變；僅內部查詢與分組語意改變。當顯式傳入 `date` 參數時，維持舊行為（精確該日期）。
- `.github/workflows/etf_daily.yml` 的 "Run ETF Tracker" step 移除 `uv run python ETF/run_strategies.py --days 5` 該行；保留 `uv run python ETF/main.py --days 30`。
- `StrategySignalStep.execute()` 在 `all_rows` 為空時，於回傳前 append 一筆繁體中文警告字串至 `ctx.validation_warnings`。

**Failure modes：**

- 單一策略 `get_positions()` 例外：維持現行 per-strategy `logger.error` + `continue`，不升級告警。
- 全策略皆空（含 FinLab 配額耗盡致全失敗）：寫入 `ctx.validation_warnings` 觸發既有告警，不 `raise`（維持輔助步驟不中斷 pipeline 的原則）。
- 前端近期視窗內某策略完全無訊號：該策略卡片不顯示（與現行「無資料不顯示」一致），不報錯。

**Acceptance criteria：**

- 在 `strategy_signals` 含「`fund_momentum` 日期較新、其餘 8 支停在較舊日期」的資料情境下，`getStrategySignals()` 回傳的 `strategies` 陣列包含所有在視窗內有訊號的策略（以單元測試驗證分組取各自最新日期）。
- `ETF/tests/` 新增/更新測試：`StrategySignalStep` 在所有策略回空時，`ctx.validation_warnings` 新增一筆告警；非全空時不新增。
- `.github/workflows/etf_daily.yml` 不再含 `run_strategies.py` 字串（grep 驗證）。
- `yarn test` 與 `uv run pytest ETF/` 通過。

**Scope boundaries：**

- In scope：`getStrategySignals()` 查詢/聚合語意、CI step 去重、`StrategySignalStep` 全空告警、相應測試與 specs。
- Out of scope：策略選股邏輯、`fund_momentum`、`StrategyDataCache` 內部抓取、`strategy_signals` schema、前端卡片 UI 樣式。

## Risks / Trade-offs

- **單次執行仍可能耗盡配額**：`main.py` 在 `StrategySignalStep` 之前已有多個 FinLab 步驟。移除第二次完整下載是最大節流槓桿，但無法保證單次必成功。決策三的告警正是用來偵測此殘留風險；若單次仍不足，後續再評估跨日持久化快取（屬 Non-Goals）。
- **近期視窗長度權衡**：視窗過短會讓更新慢的策略（如季頻 `fundamental_momentum`）落在視窗外而不顯示；過長則可能顯示過時訊號。預設 14 個日曆日為折衷，作為可調參數於實作中以常數明確標示。
- **頁面「資料日期」語意改變**：由「全表最新日期」變為「入選策略中的最新日期」，多數情況等同；但若各策略日期不一致，標頭日期僅代表最新者，個別卡片可能為較舊日期。屬可接受的顯示取捨。
