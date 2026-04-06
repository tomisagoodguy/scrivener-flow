## Context

目前 `/investment` 頁面以 `?etf=00981A` query string 切換三支 ETF，每支 ETF 各有五個相同結構的 tab（策略洞察/Revenue Lab/持股明細/異動紀錄/ETF對比）。個股詳情在 `/investment/dashboard/[code]`，導航邏輯（prevStock/nextStock）依賴 `?filters&sort&order` query 串接。

三支 ETF 的 `EtfComparePanel` 已在「ETF對比」tab 實作了持股交集視覺化，但個股維度（一支股票在三 ETF 的歷史權重變化）完全缺失。

## Goals / Non-Goals

**Goals:**
- 建立語義化 URL：`/investment/00981A`、`/investment/00980A`、`/investment/00991A`
- 新增個股選擇中心（Stock Picker Hub）：三 ETF 聯集持股表格，可勾選 ETF 篩選
- 個股詳情頁新增跨 ETF 持倉歷史折線圖（三條線同框）
- 舊 URL（`/investment?etf=xxx`）30x redirect，不破壞既有書籤

**Non-Goals:**
- 不改變現有五個 tab 的內容邏輯
- 不新增新的 ETF 支援（僅 00980A/00981A/00991A）
- 不變更 Python ETF pipeline
- 不做 SSR → CSR 架構調整

## Decisions

### 1. 路由結構：Segment vs Query String

**決定**：改用 `/investment/[etf]` segment routing。

**理由**：
- ETF 是頁面身份（identity），不是篩選狀態（filter state）；符合 Next.js App Router 設計意圖
- 讓瀏覽器歷史、分享連結語義更清晰
- Tab 仍用 `?tab=` query（tab 是 UI 狀態，不是身份）

**替代方案**：維持 query string → 拒絕，因為無法體現 ETF 層級的分頁身份

### 2. 根頁 `/investment` 處理方式

**決定**：`/investment/page.tsx` 做 server-side redirect 到 `/investment/00981A`（默認 ETF）。

**理由**：保持入口點明確，舊書籤導向預設 ETF 而非 404。

### 3. 個股頁路由 `/investment/stock/[code]`

**決定**：新路徑，舊路徑 `/investment/dashboard/[code]` 加 `redirect()`。

**理由**：`stock` 比 `dashboard` 更語義化；dashboard 暗示整體儀表板而非個股頁。

### 4. Stock Picker Hub 的資料來源

**決定**：Server Component，直接在 `/investment/[etf]/page.tsx` 裡擴充 `getCompareData()` 的回傳，加入 `quantFilters` 資料，傳給 `StockPickerHub` Client Component。

**替代方案**：
- 獨立 API endpoint → 增加網路 RTT，不必要
- Client fetch → 喪失 SSR 快取優勢

### 5. 跨 ETF 持倉歷史 API

**決定**：新增 `/api/investment/etf-weight-history?code=[stock_code]`，查 `etf_weight_history` 表（主要）+ `etf_holdings_snapshot` fallback（同現有 `getRankingHistory` 邏輯）。

回傳格式：
```json
{
  "00981A": [{ "date": "2025-01-01", "weight": 3.2, "rank": 5 }],
  "00980A": [...],
  "00991A": [...]
}
```

**理由**：一次查詢拿三 ETF 資料，Client 端合併繪圖；`etf_weight_history` 已有 `rank` 欄位，不需再計算。

### 6. EtfWeightHistoryChart 繪圖

**決定**：使用已有的 `lightweight-charts`（StockChart 同款），三條折線不同顏色（紫/藍/橘，對應現有 ETF 色系），X 軸共享日期，缺資料的點用虛線或斷點表示。

**替代方案**：Recharts → 已有 lightweight-charts，不引入新依賴。

### 7. EtfSelector 路由行為

**決定**：`EtfSelector` 改為 `router.push('/investment/${etfCode}?tab=${currentTab}')`，保留當前 tab 切換 ETF。

## Risks / Trade-offs

- **舊連結失效風險**：`/investment/dashboard/[code]` 舊連結要加 redirect，否則站內其他地方連到這個路徑會 404 → 加 redirect 解決，並用 grep 確認所有內部 `href` 都已更新
- **資料重複 fetch**：`StockPickerHub` 需要三 ETF 全部持股 + quantFilters，資料量較大 → Server Component 一次 fetch，不在 Client 端重複請求
- **etf_weight_history 資料完整性**：部分股票可能只有 snapshot 沒有 weight_history → fallback 已有，繪圖時跳過缺失點

## Migration Plan

1. 新增 `/investment/[etf]/page.tsx`（複製現有 page.tsx 邏輯，移除 ETF query 解析）
2. 根頁 `/investment/page.tsx` 改為 redirect
3. 新增 `/investment/stock/[code]/page.tsx`（複製現有 dashboard page）
4. 舊路徑 `/investment/dashboard/[code]` 加 redirect
5. 更新 `EtfSelector`、`useStockDashboard` 的路由邏輯
6. 新增 `StockPickerHub` 元件 + `InvestmentTabs` 新增「選股」tab
7. 新增 API `/api/investment/etf-weight-history`
8. 新增 `EtfWeightHistoryChart` 元件，掛入個股詳情頁

## Open Questions

- `StockPickerHub` 預設排序：「共同持有數 desc」或「動能分數 desc」？（建議：動能分數，因為這是選股核心指標）
- 跨 ETF 歷史折線圖：x 軸要顯示到多久？（建議：90 天，對應 `etf_weight_history` 現有資料量）
