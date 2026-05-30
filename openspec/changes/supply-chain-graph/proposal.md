## Why

`industry-topic-integration` 提供了 109 個主題節點，但各主題之間的上下游供應鏈關係（如 IC 設計→晶圓代工→先進封測→AI 伺服器 ODM）是投資判斷的核心脈絡。用戶已人工策劃了約 100 條有向邊（`chain_edges.json`），現在需要將其儲存並以互動式 DAG 圖呈現，讓用戶能一眼看懂台股科技供應鏈結構，並從圖中直接點擊主題查看 ETF 持股。

## What Changes

- 新增 `src/data/chain_edges.json`：儲存人工策劃的約 100 條有向供應鏈邊（`{source, target}` 格式，source/target 均為 `topics.json` 的 `id`）
- 新增 Supabase 資料表 `topic_chain_edges`，每日從 `chain_edges.json` 同步（靜態資料，schema 異動時手動更新）
- 新增 `/investment/supply-chain` 頁面，以 DAG 圖（React Flow 或 D3 force-directed）呈現完整供應鏈
- 節點點擊後側欄展示該主題的 ETF 持股清單（整合 `industry-topic-integration` 的主題-持股資料）

## Non-Goals

- 不自動推論供應鏈關係（所有 edges 均來自人工策劃的靜態 JSON）
- 不支援用戶在 UI 上新增或修改邊
- 不做供應鏈強弱的量化評分
- 此 change 依賴 `industry-topic-integration` 的 `stock_topics` 與 `stock_topic_assignments` 資料表已存在

## Capabilities

### New Capabilities

- `chain-edges-data`: 靜態 `chain_edges.json` 與 `topic_chain_edges` DB 資料表，儲存所有供應鏈有向邊
- `supply-chain-dag-view`: `/investment/supply-chain` 頁面，互動式 DAG 圖視覺化，含節點點擊側欄

### Modified Capabilities

（none）

## Impact

- Affected specs: chain-edges-data（新建）、supply-chain-dag-view（新建）
- Affected code:
  - New: `src/data/chain_edges.json`
  - New: `supabase/migrations/<timestamp>_add_topic_chain_edges.sql`
  - New: `src/app/investment/supply-chain/page.tsx`
  - New: `src/components/features/SupplyChainGraph.tsx`
  - New: `src/app/actions/getSupplyChainData.ts`
