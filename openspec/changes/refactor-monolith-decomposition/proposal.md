# Proposal: Monolith Decomposition

## Overview

**Change ID**: `refactor-monolith-decomposition`
**Status**: Proposed
**Created**: 2026-02-04
**Problem**: 專案中存在多個巨石代碼（Monolithic Code），違反單一職責原則 (SRP) 與關注點分離原則，導致維護困難、測試困難與耦合度過高。

## Why

專案隨著功能迭代，多個核心模組已累積成巨石代碼，嚴重影響開發效率與程式碼品質：

- **ETF/main.py** (207行)：Pipeline 邏輯全寫在單一函數內，無法獨立測試各步驟
- **ETF/services/finlab_service.py** (495行)：God Service 問題，單一類別承擔 7+ 職責
- **Frontend Components** (300-390行)：資料獲取邏輯與 UI 渲染混雜

此次重構旨在透過 **單一職責原則** 與 **Pipeline Pattern** 拆解巨石，提升可維護性與可測試性。

## What Changes

### Phase 1: ETF Pipeline 模組化

- 建立 `ETF/pipeline/` 目錄，包含 `context.py`, `orchestrator.py`, `steps/` 子目錄
- 將 `main.py` 的 9 個步驟拆分為獨立的 Step classes
- 精簡 `main.py` 至 < 50 行的 Entry Point

### Phase 2: FinlabService 拆分

- 建立 `ETF/services/finlab/` 目錄，包含 `client.py`, `price_service.py`, `ohlcv_service.py`, `company_service.py`
- 將 495 行的 God Service 拆分為專責服務
- 保持 Facade Pattern 確保向後相容

### Phase 3: Frontend Component 拆分

- 新增 Custom Hooks：`usePriceData`, `useRevenueData`, `useChipsData`, `useBrokerData`
- 拆分 `HoldingsTable.tsx` 為 `HoldingsFilterBar.tsx` + `useHoldingsFilter.ts`
- 精簡 `PriceChartModal.tsx` 至 < 150 行

### Phase 4: 冗餘代碼清理

- 評估並處理 `download_00981A.py` 重複邏輯
- 更新文件

## User Value

- **開發者價值**：每個模組可獨立測試，提高 CI 效率
- **維護者價值**：程式碼更易閱讀與修改，降低 bug 引入風險
- **擴展性價值**：Pipeline Step 可輕鬆新增/移除/重排

## Scope

### In Scope

- ✅ 拆分 `ETF/main.py` 為 Pipeline 模式
- ✅ 拆分 `ETF/services/finlab_service.py` 為多個專責服務
- ✅ 拆分 Frontend 巨石元件
- ✅ 保持所有現有功能不變

### Out of Scope

- ❌ 不更動資料庫 Schema
- ❌ 不改變 API 合約
- ❌ 不新增功能（僅重構）
- ❌ 不修改 GitHub Actions workflow

## Acceptance Criteria

1. **行數限制**：沒有單一 Python 檔案超過 200 行
2. **行數限制**：沒有單一 TSX 元件超過 200 行
3. **可測試性**：每個 Pipeline Step 有獨立的單元測試
4. **相容性**：`python -m ETF.main --dry-run` 執行成功
5. **相容性**：`yarn build` 執行成功無 TypeScript 錯誤
6. **行為不變**：現有功能行為完全不變

## Technical Approach

### ETF Pipeline 架構

```
ETF/
├── main.py              # Entry Point (< 50 行)
├── pipeline/
│   ├── __init__.py
│   ├── context.py       # PipelineContext dataclass
│   ├── orchestrator.py  # PipelineOrchestrator
│   └── steps/
│       ├── __init__.py
│       ├── scrape_step.py
│       ├── price_attach_step.py
│       ├── diff_compute_step.py
│       ├── save_snapshot_step.py
│       ├── sync_ohlcv_step.py
│       ├── notify_step.py
│       └── cleanup_step.py
```

### FinlabService 架構

```
ETF/services/
├── finlab/
│   ├── __init__.py      # Facade (保持相容)
│   ├── client.py        # Finlab API 連線
│   ├── price_service.py # attach_prices
│   ├── ohlcv_service.py # get_ohlcv
│   └── company_service.py
```

## Dependencies

- 無新增依賴
- 現有：pandas, finlab, requests

## Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Import path 變更 | 現有調用者失敗 | 使用 Facade 保持向後相容 |
| Finlab API Quota | 測試消耗配額 | Local 測試使用 mock |
| 重構遺漏 | 功能缺失 | 執行 dry-run 驗證 |

## Alternatives Considered

1. **完全重寫**：風險太高，不採用
2. **僅重構 Python**：前端問題未解決，部分採用
3. **漸進式重構**：選擇此方案，分 4 個 Phase 執行

## Implementation Plan

詳見 `tasks.md`
