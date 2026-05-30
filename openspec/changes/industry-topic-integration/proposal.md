## Why

目前投資儀表板的族群分析僅依賴 FinLab 的傳統產業分類（上市/上櫃 category），無法反映市場熱門的細分投資主題（如「CoWoS先進封裝」、「LEO衛星」、「AI伺服器散熱」）。`stock-data-ai/stock-data` 這個公開 repo 提供 109 個細分主題的人工策劃標籤，以及股票代碼→主題的對照表，可以直接整合進來，讓 ETF 持股監控頁能依主題過濾，大幅提升選股精準度。

## What Changes

- 新增每日同步 Pipeline 步驟，從 `stock-data-ai/stock-data` GitHub Raw 下載 `topics.json` 與 `company-topics/index.json`，寫入 Supabase `stock_topics` 與 `stock_topic_assignments` 資料表
- 新增 `SyncTopicsStep` 到 ETF Pipeline（輔助步驟，失敗不中斷）
- ETF 持股頁（`/investment/[etf]`）的持股列表加入主題標籤顯示與過濾
- `/investment/sectors` 頁面加入「主題視角」Tab，展示 109 個主題的熱力圖（以 ETF 持股數量加權）

## Non-Goals

- 不自行維護或人工編輯主題標籤，完全以外部 repo 為 source of truth
- 不建立供應鏈上下游關係圖（edges 資料），留待後續規劃
- 不支援使用者自訂主題標籤

## Capabilities

### New Capabilities

- `topic-sync-pipeline`: 每日從外部 repo 同步 109 個主題標籤及公司對應關係至 DB
- `etf-holding-topic-tags`: ETF 持股頁顯示每支股票所屬的主題標籤，並支援主題過濾
- `sector-topic-heatmap`: `/investment/sectors` 主題視角 Tab，以 ETF 持股加權展示各主題強弱熱力圖

### Modified Capabilities

（none）

## Impact

- Affected specs: topic-sync-pipeline（新建）、etf-holding-topic-tags（新建）、sector-topic-heatmap（新建）
- Affected code:
  - New: `supabase/migrations/<timestamp>_add_stock_topics.sql`
  - New: `ETF/pipeline/steps/sync_topics_step.py`
  - Modified: `ETF/pipeline/orchestrator.py`
  - Modified: `src/app/investment/[etf]/page.tsx`
  - Modified: `src/app/investment/sectors/page.tsx`
  - New: `src/hooks/investment/useTopicFilter.ts`
