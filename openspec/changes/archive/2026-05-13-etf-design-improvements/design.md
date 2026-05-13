## Context

ETF 模組目前有 15 支 ETF，分為 primary（00981A，ScrapeStep 處理）與 secondary（14 支，MultiEtfStep 串行處理）。Pipeline 由 22 個步驟組成，步驟間透過 `PipelineContext` 共享狀態。

現況脆弱點：
- TypeScript `etfRegistry.ts` 與 Python `etf_registry.py` 手動維護，無自動一致性校驗
- 前端 `/investment/[etf]` 對所有 ETF 一視同仁，但 Pocket.tw 來源的 ETF 可能數天未更新
- `etf_buying_patterns.future_returns` 依賴 `SyncOHLCVStep` 輸出，後者為輔助步驟，失敗不中斷 pipeline，導致部分天期永遠為 null
- `PipelineContext` 同時存放純資料狀態與 4 個 service 實例（`_storage`、`_notifier`、`_finlab_srv`、`_sql_storage`），職責混雜
- MultiEtfStep 以 `for` 迴圈串行爬取 14 支 ETF，累積延遲隨 ETF 數量線性增長

## Goals / Non-Goals

**Goals:**

- 在 CI 層阻斷 registry 不同步的問題，失敗有明確錯誤訊息
- 前端讓使用者能辨識目前看到的資料是今日還是幾天前
- `future_returns` 在 pipeline 失敗後可自動回補，不產生永久缺口
- 將 service 實例從 context 移出，讓 context 成為純資料容器
- 14 支 secondary ETF 並行爬取，縮短 MultiEtfStep 執行時間

**Non-Goals:**

- 不修改 ETF 清單（另行 change）
- 不建立 Realtime 推送機制
- 不重構前端 hooks 或 repository 層
- 不更動 Supabase schema

## Decisions

### Registry 同步校驗：Python 腳本 + CI job

**決策**：新增 `ETF/scripts/validate_registry_sync.py`，從 TypeScript 檔用 regex 解析 code 列表，與 Python registry 對比，輸出 diff 後以非零 exit code 失敗。在 `etf_daily.yml` 的 job 前加一個 `validate-registry` step，失敗則阻斷整個 workflow。

**為何不用 code generation**：從 Python 生成 TypeScript 需要引入 build step，增加複雜度。Regex 解析足夠穩定（TypeScript registry 格式固定），且維護成本最低。

**替代方案**：從 Python 直接 import TypeScript 然後比較 → 需要 Node.js 在 Python CI 環境中，拒絕。

### ETF 資料新鮮度：前端顯示 data_date + 來源徽章

**決策**：在 `getHoldings()` Server Action 回傳時附帶 `dataDate`（來自 `etf_holdings_snapshot` 的 `data_date` 欄位最大值）與 `dataSource`（來自 `etfRegistry.ts` 的 `dataSource` 欄位）。ETF Header 元件顯示「資料日期：YYYY-MM-DD」及「來源：官網 API / Pocket.tw」徽章。

**顏色規則**：`data_date` 距今 > 2 個交易日顯示橘色警告，> 5 個交易日顯示紅色警告。

### future_returns backfill：兩層機制

**決策**：
1. **BuyingPatternStep 自觸發**：在 `run()` 末尾，對過去 30 天內 `future_returns` 仍有 null 天期的記錄，重新查 `stock_prices_daily` 補齊。此為主要補齊路徑。
2. **獨立腳本 backfill_future_returns.py**：可手動執行或加入 weekly workflow，針對全部歷史記錄做全量 backfill，用於災後修復。

增量 merge 沿用現有 `future_returns = COALESCE(future_returns, '{}') || :new_data` 模式，只補 null 天期，不覆蓋已有值。

**為何不在 SyncOHLCVStep 失敗後 retry**：retry 增加 step 複雜度且 OHLCV 失敗原因多樣（FinLab 配額、網路）；backfill 在下次成功時自動修復更簡單。

### PipelineContext 瘦身：service 移至 Orchestrator

**決策**：`PipelineOrchestrator.__init__` 負責初始化四個 service，傳給各步驟的 `run(ctx, services)` 簽章（新增 `services: PipelineServices` 參數）。`PipelineContext` 移除所有 property 和 `_` 私有屬性，只保留 dataclass 欄位。

`PipelineServices` 為新 dataclass，包含 `storage`、`notifier`、`finlab_srv`、`sql_storage` 四個欄位。

**遷移方式**：所有步驟的 `run(ctx)` 改為 `run(ctx, services)`；步驟內部原本的 `ctx.storage` 改為 `services.storage`。一次性修改 22 個步驟的簽章。

**替代方案**：dependency injection container（如 `injector` 套件）→ 引入外部依賴，overkill。

### MultiEtfStep 並行化：asyncio.gather

**決策**：將各 ETF 的爬取函數改為 async，用 `asyncio.gather(*[scrape_etf(code) for code in SECONDARY_ETF_CODES])` 並行執行。每個 ETF 的錯誤獨立捕捉，不影響其他 ETF（`return_exceptions=True`）。

**注意**：部分 scraper 使用 `requests`（同步），需改用 `httpx` 或在 `asyncio.get_event_loop().run_in_executor` 中執行。優先以 `run_in_executor` 包裝，避免全量改寫所有 scraper。

## Risks / Trade-offs

- **Context 簽章變更影響全部 22 個步驟**：批次修改量大，需確保測試覆蓋或手動驗證每個步驟。→ 建議在單一 commit 中完成，避免步驟混用新舊簽章。
- **asyncio 與 requests 混用**：`run_in_executor` 在高並行下有 thread pool 限制。→ 14 支 ETF 並行不超過預設 pool 大小（通常 32），風險低。
- **Regex 解析 TypeScript 脆弱性**：若 `etfRegistry.ts` 格式調整（如換行、多行 string），regex 可能失配。→ 在 validate 腳本中加入格式說明和失配時的明確錯誤訊息。

## Migration Plan

1. 先完成 registry 校驗腳本並推送，確認 CI 通過
2. 完成 Context 瘦身，一次性更新所有步驟簽章，本地執行 `main.py --dry-run` 驗證
3. 完成 MultiEtfStep 並行化，本地執行一次完整 pipeline 觀察執行時間
4. 完成 future_returns backfill，手動執行 backfill 腳本確認資料補齊
5. 完成前端顯示，yarn build 確認無型別錯誤
