## Why

ETF 模組隨功能累積出現數個設計脆性點：雙語言 registry 的手動同步隨時可能靜默失位、前端對資料新鮮度毫無感知、`future_returns` 存在可預期的缺口、Pipeline Context 持續膨脹、MultiEtfStep 串行爬取在 ETF 數量增長後將成瓶頸。在擴展到 20+ 支 ETF 之前，現在是修復這些基礎脆弱點的最低成本時機。

## What Changes

- **CI 校驗 registry 雙語言同步**：新增 Python 校驗腳本，在 GitHub Actions 中對比 `etfRegistry.ts` 與 `etf_registry.py` 的 ETF code 列表，不一致時 CI 失敗並輸出 diff
- **前端標示 ETF 資料來源與新鮮度**：ETF 切換時顯示 `data_date`，並以徽章標示資料來源（`official_api` vs `pocket`），讓使用者知道目前資料是今日還是數日前
- **future_returns backfill 機制**：新增 backfill 腳本，定期補齊 `etf_buying_patterns.future_returns` 中因 `SyncOHLCVStep` 失敗產生的 null 天期；`BuyingPatternStep` 執行時亦觸發自動 backfill
- **PipelineContext 瘦身**：將四個 service 實例（`_storage`、`_notifier`、`_finlab_srv`、`_sql_storage`）從 `PipelineContext` 移至 `PipelineOrchestrator`，由 orchestrator 負責注入；Context 只保留純資料狀態
- **MultiEtfStep 並行化**：以 `asyncio.gather()` 並行爬取所有 secondary ETF，取代現有串行迴圈，縮短 Pipeline 執行時間

## Non-Goals

- 不修改 ETF 清單內容（新增或移除 ETF 屬另一 change 範疇）
- 不重構前端 hooks 或 Repository 層，只修改顯示元件
- 不更動 Supabase schema，`etf_buying_patterns` 欄位結構維持不變
- 不實作 WebSocket 或 Realtime 推送，前端僅顯示靜態的 `data_date`

## Capabilities

### New Capabilities

- `etf-registry-sync-validation`：CI 自動校驗 TypeScript 與 Python ETF registry 一致性
- `etf-data-freshness-indicator`：前端在 ETF 頁面標示資料日期與來源類型
- `etf-future-returns-backfill`：buying pattern 前瞻報酬的自動補齊機制

### Modified Capabilities

（無）

## Impact

- Affected specs: etf-registry-sync-validation、etf-data-freshness-indicator、etf-future-returns-backfill
- Affected code:
  - New: ETF/scripts/validate_registry_sync.py
  - New: ETF/pipeline/steps/backfill_future_returns.py
  - Modified: .github/workflows/etf_daily.yml
  - Modified: ETF/pipeline/context.py
  - Modified: ETF/pipeline/orchestrator.py
  - Modified: ETF/pipeline/steps/multi_etf_step.py
  - Modified: ETF/pipeline/steps/buying_pattern_step.py
  - Modified: src/app/investment/[etf]/page.tsx
  - Modified: src/components/features/investment/EtfHeader.tsx
