## Context

`etf_flow_daily` 每日由 `FlowComputeStep`（pipeline 輔助步驟）寫入，含 `inflow` / `outflow`（個股流向 jsonb 陣列，每筆有 `stock_code` / `stock_name` / `total_nt`（元）/ `delta_shares` / `by_etf` / `etf_count`）、`by_etf`、`totals`。前端 `DailyFlowPanel` 已讀取這些欄位呈現三個分頁。

`SectorStrengthStep` 在 pipeline 順序上**早於** `FlowComputeStep`（orchestrator：SectorStrengthStep → … → FlowComputeStep），且已呼叫 FinLab VIP 的 `security_industry_themes` 並做 explode（`stock_id → category`，一股多題材）。FinLab 有 5GB/天配額限制，重複呼叫同一張表是浪費。

PoC（`C:\tmp\poc_sector_flow.py`，2026-06-16 真實資料）已驗證：68 檔個股對 `security_industry_themes` 覆蓋率 100%，產業聚合可正確呈現資金輪動。使用者已決議採「母題材總覽 + 子題材展開」顆粒度。

FinLab `security_industry_themes` 的 `category` 為階層字串，母題材為冒號前段、子題材為完整字串（例：母題材「被動元件」、子題材「被動元件:電容器」）。母題材即「子題材冒號前段」或「本身不含冒號的 category」。

## Goals / Non-Goals

**Goals:**

- 在 `etf_flow_daily` 增加 `by_sector` 兩層結構，後端每日算好，前端零重算。
- 產業對照在 pipeline 內**只取一次** FinLab 資料，由 `SectorStrengthStep` 經 `PipelineContext` 傳給 `FlowComputeStep`。
- 產業對照缺席時優雅降級：`by_sector` 寫空物件，其餘 flow 欄位照常計算，pipeline 不中斷。
- 前端「產業總覽」分頁母題材列表 + 子題材展開，符合台股紅漲綠跌色彩慣例。

**Non-Goals:**

- 不回填歷史 `by_sector`（NULL 由前端顯示為「無產業資料」）。
- 不改 `inflow` / `outflow` / `by_etf` / `totals` 既有計算與門檻。
- 不新增獨立路由頁；不採互斥單一主產業分類。

## Decisions

### 透過 PipelineContext 共用產業對照，避免重複呼叫 FinLab

在 `PipelineContext` 新增欄位 `stock_industry_map: dict[str, list[str]]`（預設空 dict），語意為 `stock_code → [完整 category 字串...]`。`SectorStrengthStep` 在既有 explode 之後，把同一份 `stock_id → categories` 聚合寫入 `ctx.stock_industry_map`。`FlowComputeStep` 直接讀 `ctx.stock_industry_map`，不自行呼叫 FinLab。

替代方案：(A) 在 `FlowComputeStep` 內另外 `fd.get("security_industry_themes")` — 多一次 VIP 配額消耗，且 `FlowComputeStep` 目前完全不依賴 FinLab，引入新依賴；(B) 持久化一張 `stock_industry_map` DB 表 — 需額外 migration 與同步邏輯，對「當日 flow 用當日對照」的需求過重。選 context 共用，因步驟順序已保證生產者先於消費者，且零額外配額、零額外表。

### `by_sector` 兩層 jsonb 結構：母題材聚合 + children 子題材明細

`by_sector` 為母題材陣列，按 `net_nt` 由大到小排序，每筆母題材含其底下子題材明細：

```json
[
  {
    "sector": "被動元件",
    "net_nt": 1726000000,
    "in_nt": 1760000000,
    "out_nt": 33000000,
    "in_count": 2,
    "out_count": 1,
    "children": [
      { "sector": "被動元件:電容器", "net_nt": 1726000000, "in_nt": 1760000000, "out_nt": 33000000, "in_count": 2, "out_count": 1 }
    ]
  }
]
```

金額單位為元（與 `inflow.total_nt` 一致，前端自行 / 1e8 轉億）。`in_count` / `out_count` 為該（母或子）題材對應到的流入 / 流出個股檔數。母題材的 `in_count` 以「歸入該母題材的相異流入個股數」計（同一股多個子題材不重複計入母題材檔數）。

替代方案：扁平單層（母子混在同一陣列）— 即 PoC 初版產出，169 列且母子重複，前端難折疊；故改為母含 children 的兩層結構。

