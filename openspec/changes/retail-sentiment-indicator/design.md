## Context

系統目前在 `market_breadth_daily` 表儲存每日 ADL/ADR 廣度指標，由 `SyncAdlStep` 於 ETF Pipeline 每日執行後寫入。前端 `/investment/breadth` 頁面消費此資料。

集保股權分散資料（FinLab `etl:inventory:*`）為週頻更新（每週五），包含每支股票各持股級距的人數、股數、占比。此次在現有架構基礎上加入市場層級散戶指標。

## Goals / Non-Goals

**Goals:**

- 計算全市場中位數層級的小戶人數占比 12 週變化與零股占比，判斷散戶參與加速 vs 籌碼碎片化
- 將結果擴充至 `market_breadth_daily` 現有資料表（新增欄位）
- 在 `/investment/breadth` 頁面新增散戶情緒卡片

**Non-Goals:**

- 不新增獨立資料表，避免 JOIN 複雜度增加
- 不做個股層級散戶指標
- 不建立獨立頁面
- 不修改 `equity_distribution_stats`（個股層級架構保留）

## Decisions

### 使用全市場中位數聚合（median）

FinLab inventory 資料以個股為 column。市場層級信號需先橫向聚合。

選擇 `median(axis=1)` 而非 `mean(axis=1)`：
- 台股有大量低流動性小型股，零股占比極端值多
- mean 受單一大型股（如台積電）持股結構影響過大
- median 提供更穩定的市場中心趨勢

替代方案排除：加權平均（需市值資料，增加依賴）、只看成分股（樣本偏差）。

### 12 週變化 + 近 3 年滾動 P90 作為信號門檻

12 週（約 3 個月）符合文章中「季節性加速」的觀察時窗。
近 3 年（156 週）滾動 P90 作為閾值，動態適應市場結構改變。

替代方案排除：固定閾值（如 0.4%）不適應市場結構改變；52 週（1 年）樣本太少、統計不穩定。

### 擴充 market_breadth_daily 現有資料表

新增 4 個欄位至 `market_breadth_daily`，不建新表：
- 避免前端新增 JOIN
- 廣度指標與散戶指標同屬「市場層級週期信號」，概念一致
- Migration 使用 `ALTER TABLE ... ADD COLUMN IF NOT EXISTS`，冪等安全

### RetailSentimentStep 定位為輔助步驟

集保資料為週頻，但 pipeline 每日執行。步驟檢測到當週資料未更新時 early return 不寫入，避免重複更新。
步驟失敗只 log error，不 raise，確保 NotifyStep 等後續步驟正常執行。

### 前端使用 Server Action 而非 API Route

`getRetailSentiment()` 為唯讀查詢，無 Webhook 或特定 HTTP Method 需求，符合 Server Action 使用條件。

## Risks / Trade-offs

- [風險] FinLab `etl:inventory:*` 資料延遲或欄位改名 → 步驟捕捉 Exception 後 log error，ctx.retail_sentiment 設空 dict，不影響主流程
- [風險] `market_breadth_daily` 每日執行但集保週頻更新，會有多日重複計算 → 步驟先查最新已入庫日期，若本週已寫入則 early return
- [取捨] 使用 median 聚合損失個股分布細節 → 接受，此指標目的是市場情緒方向，不需個股精度
