## 1. DB Schema（DB schema：`stock_topics` + `stock_topic_assignments` 兩表分離）

- [x] 1.1 新增 migration SQL：建立 `stock_topics` 資料表（`topic_id TEXT PRIMARY KEY`, `name`, `short_name`, `group_name`, `description`, `color`, `icon`, `updated_at TIMESTAMPTZ`），啟用 RLS 並加入公開讀取 policy（DB schema for topics）
- [x] 1.2 新增 migration SQL：建立 `stock_topic_assignments` 資料表（`stock_code TEXT`, `topic_id TEXT`, `PRIMARY KEY(stock_code, topic_id)`, FK → `stock_topics(topic_id) ON DELETE CASCADE`），啟用 RLS 並加入公開讀取 policy；檔名格式 `supabase/migrations/<timestamp>_add_stock_topics.sql`（DB schema for topics）

## 2. Pipeline 同步步驟（topic-sync-pipeline）

- [x] [P] 2.1 在 `ETF/pipeline/steps/sync_topics_step.py` 實作 `SyncTopicsStep`：繼承 `BaseStep`，`name = "Sync Topics"`；從 GitHub Raw URL 下載 `topics.json` 與 `company-topics/index.json`（`requests.get`，timeout=30）；以同步策略：UPSERT + 刪除孤立記錄（INSERT ON CONFLICT DO UPDATE，再 DELETE 舊記錄）寫入兩張表；失敗時 log error 不 raise（輔助步驟，daily topic sync from external repo）
- [x] [P] 2.2 在 `ETF/pipeline/orchestrator.py` 的輔助步驟區段加入 `SyncTopicsStep`，順序在 `SyncOHLCVStep` 之後

## 3. Server Action（etf-holding-topic-tags / sector-topic-heatmap）

- [x] [P] 3.1 修改 `src/app/actions/getHoldings.ts`（或 `getHoldings` 所在 Server Action 檔案）：前端主題顯示：server-side join，不在 client fetch，為每個 holding 附加 `topics: { topic_id, short_name, color }[]`（最多 3 個）；新增 `topic?: string` 參數，過濾邏輯：URL param `topic=<topic_id>`（display topic tags on ETF holdings / filter holdings by topic）
- [x] [P] 3.2 新增 Server Action `src/app/actions/getTopicHeatmapData.ts`：查詢 `stock_topics` JOIN `stock_topic_assignments` JOIN `etf_holdings_snapshot`（最新 `canonicalDate`），計算每個 topic 的 `total_weight`（SUM weight）與 `holding_count`，回傳陣列依 `total_weight` 降冪排序，排除 `holding_count = 0` 的 topic（topic data server action）

## 4. 前端—ETF 持股頁（etf-holding-topic-tags）

- [x] 4.1 更新 `src/types/index.ts` 或相關型別檔：為 Holding 型別加入 `topics?: { topic_id: string; short_name: string; color: string }[]` 欄位
- [x] 4.2 新增 `src/hooks/investment/useTopicFilter.ts`：管理 `topic` URL param 的讀取（`useSearchParams`）與設定（`useRouter.push`），回傳 `{ activeTopic, setTopic, clearTopic }`
- [x] 4.3 在 ETF 持股列表元件（`src/app/investment/[etf]/page.tsx` 或對應子元件）新增：持股 row 顯示最多 3 個主題 chip（`short_name`，用 `color` 作背景）；新增 topic 下拉選單或 chip 列讓用戶選擇主題過濾；過濾啟用時顯示帶 clear button 的 active filter chip（filter holdings by topic / clear topic filter）

## 5. 前端—族群頁主題 Tab（sector-topic-heatmap）

- [x] 5.1 在 `src/app/investment/sectors/page.tsx` 加入「主題」Tab（topic heatmap tab on sectors page）；Tab active 時呼叫 `getTopicHeatmapData()` Server Action
- [x] 5.2 實作主題熱力圖元件（可放於 `src/components/features/`）：主題熱力圖：以 ETF 持股總市值加權，`total_weight` 決定 block 大小，`color` 決定填色，`short_name` + holding_count 作為標籤；點擊 block 時展開 panel 列出該 topic 的持股清單（heatmap block sizing / heatmap block color / click to filter / no ETF holdings for a topic）
