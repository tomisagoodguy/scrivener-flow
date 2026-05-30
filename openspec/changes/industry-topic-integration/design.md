## Context

現有 `/investment/sectors` 頁面以 FinLab `stock_category` 分類（如「半導體業」、「電腦及週邊設備業」）做族群分析，粒度粗糙，無法對應市場熱點。`stock-data-ai/stock-data` 提供 109 個細分投資主題，每日更新，資料以 GitHub Raw URL 公開存取，無需 API key。

目前 ETF Pipeline 已有完整的輔助步驟架構（繼承 `BaseStep`，失敗不中斷），新增同步步驟可直接套用既有模式。前端 ETF 持股頁已有族群過濾邏輯（`useHoldingsFilter`），主題過濾可在此基礎上擴充。

## Goals / Non-Goals

**Goals:**

- 每日同步 109 個主題標籤到 `stock_topics` 資料表
- 每日同步公司→主題對應關係到 `stock_topic_assignments` 資料表
- ETF 持股頁每支股票顯示最多 3 個主題標籤（chip 形式）
- ETF 持股頁可依主題單選過濾
- `/investment/sectors` 新增「主題」Tab，展示各主題的持股數量熱力圖

**Non-Goals:**

- 不維護供應鏈上下游 edges 關係
- 不支援主題自訂或手動覆寫
- 不做主題績效回測

## Decisions

### DB Schema：`stock_topics` + `stock_topic_assignments` 兩表分離

外部 repo 的 topics.json 定義主題元資料（id, name, group, description, color），company-topics/index.json 定義 N:M 對應關係。用兩張表分離存儲而非 JSON 欄位，原因：
- 支援 `stock_topic_assignments` 以 `stock_code` JOIN ETF 持股查詢
- 方便前端查詢「某主題下有哪些持股」（index on topic_id）
- 主題元資料更新（改名、改描述）不影響對應關係

替代方案：直接在 `etf_holdings_snapshot` 加 JSON `topics` 欄位 → 否決，因為主題資料獨立於 ETF snapshot，不應綁在一起。

### 同步策略：UPSERT + 刪除孤立記錄

每次同步先 UPSERT 所有資料，再刪除本次 fetch 中不存在的舊記錄，確保資料與外部 repo 保持一致。用 `topic_id`（外部 id 字串）作為唯一鍵，不用自增 PK。

### 前端主題顯示：Server-side JOIN，不在 Client fetch

ETF 持股頁已是 Server Component，在 `getHoldings()` Server Action 裡 JOIN `stock_topic_assignments` 一次取回各持股的主題清單，不加 Client-side fetch，避免 N+1。每支股票最多顯示 3 個主題 chip。

### 過濾邏輯：URL param `topic=<topic_id>`

沿用現有 `useHoldingsFilter` 的 URL param 模式，新增 `topic` param。Server-side 過濾（在 `getHoldings()` 加 WHERE 條件），保持 URL 可分享。

### 主題熱力圖：以 ETF 持股總市值加權

aistockmap 的熱力圖是以個股市值加權，我們額外有 ETF 持股比重資料（`etf_holdings_snapshot.weight`），改用「該主題下所有持股的 ETF 合計加權」作為 block 大小，更能反映法人佈局強度。

## Risks / Trade-offs

- [外部 repo 改版或搬遷] → `sync_topics_step.py` 加 URL 常數，改一行即可切換；步驟為輔助步驟失敗不中斷 pipeline
- [主題標籤人工策劃可能有偏誤] → 完全接受外部 repo 的定義，不做二次過濾；若用戶發現錯誤，可透過外部 repo issue 反映
- [109 主題 × 全市場個股的對應關係表可能較大] → 約 2000 筆（每股平均 1-2 個主題），遠低於現有 `etf_holdings_snapshot` 規模，無效能疑慮

## Migration Plan

1. 新增 migration SQL 建立 `stock_topics`、`stock_topic_assignments` 兩表，加 RLS（公開唯讀）
2. 部署後手動執行一次 `SyncTopicsStep` 預填資料（或等隔日 CI 自動跑）
3. 前端改動均為 additive（新增 chip、新增 Tab），無 breaking change，可直接部署
