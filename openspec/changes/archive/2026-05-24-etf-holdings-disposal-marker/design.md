## Context

FinLab 提供 `disposal_information` 資料集，包含每支股票的處置開始與結束時間（分時交易期間）。目前 ETF Pipeline 的選股策略層已使用 `etl:disposal_stock_filter` 排除處置股，但持股監控面（`etf_holdings_snapshot`）完全未記錄處置狀態，前端亦無任何視覺提示。

現有資料流：FinLab → Pipeline Steps → Supabase (`etf_holdings_snapshot`) → 前端 `/investment/[etf]`

## Goals / Non-Goals

**Goals:**

- Pipeline 每日執行時，判斷 `etf_holdings_snapshot` 內各持股是否處於處置期間
- 將判斷結果以 `is_disposal` 布林欄位寫入 `etf_holdings_snapshot`
- 前端持股列表對 `is_disposal = true` 的股票顯示紅色「處置中」badge
- 個股詳情頁亦顯示處置狀態警示

**Non-Goals:**

- 不實作「處置股反彈策略」（事件驅動交易，另立 change）
- 不追蹤處置歷史記錄（只記錄當日快照狀態）
- 不修改現有選股策略的 disposal filter 邏輯

## Decisions

### 以 `is_disposal` 欄位擴充 `etf_holdings_snapshot`

**選擇**：在現有 `etf_holdings_snapshot` 表新增 `is_disposal BOOLEAN DEFAULT FALSE` 欄位，而非另建 lookup table。

**理由**：持股快照已是「當日狀態」的聚合點，`is_disposal` 屬於當日持股屬性，放同表查詢最簡單，前端不需額外 JOIN。

**替代方案考慮**：獨立 `disposal_stocks_daily` 表。缺點：前端需額外 JOIN，pipeline 需維護兩張表，複雜度提升而無明顯收益。

### 新增輔助步驟 `DisposalDetectStep`

**選擇**：新建 `ETF/pipeline/steps/disposal_detect_step.py`，在 `SaveSnapshotStep` 之後執行，讀取當日處置資訊並 UPDATE `etf_holdings_snapshot`。

**理由**：符合現有 pipeline 輔助步驟規範（失敗不中斷）；步驟職責單一；不污染 `SaveSnapshotStep` 的核心邏輯。

**執行時機**：`SaveSnapshotStep` 之後（快照已存在），`WeightHistoryStep` 之前。

### 處置資訊查詢方式

**選擇**：從 FinLab `disposal_information` 資料集取得，篩選條件：`分時交易` 欄位不為 NaN（排除非分盤處置雜訊），且 `ctx.date_str` 在 `處置開始時間` 到 `處置結束時間` 之間。

**理由**：與 FinLab 部落格文章範例邏輯一致，資料來源有 FinLab 保障。

## Risks / Trade-offs

- **FinLab 配額消耗**：`disposal_information` 為獨立資料集，每日下載增加少量配額消耗（資料量小，風險低）→ 監控 FinLab 配額儀表板
- **歷史快照不回填**：只更新當日快照的 `is_disposal`，歷史資料保持 NULL/FALSE → 已知限制，可接受
- **輔助步驟失敗靜默**：`DisposalDetectStep` 失敗時 `is_disposal` 留 FALSE，前端不顯示 badge，不造成錯誤但資訊缺失 → 加 LINE 錯誤日誌

## Migration Plan

1. 執行 migration SQL，為 `etf_holdings_snapshot` 新增 `is_disposal` 欄位（DEFAULT FALSE，不影響現有資料）
2. 部署 pipeline 新步驟
3. 前端更新 TypeScript 型別與 UI 元件
4. 回滾策略：移除欄位前端不讀取即可（欄位 DEFAULT FALSE 不影響現有功能）
