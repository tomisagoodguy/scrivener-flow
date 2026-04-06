# ETF Stock Picker Hub Proposal

## Why

三支 ETF（00980A/00981A/00991A）目前各自有獨立的策略洞察/Revenue Lab/持股明細/異動紀錄/ETF對比頁籤，但本質上三支 ETF 的差異只在持股組成（即各經理人的偏好），使用者核心目的是「從這些 ETF 的持股中挑個股」。現行架構讓使用者要在三個 ETF 視角之間切換才能做全局比較，難以看清個股在三方的共同持有趨勢與權重變化。

## What Changes

- **BREAKING** 路由重構：`/investment?etf=00981A` → `/investment/[etf]`（各 ETF 獨立 URL）；個股詳情 `/investment/dashboard/[code]` → `/investment/stock/[code]`
- 新增「**個股選擇中心**」（Stock Picker Hub）：以個股為主體，三 ETF 視角為篩選維度，合併顯示所有 ETF 聯集持股
- 個股詳情頁新增「**ETF 持倉歷史**」模組：顯示該股在三支 ETF 中各自的持股權重趨勢折線圖（含重疊對比）
- ETF 切換器保留，但同時也可在個股選擇中心用 ETF 勾選框做篩選（「只看三方共同持有」、「只看00981A+00980A」等）
- `InvestmentTabs` 新增「**選股**」頁籤作為預設首頁籤，原有頁籤保持不動
- `EtfSelector` 路由行為改為 push 到 `/investment/[etf]`（不再用 query string）

## Capabilities

### New Capabilities

- `stock-picker-hub`: 跨三 ETF 的個股聯集列表，支援多維排序（共同持有數、動能分數、營收成長、各ETF權重），可勾選 ETF 篩選
- `etf-weight-history-per-stock`: 個股詳情頁新增模組，顯示該股在三支 ETF 的持股權重歷史趨勢折線圖（同一張圖三條線）
- `etf-segment-routing`: `/investment/[etf]` 動態路由，各 ETF 有獨立 URL，支援直接連結與 SEO

### Modified Capabilities

- `investment-tabs`: 新增「選股」頁籤為預設 tab；tab URL 參數從 `?tab=` 合入新路由
- `etf-selector`: 路由行為從 `?etf=` query 改為 `/investment/[etf]` segment

## Impact

- **路由層**：`src/app/investment/page.tsx` 拆為 `src/app/investment/[etf]/page.tsx` + 根頁 redirect
- **個股頁**：`src/app/investment/dashboard/[code]/` → `src/app/investment/stock/[code]/`（舊路徑加 redirect）
- **新元件**：`StockPickerHub.tsx`（含多 ETF 篩選邏輯）、`EtfWeightHistoryChart.tsx`（個股跨 ETF 持倉折線圖）
- **API**：新增 `/api/investment/etf-weight-history?code=[stock_code]`，回傳三 ETF 對該股的歷史權重序列
- **現有元件**：`EtfSelector`、`InvestmentTabs`、`useStockDashboard` hook 需配合新路由調整
- **資料庫**：使用現有 `etf_weight_history` 與 `etf_holdings_snapshot` 表，不需 Schema 變更
