## 1. CI Registry Sync Validation

- [x] [P] 1.1 建立 `ETF/scripts/validate_registry_sync.py`：Registry 同步校驗：Python 腳本 + CI job — 以 regex 從 `src/lib/investment/etfRegistry.ts` 解析 ETF code 列表，與 `ETF/config/etf_registry.py` 的 `ALL_ETF_CODES` 比對，輸出 diff 並以非零 exit code 退出（實作 Registry sync validation script exists 需求）
- [x] [P] 1.2 本地測試 validate_registry_sync.py：確認同步時 exit 0、不同步時 exit 1 並印出正確 diff
- [x] [P] 1.3 修改 `.github/workflows/etf_daily.yml`：在 pipeline job 前新增 `validate-registry` job，執行 `uv run python ETF/scripts/validate_registry_sync.py`，pipeline job 加入 `needs: validate-registry`（實作 CI validates registry sync before pipeline runs 需求）

## 2. PipelineContext 瘦身

- [x] 2.1 建立 `ETF/pipeline/services.py`：定義 `PipelineServices` dataclass，含 `storage`、`notifier`、`finlab_srv`、`sql_storage` 四個欄位（實作 Registry sync validation：PipelineContext 瘦身 決策）
- [x] 2.2 修改 `ETF/pipeline/orchestrator.py`：在 `__init__` 初始化 `PipelineServices`，移除原本 Context 的 service 初始化邏輯；`run()` 將 services 傳給每個步驟（實作 PipelineContext 瘦身：service 移至 Orchestrator 決策）
- [x] 2.3 修改 `ETF/pipeline/context.py`：移除 `_storage`、`_notifier`、`_finlab_srv`、`_sql_storage` 私有屬性及對應 property，Context 只保留純資料 dataclass 欄位
- [x] 2.4 批次更新 22 個步驟的 `run(ctx)` 簽章為 `run(ctx, services)`，將所有 `ctx.storage` / `ctx.notifier` / `ctx.finlab_srv` / `ctx.sql_storage` 參照改為 `services.*`
- [x] 2.5 本地執行 `uv run python ETF/main.py --dry-run` 驗證 Context 瘦身後 pipeline 無 AttributeError

## 3. MultiEtfStep 並行化

- [x] 3.1 修改 `ETF/pipeline/steps/multi_etf_step.py`：將各 ETF 爬取邏輯包裝為 async 函數，以 `asyncio.gather(*tasks, return_exceptions=True)` 並行執行；同步 scraper（requests）改用 `asyncio.get_event_loop().run_in_executor` 執行（實作 MultiEtfStep 並行化：asyncio.gather 決策）
- [x] 3.2 每個 ETF 的例外獨立捕捉，失敗者 log error 後繼續，不影響其他 ETF
- [x] 3.3 本地計時測試：執行 MultiEtfStep 並記錄執行時間，確認相較串行有明顯縮短

## 4. future_returns Backfill 機制

- [x] [P] 4.1 建立 `ETF/pipeline/steps/backfill_future_returns.py`：future_returns backfill：兩層機制 — 掃描所有 `etf_buying_patterns` 記錄中 `future_returns` 有 null 天期的項目，查 `stock_prices_daily` 補齊，使用 `COALESCE(future_returns, '{}') || :new_data` 增量 merge（實作 Standalone backfill script exists 需求與 Incremental merge preserves existing values 需求）
- [x] [P] 4.2 在 `ETF/pipeline/steps/buying_pattern_step.py` 的 `run()` 末尾呼叫 backfill 邏輯：查詢過去 30 天 `future_returns` 有 null 天期的記錄，補齊後繼續（實作 BuyingPatternStep auto-backfills incomplete future_returns 需求）
- [x] [P] 4.3 本地執行 `uv run python ETF/pipeline/steps/backfill_future_returns.py`，確認 idempotent（重複執行結果一致）且不覆蓋已存在的非 null 值

## 5. 前端 ETF 資料新鮮度標示

- [x] [P] 5.1 修改 `getHoldings()` server action：ETF 資料新鮮度：前端顯示 data_date + 來源徽章 — 回傳值加入 `meta: { dataDate: string; dataSource: 'official_api' | 'pocket' }`，`dataDate` 取 `etf_holdings_snapshot` 的 max `data_date`，`dataSource` 從 `getEtfMeta(code).dataSource` 取得（實作 Server action returns freshness metadata 需求）
- [x] [P] 5.2 修改 `src/app/investment/[etf]/page.tsx`：從 `getHoldings()` 解構 `meta`，傳給 EtfHeader 元件
- [x] [P] 5.3 修改或建立 `src/components/features/investment/EtfHeader.tsx`：接收 `dataDate` 與 `dataSource` props，顯示「資料日期：YYYY-MM-DD」；`dataSource` 為 `pocket` 時顯示灰色 Pocket.tw 徽章，為 `official_api` 時顯示中性徽章（實作 ETF page displays data date 與 ETF page displays data source badge 需求）
- [x] [P] 5.4 實作資料日期顏色規則：距今 ≤ 2 交易日為中性色，3–5 交易日為橘色警告，> 5 交易日為紅色警告
- [x] [P] 5.5 執行 `yarn build` 確認無 TypeScript 型別錯誤
