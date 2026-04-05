## Why

ETF 對比頁面（/investment/compare）目前功能基本可用，但在資訊密度與互動體驗上有明顯不足：交集說明在持股重疊多時會爆版面、持股固定只顯示 10 支無法展開、缺乏一眼看出重疊率的摘要指標，且日期顯示缺年份。現在三支新 ETF（00980A / 00981A / 00991A）已完整爬取，是最佳時機一次補齊這些體驗缺口。

## What Changes

- **交集說明截斷**：`overlap.any2` / `overlap.all3` 超過 5 支時，僅顯示前 5 支 + `+N 支` 摺疊提示，避免爆版
- **持股可展開**：每張 ETF 卡片預設顯示前 10 筆，新增「顯示全部 N 筆」按鈕；展開後可收回
- **交集 badge 視覺加強**：「3共」/ 「2共」badge 字體加大、對比色加深；整列背景加上更明顯的 highlight
- **重疊比例摘要卡**：頁面頂部新增摘要列，顯示「前10大持股中 X 支三方共有（Y%）/ Z 支兩方共有」
- **data_date 加上年份**：日期格式從 `MM/DD` 改為 `YYYY/MM/DD`

## Capabilities

### New Capabilities
- `etf-overlap-summary`: 頁面頂部的重疊比例摘要卡元件（統計數字 + 視覺指標）
- `etf-holdings-expand`: EtfCard 持股展開/收合互動功能

### Modified Capabilities
- 無 spec-level 行為變更（純 UI 強化）

## Impact

- `src/components/features/investment/EtfComparePanel.tsx`：EtfCard、交集說明區塊、新增摘要卡元件
- `src/app/investment/compare/page.tsx`：日期格式修正
- 無 API / DB / 型別 Schema 變更
