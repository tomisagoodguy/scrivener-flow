## Context

`industry-topic-integration`（parked）建立了 `stock_topics` 與 `stock_topic_assignments` 兩張表，是本 change 的前提依賴。供應鏈邊的資料（約 100 條 `{source, target}`）已由用戶人工策劃完成，儲存於 `src/data/chain_edges.json`。

前端目前無互動式 DAG 圖元件，需引入 React Flow（`@xyflow/react`）——它是 React 生態中維護最活躍的圖形視覺化套件，支援 dagre 自動排版。

## Goals / Non-Goals

**Goals:**

- 將 100 條供應鏈邊存為靜態 JSON，同時同步進 Supabase 供 Server Action 查詢
- 以 React Flow + dagre 自動排版呈現完整 DAG
- 節點以 `group_name` 著色分群，點擊後側欄顯示該主題的 ETF 持股
- 頁面可深連結（URL param `?focus=<topic_id>`，自動 highlight 並置中該節點）

**Non-Goals:**

- 不支援前端編輯邊或節點
- 不做供應鏈量化評分
- 本 change 不包含 `industry-topic-integration` 的 topic 同步步驟

## Decisions

### 靜態 JSON + DB 雙軌儲存邊資料

`src/data/chain_edges.json` 作為人工策劃的 source of truth，方便 PR review 追蹤變更。同時 migration SQL 建立 `topic_chain_edges(source_topic_id, target_topic_id)` 表，並以初始 seed SQL 插入全部邊，讓 Server Action 可用 SQL JOIN 查詢節點+邊一次取回。

更新流程：修改 JSON → 新增 migration SQL 更新 DB，不做自動同步（靜態資料，變更頻率極低）。

替代方案：純靜態 JSON 前端 import → 否決，因為後續可能需要 JOIN stock_topics 做複合查詢，DB 查詢更彈性。

### React Flow + dagre 自動排版

dagre 演算法（`@dagrejs/dagre`）對 DAG 做 top-to-bottom 分層排版，能自動處理多層供應鏈的節點位置。React Flow 負責渲染、縮放、拖曳。

替代方案：D3 force-directed → 否決，force-directed 適合 cluster 圖，DAG 的層級關係用 dagre 更清晰；且 D3 在 React 18 Server Component 架構中整合較複雜。

### 節點著色：依 `group_name` 分群配色

`stock_topics.group_name` 有 9 大群（IC設計、半導體製造、先進封測、記憶體、AI伺服器、網通衛星、綠能環保、智慧機器人、消費終端），對應 9 種固定色系，與 `industry-topic-integration` 的 `color` 欄位共用。

### 側欄持股清單：Server Action 回傳，不做 Client-side fetch

點擊節點觸發 `router.push('?focus=<topic_id>')`，Server Component re-render 時呼叫 `getTopicHoldings(topic_id)` 取回持股清單（JOIN `stock_topic_assignments` + `etf_holdings_snapshot`），在右側 panel 顯示。

## Risks / Trade-offs

- [React Flow bundle 大小 ~200KB] → 以 `next/dynamic` 懶載入，不影響其他頁面初始載入
- [dagre 在 100+ 節點時可能排版擁擠] → 設定 `nodesep=80, ranksep=120`，允許用戶拖動節點調整；提供縮放控制
- [chain_edges.json 需手動維護] → 接受，變更頻率極低，透過 PR 審查

## Migration Plan

1. 新增 migration SQL 建立 `topic_chain_edges` 資料表並 seed 全部邊（依賴 `stock_topics` 已存在，即需先執行 `industry-topic-integration` 的 migration）
2. 新增 `/investment/supply-chain` 頁面（additive，無 breaking change）
3. 在側邊欄導覽加入「產業鏈」連結
