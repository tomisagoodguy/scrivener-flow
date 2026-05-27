## Context

`/investment/sectors` 已有依台灣交易所族群分類（水泥、金融、電子等）的熱力圖與列表視圖。`topicMap.json` 包含 75 個科技題材（AI 伺服器、散熱冷卻、矽晶圓等），每個題材有 id、shortname、group（16大群組）、description、stocks（台股代號陣列）。資料來源為 stock-data-ai/stock-data 公開 GitHub repo，已下載至 `src/lib/investment/topicMap.json`。

股價漲跌資料可從現有資料表取得：
- `market_treemap_daily`：含 stock_code, change_pct, close, market_cap（最新交易日）
- `sector_strength_stocks`：含 stock_id, ret_1d, ret_5d, ret_20d（最新批次）

## Goals / Non-Goals

**Goals:**
- 以 16 大群組為 Tab / Filter，切換顯示對應題材卡片
- 每張題材卡片顯示：shortname、group badge、成分股數、題材平均日漲跌（由成分股 ret_1d 計算）、熱度顏色（紅漲綠跌，台股慣例）
- 支援關鍵字搜尋（shortname / name / description）
- 點擊卡片展開或跳轉至題材詳情（inline 展開，顯示成分股清單 + 個股漲跌）
- `revalidate = 3600`，Server Component 靜態重驗

**Non-Goals:**
- 不做上中下游分層
- 不做即時股價 polling
- 不建立新資料表（直接使用 market_treemap_daily / sector_strength_stocks）

## Decisions

### D1：資料載入方式
- `topicMap.json` 在 Server Component import（Node.js 靜態檔案讀取，無 DB 查詢）
- `getTopicStockReturns()` Server Action：批量查 `market_treemap_daily` 最新日期 + 指定 stock_code 清單，回傳 `Record<string, number>`（股票代號 → change_pct）
- 頁面在 Server 端計算每個題材的 `avgRet1d`（成分股 change_pct 中位數，濾掉 null）後傳給 Client Component

### D2：UI 佈局
- 頂部：群組 Tab 列（全部 + 16 個群組），超過螢幕寬度時水平滾動
- 主體：卡片 Grid（xl:4 lg:3 md:2 sm:1），每張卡片固定高度約 140px
- 展開：點擊卡片切換 `selectedTopicId`，底部彈出成分股列表（inline，不另開頁面）
- 搜尋 input 在群組 Tab 右側

### D3：Server Action getTopicStockReturns
```ts
// 簽名
async function getTopicStockReturns(stockCodes: string[]): Promise<Record<string, { change_pct: number | null, close: number | null }>>
// 實作：查 market_treemap_daily WHERE date = max(date) AND stock_code IN (...)
// 回傳空物件時前端 fallback 顯示 '--'
```

### D4：TopicCard 顏色計算
- `avgRet1d > 2%` → deep red (`#991b1b`)
- `avgRet1d > 0.5%` → rose (`#f87171`)
- `avgRet1d > -0.5%` → neutral
- `avgRet1d > -2%` → light green
- `avgRet1d <= -2%` → deep green
- 與 `SectorHeatmap.tsx` 的 `blockColor()` 函數閾值一致

### D5：SideNav 新增連結
在 `/investment/sectors` 連結後方新增 `/investment/topics`（「產業題材」），使用 `Tag` 或 `Layers` icon。

## Risks / Trade-offs

- `market_treemap_daily` 若當日未更新，change_pct 可能是前一交易日資料（可接受，顯示日期提示）
- 75 個題材 × 最多 15 支成分股 ≈ 最多 794 筆 stock_code 查詢，單次 IN 查詢效能可接受（Supabase 支援大型 IN list）
- `topicMap.json` 是靜態檔，新增/調整題材需手動重新下載（可接受，題材變動頻率低）
