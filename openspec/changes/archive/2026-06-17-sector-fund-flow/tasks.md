## 1. 資料庫 Schema

- [x] 1.1 [P] （實作 spec「Persist by_sector column on etf_flow_daily」之 migration 部分）新增 migration `supabase/migrations/20260617120000_add_etf_flow_by_sector.sql`，對 `etf_flow_daily` 加上 nullable `by_sector jsonb` 欄位（`ADD COLUMN IF NOT EXISTS`）。驗證：套用 migration 後查 `etf_flow_daily` schema 含 `by_sector jsonb`，且既有列該欄為 NULL。

## 2. Pipeline 後端 — 透過 PipelineContext 共用產業對照，避免重複呼叫 FinLab

實作 design 決策「透過 PipelineContext 共用產業對照，避免重複呼叫 FinLab」與 spec「Share stock-to-industry mapping via pipeline context」。

- [x] 2.1 [P] 在 `ETF/pipeline/context.py` 的 `PipelineContext` 新增 `stock_industry_map: dict[str, list[str]]` 欄位，預設為空 dict。驗證：建立 `PipelineContext()` 後 `ctx.stock_industry_map == {}`。
- [x] 2.2 實作 spec「Share stock-to-industry mapping via pipeline context」：在 `ETF/pipeline/steps/sector_strength_step.py` 既有 explode 流程後，把 `stock_id → [category...]` 聚合寫入 `ctx.stock_industry_map`。驗證：以含 themes 的 mock 執行該步驟後 `ctx.stock_industry_map` 含各股票對應的 category 清單；FinLab 不可用 / 步驟 skip 時維持空 dict 不拋例外（單元測試覆蓋兩路徑）。

## 3. Pipeline 後端 — Compute daily sector fund flow（TDD）

實作 spec「Compute daily sector fund flow」與 design 決策「`by_sector` 兩層 jsonb 結構：母題材聚合 + children 子題材明細」「一股多題材 → 母題材金額可重複計入，UI 明確標示」。

- [x] 3.1 先寫單元測試（red）：給定 mock 的 `inflow` / `outflow` 與 `stock_industry_map`，驗證 `by_sector` 兩層 jsonb 結構（母題材聚合 + children 子題材明細）依 `net_nt` 由大到小排序、`net_nt == in_nt - out_nt`、每筆母題材含 `children` 子題材明細，母題材名稱取冒號前段（無冒號則整串）。
- [x] 3.2 寫單元測試（red）：實作 design 決策「一股多題材 → 母題材金額可重複計入」——單一流入個股屬同一母題材的多個子題材時，母題材 `in_count` 只計一次、且 children 含全部子題材。
- [x] 3.3 寫單元測試（red）：`stock_industry_map` 為空時 `by_sector` 為 `[]`，且 `inflow` / `outflow` / `by_etf` / `totals` 仍照常產出、不拋例外。
- [x] 3.4 在 `ETF/pipeline/steps/flow_compute_step.py` 實作 Compute daily sector fund flow 的母子兩層 `by_sector` 聚合函式，讀 `ctx.stock_industry_map`，使 3.1–3.3 測試轉綠（green）。金額單位為元，與 `inflow.total_nt` 一致。
- [x] 3.5 （實作 spec「Persist by_sector column on etf_flow_daily」之 upsert 部分）在 `flow_compute_step.py` 的 `_upsert_flow` 加入 `by_sector` 寫入（沿用 `CAST(:by_sector AS jsonb)` 模式，ON CONFLICT 時一併更新），與 `inflow` / `by_etf` 同寫法。驗證：以本地 dry-run 或整合測試確認 upsert 後該日 `by_sector` 非 NULL；重跑同日資料 `by_sector` 被更新。

## 4. 前端 — 產業總覽分頁

- [x] 4.1 [P] 實作 spec「Sector overview tab in DailyFlowPanel」：在 `src/components/features/investment/DailyFlowPanel.tsx` 新增「產業總覽」分頁，讀取 `by_sector` 列出母題材（按淨流入由大到小），淨流入用 `text-rose-600`、淨流出用 `text-emerald-600`（台股紅漲綠跌）。驗證：以含 `by_sector` 的 mock 渲染，分頁列出母題材且色彩正確。
- [x] 4.2 實作 spec「Expandable sub-theme detail」：在「產業總覽」分頁實作母題材列可展開 / 收合顯示子題材明細（各子題材含淨流入 / 流入 / 流出），並顯示「依題材歸類，個股可重複計入」說明文字。驗證：點母題材列展開出現子題材、再點收合；說明文字可見。
- [x] 4.3 在「產業總覽」分頁處理 `by_sector` 為 NULL 或空陣列時顯示「無產業資料」。驗證：以 `by_sector = null` 渲染顯示「無產業資料」訊息。

## 5. 驗證與收尾

- [x] 5.1 執行 `uv run pytest ETF/` 與 `uv run ruff check --fix && uv run ruff format`，確認 Python 端測試全綠、無 lint 錯誤。
- [x] 5.2 執行 `yarn test`（涵蓋 `DailyFlowPanel`）與 `yarn lint`，確認前端測試與 lint 通過。
