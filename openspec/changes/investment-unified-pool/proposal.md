## Why

目前投資監控各 tab（策略洞察、Revenue Lab、持股明細、異動紀錄）以「單一 ETF」為視角，導致跨 ETF 的選股洞察被分散、無法在同一畫面比較共持個股的 Revenue/策略訊號。隨著主動式 ETF 持續增加，現有「每支 ETF 一個 URL」的架構難以擴充，且 ETF 切換器只是換頁而非真正的池化分析。

## What Changes

- **BREAKING** 拆除現有六 tab 扁平結構，改為兩層架構：
  - **第一層（選股池 Pool）**：固定跨全部已追蹤 ETF，合併持股、標記共持、整合量化因子 + Revenue Lab 過濾
  - **第二層（ETF 深潛 Drill-down）**：從選股池點入某支股票，或切換到特定 ETF 查看持股明細 / 異動紀錄 / 策略洞察
- 新增 ETF 註冊表（`ETF_REGISTRY`）集中管理 ETF metadata（代碼、名稱、顏色、資料來源），新增一支 ETF 只需加一行
- `StockPickerHub` 升級為主畫面核心，整合 Revenue Lab YOY 篩選與策略因子（動能 / 投信買超 / 營收新高）於同一表格欄位
- 異動紀錄（DiffLedger）改為支援多 ETF 合併顯示，並可按 ETF 篩選
- 策略洞察（GoldenGrowthZone）資料來源改為「所有追蹤 ETF 的聯集持股」
- `EtfSelector` 改為全域 ETF 管理入口（可勾選追蹤哪些 ETF 進入池中）

## Capabilities

### New Capabilities

- `etf-registry`: 集中式 ETF 註冊表，支援動態新增 ETF，不需修改頁面邏輯
- `unified-pool-view`: 第一層合併選股池主畫面，跨 ETF 聚合持股 + 量化因子 + Revenue YOY 欄位 + 共持標記 + 黃金成長區間（YOY 50–100%）篩選條件整合
- `multi-etf-drilldown`: 第二層 ETF 深潛，持股明細 / 異動紀錄可切換單一 ETF 或「全部」視角；Revenue Lab（勝率回測 / 營收熱力圖）保留為獨立分頁

### Modified Capabilities

- `investment-page-routing`: 路由從 `/investment/[etf]` 改為 `/investment`（池）+ `/investment/[etf]/holdings`（明細），**BREAKING**

## Impact

- `src/app/investment/[etf]/page.tsx` — 重構為深潛頁，或保留為相容重導向
- `src/app/investment/page.tsx` — 升級為選股池主頁（Server Component，聚合全部 ETF 資料）
- `src/components/features/investment/InvestmentTabs.tsx` — 改為兩層 tab 結構
- `src/components/features/investment/StockPickerHub.tsx` — 整合 Revenue YOY 欄位
- `src/components/features/investment/DiffLedger.tsx` — 支援多 ETF logs 合併
- `src/components/features/investment/GoldenGrowthZone.tsx` — 接受聯集 holdings
- `src/components/features/investment/EtfSelector.tsx` — 改為 ETF 池管理 UI
- 新增 `src/lib/investment/etfRegistry.ts` — ETF 註冊表（Single Source of Truth）
- 資料查詢層（`page.tsx` server functions）— 改為批次查詢多 ETF
