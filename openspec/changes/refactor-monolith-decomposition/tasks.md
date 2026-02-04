# 任務清單 (Tasks)

## Phase 1: ETF Pipeline 重構

### 1.1 建立 Pipeline 基礎架構

- [ ] 建立 `ETF/pipeline/` 目錄結構
- [ ] 建立 `ETF/pipeline/context.py` 定義 `PipelineContext` dataclass
- [ ] 建立 `ETF/pipeline/steps/base.py` 定義 `BaseStep` 抽象類

**驗證**：所有新檔案可正常 import

### 1.2 抽離各步驟

- [ ] 建立 `steps/scrape_step.py` - 從 main.py 抽離 Scraper 邏輯
- [ ] 建立 `steps/price_attach_step.py` - 調用 FinlabService 附加價格
- [ ] 建立 `steps/diff_compute_step.py` - 封裝 compute_diff 調用
- [ ] 建立 `steps/save_snapshot_step.py` - 封裝 storage.save_* 調用
- [ ] 建立 `steps/sync_ohlcv_step.py` - 封裝 OHLCV 同步邏輯
- [ ] 建立 `steps/sync_company_step.py` - 封裝公司資訊同步
- [ ] 建立 `steps/notify_step.py` - 封裝通知邏輯
- [ ] 建立 `steps/cleanup_step.py` - 封裝容量清理邏輯

**驗證**：每個 Step 可獨立 import 並執行 (使用 mock Context)

### 1.3 建立 Orchestrator

- [ ] 建立 `ETF/pipeline/orchestrator.py` 定義 `PipelineOrchestrator`
- [ ] 實作 `run(ctx: PipelineContext)` 方法，依序執行所有步驟
- [ ] 加入統一的錯誤處理與 logging

**驗證**：Orchestrator 可串接所有步驟執行

### 1.4 重構 main.py

- [ ] 將 `main.py` 精簡為 Entry Point (< 50 行)
- [ ] 保留 argparse、環境檢查、初始化 Context
- [ ] 調用 `PipelineOrchestrator.run()`

**驗證**：`python -m ETF.main --dry-run` 可正常執行

---

## Phase 2: FinlabService 拆分

### 2.1 建立 FinlabClient

- [ ] 建立 `ETF/services/finlab/client.py`
- [ ] 移動 `login()`, `_get_data()`, `raw_cache` 至 Client
- [ ] 實作 Singleton 或 Dependency Injection 模式

**驗證**：FinlabClient 可獨立使用

### 2.2 拆分 PriceDataService

- [ ] 建立 `ETF/services/finlab/price_service.py`
- [ ] 將 `attach_prices()` 177 行拆分為多個小方法：
  - `_prepare_date()` - 日期格式化
  - `_fetch_price_data()` - 獲取價格
  - `_calculate_changes()` - 計算漲跌幅
  - `_attach_indicators()` - 附加各項指標

**驗證**：原 `attach_prices()` 行為不變，新版可正常運作

### 2.3 拆分其他 Services

- [ ] 建立 `ETF/services/finlab/ohlcv_service.py` - 移動 `get_ohlcv()`
- [ ] 建立 `ETF/services/finlab/company_service.py` - 移動 `get_company_info()`
- [ ] 建立 `ETF/services/finlab/equity_service.py` - 移動 `_calculate_equity_structure()`

**驗證**：各 Service 可獨立測試

### 2.4 建立 FinlabFacade

- [ ] 建立 `ETF/services/finlab/__init__.py` 作為 Façade
- [ ] 保持原有 API 相容 (`from ETF.services.finlab_service import FinlabService`)
- [ ] 更新 main.py 和其他調用者的 import

**驗證**：所有調用者無需修改即可運作

---

## Phase 3: Frontend Component 拆分

### 3.1 建立資料獲取 Hooks

- [ ] 建立 `src/hooks/investment/usePriceData.ts`
- [ ] 建立 `src/hooks/investment/useRevenueData.ts`
- [ ] 建立 `src/hooks/investment/useChipsData.ts`
- [ ] 建立 `src/hooks/investment/useBrokerData.ts`

**驗證**：各 Hook 回傳 `{ data, loading, error }` 結構

### 3.2 重構 PriceChartModal

- [ ] 使用新建的 Hooks 替換內嵌 fetch 函數
- [ ] 抽離 `ChartNavigator.tsx` 元件
- [ ] 精簡主元件至 < 150 行

**驗證**：Modal 功能不變，資料正確顯示

### 3.3 重構 HoldingsTable

- [ ] 抽離 `HoldingsFilterBar.tsx` - 篩選 UI
- [ ] 抽離 `useHoldingsFilter.ts` - 篩選邏輯 Hook
- [ ] 抽離 `HoldingsTableHeader.tsx` - 表頭排序 UI
- [ ] 精簡 `HoldingsTable.tsx` 至 < 150 行

**驗證**：表格功能不變，篩選與排序正常

---

## Phase 4: 冗餘代碼清理

### 4.1 評估 download_00981A.py

- [ ] 比較 `download_00981A.py` 與 `main.py` 功能差異
- [ ] 決定：刪除 / 保留為獨立工具 / 合併
- [ ] 執行決策並更新文件

**驗證**：若刪除，確認無其他依賴

### 4.2 清理遷移腳本

- [ ] 評估 `ETF/migrate_*.py` 腳本是否仍需要
- [ ] 標記或刪除已完成的 migration 腳本

**驗證**：專案可正常執行

### 4.3 更新文件

- [ ] 更新 `README.md` 中的專案結構說明
- [ ] 更新 `AGENTS.md` 中的 Python 部分
- [ ] 建立 `ETF/README.md` 說明新架構

**驗證**：文件與實際結構一致

---

## 驗收標準

1. ✅ 沒有單一 Python 檔案超過 200 行
2. ✅ 沒有單一 TSX 元件超過 200 行
3. ✅ 每個 Pipeline Step 有獨立的單元測試
4. ✅ 所有 Hooks 可復用於多個元件
5. ✅ `python -m ETF.main --dry-run` 執行成功
6. ✅ `yarn build` 執行成功無 TypeScript 錯誤
7. ✅ 現有功能行為不變

---

## 依賴關係

```
Phase 1.1 → 1.2 → 1.3 → 1.4
                    ↓
Phase 2.1 → 2.2 → 2.3 → 2.4
                         ↓
Phase 3.1 → 3.2 ─────────┤
            ↓            │
          3.3 ───────────┘
                         ↓
                    Phase 4
```

**可並行工作**：

- Phase 1.2 與 Phase 2.1 可並行（不同檔案）
- Phase 3.1-3.3 可與 Phase 1-2 並行（前後端分離）
