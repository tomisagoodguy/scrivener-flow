## Why

目前 `/investment` 入口頁只有一排純文字 pill 連結可進入各 ETF 深潛頁，使用者無法一眼掌握 26 支主動式 ETF 的整體狀態（揭露日、NAV、規模、持股檔數、當日異動概況）。參考 TW_Active_Tracker 的 ETF 清單頁，以卡片彙整每支 ETF 的關鍵指標，可快速辨識「哪幾支今天有更新、哪幾支異動最大」，再決定深入哪一支。

## What Changes

- 在 `/investment` 頁的 `InvestmentTabs` 新增「ETF 總覽」分頁，以響應式卡片網格（grid）呈現 `ETF_REGISTRY` 全部 ETF
- 每張卡片顯示：ETF 代號、名稱、投信（manager）、揭露日（該 ETF 自己的最新 `data_date`，非全局日期）、NAV、基金規模（億元）、持股檔數，以及四個異動 badge：新增（IN）/ 刪除（OUT）/ 加碼（BUY）/ 減碼（SELL）件數
- 揭露日非今日（落後）時顯示灰階提示，與當日更新者視覺區隔
- 卡片點擊導向既有的 `/investment/[etf]` 深潛頁
- 新增 Server 端聚合函式，一次查詢組出全部 ETF 的總覽統計（snapshot 持股檔數 + `etf_aum_series` 最新 NAV/AUM + `etf_diff_logs` 當日異動分類計數）

## Capabilities

### New Capabilities

- `etf-overview-cards`: ETF 總覽卡片網格，彙整每支 ETF 的揭露日、NAV、規模、持股檔數與當日異動分類統計，作為深潛頁的視覺化入口

### Modified Capabilities

(none)

## Impact

- Affected specs: 新增 `etf-overview-cards`
- Affected code:
  - New: src/lib/investment/etfOverviewStats.ts（Server 端聚合查詢）
  - New: src/components/features/investment/EtfOverviewGrid.tsx（卡片網格容器）
  - New: src/components/features/investment/EtfOverviewCard.tsx（單張卡片）
  - Modified: src/components/features/investment/InvestmentTabs.tsx（新增分頁）
  - Modified: src/app/investment/page.tsx（注入總覽資料與分頁內容）
