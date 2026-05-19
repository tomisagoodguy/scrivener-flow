## Context

`stock_basic_info` 表已由 `SyncCompanyStep` 維護，但目前 `industry` 欄位全為 NULL（FinLab 公司資料有 `industry` 欄位但未寫入）。`getStrategySignals` Server Action 目前只回傳 `stock_id`、`score`、`movement`，未 JOIN 公司資料。`StrategySignalCard` 以股票代號顯示每支持股，使用者需自行查詢中文名稱與族群。

## Goals / Non-Goals

**Goals:**

- `SyncCompanyStep` 同步 FinLab 公司資料時寫入 `industry` 欄位
- `getStrategySignals` 回傳的 `StrategyStock` 含 `name` 與 `industry`
- `StrategySignalCard` 每支股票顯示名稱與產業標籤

**Non-Goals:**

- 不新增依族群篩選策略訊號的功能
- 不自訂產業分類映射，直接使用 FinLab 原始字串
- 不修改策略計算（`run_strategies.py`）

## Decisions

### SyncCompanyStep 寫入 industry 欄位

FinLab `data.get('company_basic_info')` 回傳的 DataFrame 包含 `industry` 欄（中文名，例如「半導體」）。  
`SyncCompanyStep` 已在 `sql_storage.py` 的 `save_company_info()` 中 upsert `stock_basic_info`，只需在 column mapping 加入 `industry`。

替代方案：在 `run_strategies.py` 額外查 FinLab 再寫入 → 被拒，因 `SyncCompanyStep` 才是公司資料的單一來源。

### Server Action 用 JOIN 而非獨立查詢

`getStrategySignals` 已從 `strategy_signals` 撈取 `stock_id`，在同一次請求中 JOIN `stock_basic_info` 取得 `name_short` 與 `industry`，一次查詢避免 N+1。

替代方案：前端另外呼叫 `/api/stocks/batch-info` → 被拒，增加不必要的 round-trip，且 Server Action 已在 Server 端有直接 DB 存取權。

### 產業標籤樣式

使用現有的 glass-card 風格小標籤（`text-xs px-2 py-0.5 rounded-full`），背景色用 `bg-blue-500/10 text-blue-700`，null 時不顯示標籤。

## Risks / Trade-offs

- [Risk] `stock_basic_info` 未涵蓋所有策略選股的小型股 → Mitigation：LEFT JOIN，`industry` 為 null 時 UI 靜默跳過，不顯示標籤
- [Risk] FinLab `company_basic_info` 的欄位名稱可能因版本異動 → Mitigation：`SyncCompanyStep` 加入欄位存在性檢查，缺失時 log warning 並跳過 industry 寫入
