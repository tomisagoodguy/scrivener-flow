# 架構設計文件 (Design Document)

## 概述

本文件描述巨石代碼拆解的架構決策與設計模式選擇。

---

## 架構決策記錄 (ADR)

### ADR-001: ETF Pipeline 採用 Step Pattern

**狀態**：提議中

**背景**：
`main.py` 目前包含 9 個連續步驟，都寫在單一 `main()` 函數內 (207 行)。每個步驟間透過變數傳遞狀態，但沒有明確的邊界。

**決策**：
採用 **Pipeline with Step Objects** 模式：

```python
# pipeline/steps/base.py
from abc import ABC, abstractmethod
from dataclasses import dataclass

@dataclass
class PipelineContext:
    """Pipeline 上下文，步驟間共享狀態"""
    df: pd.DataFrame = None
    date_str: str = ""
    etf_code: str = "00981A"
    diff_logs: list = None
    args: argparse.Namespace = None

class BaseStep(ABC):
    @abstractmethod
    def execute(self, ctx: PipelineContext) -> PipelineContext:
        pass

# pipeline/steps/scrape_step.py
class ScrapeStep(BaseStep):
    def execute(self, ctx: PipelineContext) -> PipelineContext:
        scraper = FhTrustScraper(ctx.output_dir)
        ctx.df, ctx.date_str = scraper.run()
        return ctx
```

**後果**：

- ✅ 每個步驟可獨立單元測試
- ✅ 可輕鬆新增/移除/重排步驟
- ✅ Context 物件明確定義資料流
- ⚠️ 需額外定義 Context dataclass

---

### ADR-002: FinlabService 拆分為 Façade + Domain Services

**狀態**：提議中

**背景**：
`FinlabService` 目前有 495 行，包含：

- API 連線邏輯 (`login`, `_get_data`)
- 資料附加邏輯 (`attach_prices`) - 177 行
- 公司資訊獲取 (`get_company_info`)
- OHLCV 獲取 (`get_ohlcv`)
- 股權結構計算 (`_calculate_equity_structure`)

**決策**：
將 `FinlabService` 重構為 **Façade Pattern**，底下拆分為專責 Service：

```
FinlabFacade (原 FinlabService，保留原有 method signatures)
├── FinlabClient          # 負責 login, _get_data, raw_cache
├── PriceDataService      # 負責 attach_prices
├── OHLCVService          # 負責 get_ohlcv
├── CompanyInfoService    # 負責 get_company_info
└── EquityStructureService # 負責 _calculate_equity_structure
```

**後果**：

- ✅ 外部呼叫者無需變更 (Façade 保持相容)
- ✅ 每個 Service 可獨立測試
- ✅ 快取策略可集中管理於 Client
- ⚠️ 跨 Service 依賴需小心管理

---

### ADR-003: React Component 採用 Composition + Custom Hooks

**狀態**：提議中

**背景**：
`PriceChartModal.tsx` (390 行) 包含 5 個 `fetch*()` 函數，與 UI 邏輯緊密耦合。

**決策**：

1. **資料獲取**：抽離為 Custom Hooks

   ```typescript
   // hooks/usePriceData.ts
   export function usePriceData(stockCode: string) {
     const [data, setData] = useState<PriceData[]>([]);
     const [loading, setLoading] = useState(true);
     // ... fetch logic
     return { data, loading };
   }
   ```

2. **UI 組合**：採用 Composition Pattern

   ```typescript
   // PriceChartModal.tsx (精簡後)
   export function PriceChartModal({ stockCode, ... }) {
     const priceData = usePriceData(stockCode);
     const revenueData = useRevenueData(stockCode);

     return (
       <Dialog>
         <ChartNavigator onPrev={...} onNext={...} />
         <StockChart data={priceData.data} />
         <RevenueChart data={revenueData.data} />
       </Dialog>
     );
   }
   ```

**後果**：

- ✅ UI 元件變為純展示層
- ✅ Hook 可在其他地方復用
- ✅ 易於進行 loading/error 狀態處理
- ⚠️ 需注意 re-render 優化

---

## 依賴圖 (Dependency Graph)

### 現況 (Before)

