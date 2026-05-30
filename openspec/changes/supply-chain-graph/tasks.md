## 1. 靜態資料（靜態 JSON + DB 雙軌儲存邊資料）

- [x] 1.1 建立 `src/data/chain_edges.json`：寫入人工策劃的 ~100 條供應鏈有向邊，每筆格式為 `{ "source": "<topic_id>", "target": "<topic_id>" }`，不含自環（static chain edges JSON file）
- [x] 1.2 新增 migration SQL `supabase/migrations/<timestamp>_add_topic_chain_edges.sql`：建立 `topic_chain_edges(source_topic_id TEXT, target_topic_id TEXT, PRIMARY KEY(source_topic_id, target_topic_id))` 資料表，FK → `stock_topics(topic_id) ON DELETE CASCADE`，啟用 RLS 並加入公開讀取 policy，並以 INSERT 語句 seed 全部邊（靜態 JSON + DB 雙軌儲存邊資料 / DB table for chain edges）

## 2. Server Action（supply-chain-dag-view）

- [x] [P] 2.1 新增 `src/app/actions/getSupplyChainData.ts`：查詢 `stock_topics`（所有出現在 `topic_chain_edges` 中的 topic）+ `topic_chain_edges`（所有邊），回傳 `{ nodes: { topic_id, name, short_name, group_name, color }[], edges: { source: string, target: string }[] }`（supply chain DAG page）
- [x] [P] 2.2 新增 `src/app/actions/getTopicHoldings.ts`：接受 `topic_id: string`，查詢 `stock_topic_assignments` JOIN `etf_holdings_snapshot`（最新 `canonicalDate`），回傳 `{ stock_code, stock_name, etf_code, weight }[]` 依 `weight` 降冪排序（node click opens holdings panel）

## 3. 前端元件（supply-chain-dag-view）

- [x] 3.1 安裝套件：`yarn add @xyflow/react @dagrejs/dagre`
- [x] 3.2 新增 `src/components/features/SupplyChainGraph.tsx`（Client Component）：React Flow + dagre 自動排版（`rankdir: 'TB'`, `nodesep: 80`, `ranksep: 120`）；節點著色：依 `group_name` 分群配色（9 大群各一色，不用漲跌紅綠）；點擊節點時呼叫 `onNodeClick(topic_id)` callback；支援縮放與拖動（node coloring by group / supply chain DAG page）
- [x] 3.3 在 `SupplyChainGraph.tsx` 內實作 `onNodeClick`：以 `router.push('?focus=<topic_id>')` 更新 URL，highlight 被點擊節點（邊框加粗或 glow）（node click opens holdings panel / URL deep link support）
- [x] 3.4 新增 `src/components/features/TopicHoldingsPanel.tsx`（Client Component）：側欄持股清單：Server Action 回傳，不做 client-side fetch；接受 `topicId: string | null` prop；`topicId` 非 null 時呼叫 `getTopicHoldings(topicId)` 並顯示清單（stock_code, stock_name, etf_code, weight%）；無持股時顯示「此主題目前無 ETF 持股」（node with ETF holdings / node with no ETF holdings）

## 4. 頁面整合（supply-chain-dag-view）

- [x] 4.1 新增 `src/app/investment/supply-chain/page.tsx`（Server Component）：呼叫 `getSupplyChainData()` 取得 nodes + edges；讀取 `searchParams.focus` 作為初始 highlight topic_id；以 `next/dynamic` 懶載入 `SupplyChainGraph`（component lazy-loaded via next/dynamic）；右側並排 `TopicHoldingsPanel`（direct link with focus param / deep link centering）
- [x] 4.2 在側邊欄導覽 `src/components/layout/SideNav.tsx`（或對應導覽元件）加入「產業鏈」連結指向 `/investment/supply-chain`