### 一股多題材 → 母題材金額可重複計入，UI 明確標示

由於 FinLab 一股對多題材，個股的 `total_nt` 會加進它所屬的每個母題材，故母題材 `net_nt` 加總會大於 `totals.net_nt`。此為刻意行為。前端「產業總覽」分頁需顯示說明文字「依題材歸類，個股可重複計入」，避免使用者誤把母題材加總當成總資金。

## Implementation Contract

**Behavior:**

- 每個交易日 pipeline 跑完後，`etf_flow_daily` 當日列的 `by_sector` 含當日產業資金流（母題材排序 + 子題材明細）。
- 前端 `DailyFlowPanel` 出現第四個分頁「產業總覽」：列出母題材（按淨流入由大到小），淨流入紅字、淨流出綠字；點母題材列可展開 / 收合其子題材明細。當日 `by_sector` 為 NULL 或空陣列時，分頁顯示「無產業資料」。

**Data shape:**

- DB：`etf_flow_daily.by_sector jsonb`，可為 NULL（歷史列）。結構如上 Decisions 所定義。
- Python：`PipelineContext.stock_industry_map: dict[str, list[str]]`，預設 `{}`。
- `FlowComputeStep` 產出的 `by_sector` 寫入沿用既有 `_upsert_flow` 的 `CAST(:by_sector AS jsonb)` 模式（與 `inflow` / `by_etf` 同寫法），ON CONFLICT 時一併更新。

**Failure modes:**

- `ctx.stock_industry_map` 為空（FinLab 未登入、`SectorStrengthStep` skip 或失敗）→ `FlowComputeStep` 計算 `by_sector` 為 `[]`（空陣列），其餘欄位照常；只 log，不 raise（維持輔助步驟語意）。
- 個股在對照表中找不到 category → 該股不計入任何母題材（不另列「未分類」桶；PoC 顯示實際覆蓋率 100%，但程式不可假設一定 100%）。

**Acceptance criteria:**

- 新增 Python 單元測試：給定 mock 的 `inflow` / `outflow` 與 `stock_industry_map`，`FlowComputeStep` 的彙總函式產出正確的母題材排序、`net_nt` = `in_nt - out_nt`、母題材 `children` 含對應子題材、母題材 `in_count` 不因一股多子題材而重複計。
- 新增測試：`stock_industry_map` 為空時 `by_sector` 為 `[]` 且不拋例外。
- migration 套用後 `etf_flow_daily` 有 `by_sector` jsonb 欄位且既有列為 NULL。
- 前端：以含 `by_sector` 的 mock 資料渲染，「產業總覽」分頁顯示母題材並可展開子題材；以 `by_sector = null` 渲染顯示「無產業資料」。

**Scope boundaries:**

- In scope：`PipelineContext` 新欄位、`SectorStrengthStep` 填入對照、`FlowComputeStep` 彙總 `by_sector`、一個 migration、`DailyFlowPanel` 新分頁。
- Out of scope：歷史回填、既有 flow 欄位邏輯、`sector_strength` 相關表與頁、獨立路由。

## Risks / Trade-offs

- [母題材金額重複計入易被誤讀為總資金] → UI 明確標示「依題材歸類，個股可重複計入」，且「分 ETF 小計」與 `totals` 仍是不重複的真實總額可對照。
- [`SectorStrengthStep` 失敗會連帶讓 `by_sector` 空] → 兩者本就都是輔助步驟；個股流入/流出/分ETF小計不受影響，產業分頁降級顯示「無產業資料」，可接受。
- [FinLab 題材分類調整或階層格式改變] → 母題材以冒號切分推導，若 FinLab 改格式僅影響分組顆粒度、不影響金額正確性；以單元測試鎖定切分邏輯。

## Migration Plan

- 新增 `supabase/migrations/20260617120000_add_etf_flow_by_sector.sql`：`ALTER TABLE etf_flow_daily ADD COLUMN IF NOT EXISTS by_sector jsonb;`（既有列 NULL，無資料遷移）。
- 部署後下一個交易日 pipeline 自動開始寫入 `by_sector`。
- Rollback：前端分頁對 NULL/空已降級顯示，後端 `by_sector` 寫入為新增行為不影響舊欄位；如需回退，移除前端分頁即可，DB 欄位可保留（NULL 無害）。

## Open Questions

(none)
