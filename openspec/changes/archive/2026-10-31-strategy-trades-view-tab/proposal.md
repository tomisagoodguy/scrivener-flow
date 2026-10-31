## Why

「換股後表現」面板目前嵌在策略視角裡，位於共選面板與策略卡片之間。資料量大時（實測近 60 天換出 188 筆）整個面板約 6000px 高，把策略卡片推到很下面，使用者想看卡片得捲過整個面板。使用者要求改成頂部檢視切換列的獨立分頁，和「策略視角／監控清單／圖表／均線發散候選」並列，需要時再切過去看。

## What Changes

- 策略頁頂部檢視切換列在「均線發散候選」之後新增「換股後表現」分頁，連到 `/investment/strategy?view=trades`，目前分頁高亮。
- `?view=trades` 只顯示「換股後表現」面板（面板內容、策略切換、說明文字不變）；標題列與切換列保留。
- 策略視角不再顯示「換股後表現」面板，恢復為策略分析面板、共選面板、策略卡片。
- 換股後表現視角只查詢顯示所需的資料（策略訊號供標題日期、換股後表現），不查因子 IC、策略分析、共選歷史、裸K快照。
- 頂部五個切換連結抽成 `StrategyViewTabs` 元件，`page.tsx` 不再重複樣板。

## Non-Goals

- 不改面板本身的內容與排版（列表是否折疊另案處理）。
- 不改監控清單、圖表、均線發散候選三個視角的行為與資料查詢。
- 不改均線發散候選獨立頁 `/investment/strategy/fan-breakout`（它有自己的標題列，沒有這組切換列）。
- 不改 pipeline 與 `strategy_trades` 資料。

## Capabilities

### New Capabilities

(none)

### Modified Capabilities

- `strategy-trade-performance-panel`: 面板位置由策略視角改為獨立的 `?view=trades` 分頁，並新增分頁切換與該視角的資料查詢需求。

## Impact

- 受影響 specs：修改 strategy-trade-performance-panel。
- 受影響程式碼：
  - src/app/investment/strategy/page.tsx（視角判斷、資料查詢條件、面板移到 trades 視角、改用切換列元件）
  - src/components/features/strategy/StrategyViewTabs.tsx（新檔：頂部檢視切換列）
  - src/lib/investment/strategyUtils.ts（新增 `parseStrategyView`）
  - 測試：src/components/features/strategy/__tests__/StrategyViewTabs.test.tsx（新檔）、src/lib/investment/__tests__/strategyUtils.test.ts
- 無資料庫、API、相依套件變更。