```
main.py
├── FhTrustScraper
├── ETFStorage
├── LineNotifier
├── FinlabService (495 行 God Service)
│   ├── attach_prices (177 行)
│   ├── get_ohlcv
│   ├── get_company_info
│   └── _calculate_equity_structure
└── SQLStorage
```

### 重構後 (After)

```
main.py (< 50 行, Entry Point)
└── PipelineOrchestrator
    ├── ScrapeStep → FhTrustScraper
    ├── PriceAttachStep → FinlabFacade.PriceDataService
    ├── DiffComputeStep → DiffEngine
    ├── SaveSnapshotStep → ETFStorage
    ├── SyncOHLCVStep → FinlabFacade.OHLCVService
    ├── NotifyStep → LineNotifier
    └── CleanupStep → SQLStorage

FinlabFacade
├── FinlabClient (login, cache)
├── PriceDataService
├── OHLCVService
├── CompanyInfoService
└── EquityStructureService
```

---

## 資料流圖 (Data Flow)

```
┌─────────────┐    ┌──────────────┐    ┌───────────────┐
│   Scraper   │───▶│ DataFrame    │───▶│ PriceAttach   │
│   Step      │    │ (holdings)   │    │ Step          │
└─────────────┘    └──────────────┘    └───────┬───────┘
                                               │
                   ┌──────────────┐            │
                   │ DiffCompute  │◀───────────┘
                   │ Step         │
                   └──────┬───────┘
                          │
         ┌────────────────┼────────────────┐
         ▼                ▼                ▼
┌─────────────┐   ┌─────────────┐   ┌─────────────┐
│   Storage   │   │   Notify    │   │   OHLCV     │
│   Save      │   │   Step      │   │   Sync      │
└─────────────┘   └─────────────┘   └─────────────┘
```

---

## 介面定義 (Interfaces)

### PipelineContext

```python
@dataclass
class PipelineContext:
    # Input
    args: argparse.Namespace
    output_dir: Path

    # State (built during pipeline)
    df: Optional[pd.DataFrame] = None
    date_str: str = ""
    etf_code: str = "00981A"
    diff_logs: Optional[List[Dict]] = None

    # Flags
    is_dry_run: bool = False
    is_ci: bool = False
```

### BaseStep

```python
class BaseStep(ABC):
    @property
    @abstractmethod
    def name(self) -> str:
        """步驟名稱，用於 logging"""
        pass

    @abstractmethod
    def execute(self, ctx: PipelineContext) -> PipelineContext:
        """執行步驟，回傳更新後的 Context"""
        pass

    def should_skip(self, ctx: PipelineContext) -> bool:
        """判斷是否跳過此步驟"""
        return False
```

---

## 測試策略

1. **Unit Tests**：每個 Step 獨立測試，mock 依賴
2. **Integration Tests**：完整 Pipeline 執行，使用 fixture 資料
3. **Contract Tests**：FinlabClient 對 Finlab API 的契約測試 (使用 Recording)

---

## 遷移計畫

| Phase | 範圍 | 估計工作量 | 風險等級 |
|-------|------|----------|---------|
| Phase 1 | main.py → Pipeline | 2-3 小時 | 低 |
| Phase 2a | FinlabService.attach_prices | 2-3 小時 | 中 |
| Phase 2b | FinlabService 剩餘拆分 | 1-2 小時 | 低 |
| Phase 3 | Frontend Components | 3-4 小時 | 中 |
| Phase 4 | 冗餘代碼清理 | 1 小時 | 低 |

**總計**：約 10-15 小時

---

## 附錄：程式碼氣味 (Code Smells) 清單

| Smell | 位置 | 類型 |
|-------|------|------|
| Long Method | `main.py::main()` | 207 行 |
| Long Method | `finlab_service.py::attach_prices()` | 177 行 |
| God Class | `FinlabService` | 495 行，7+ 職責 |
| Duplicate Code | `download_00981A.py::compute_diff` vs `diff_engine.py` | 相似邏輯 |
| Feature Envy | `PriceChartModal::fetch*()` | 資料獲取不屬於 UI |
| Large Class | `HoldingsTable.tsx` | 302 行，混合職責 |
