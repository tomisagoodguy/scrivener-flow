## Why

現有 ETF Pipeline 爬蟲在來源失效時缺乏完整的自動降級鏈，且 Excel/CSV 解析對欄位名稱差異無容錯能力，導致特定投信格式變更時靜默失敗。參考 wang2059/PWA_ETF 專案後，確認三項可立即改善的韌性缺口。

## What Changes

- **Fallback 鏈標準化**：所有 secondary ETF 的爬取策略從「single source」升級為 `official_api → moneydj → pocket` 三層鏈，任一層失敗自動降至下一層，並在 context 記錄 `used_fallback` 來源
- **Excel/CSV 欄位 alias mapping**：`xlsx_parser.py` 新增欄位別名對照表，同一語意的欄位（如「證券代號 / stock_code / code」）統一映射至標準欄名，解析失敗前先嘗試所有別名
- **交易日前置確認**：Pipeline 開始時新增 `CheckTradeDateStep`，比對 DB 最新資料日期與當日預期交易日，若資料已是最新則 early-exit，避免非交易日或資料未更新時白跑全流程

## Non-Goals

- 不修改 `ScrapeStep`（00981A 主流程）的爬取邏輯，其 `official_api → fhtrust` fallback 維持不變
- 不新增新的資料來源（如直接官方 CSV URL，因目前所有投信的 URL 仍是 null）
- 不修改 `diff_engine.py` 或資料庫 schema

## Capabilities

### New Capabilities

- `etf-scraper-fallback-chain`：secondary ETF 三層 fallback 鏈（official_api → moneydj → pocket），含來源記錄
- `etf-xlsx-column-alias`：Excel/CSV 解析的欄位別名容錯映射
- `etf-trade-date-precheck`：Pipeline 啟動時的交易日前置確認與 early-exit

### Modified Capabilities

- `moneydj-etf-scraper`：從「pocket 失敗才用」調整為 fallback 鏈中的第二層，行為規格擴展

## Impact

- Affected specs: etf-scraper-fallback-chain（新）、etf-xlsx-column-alias（新）、etf-trade-date-precheck（新）、moneydj-etf-scraper（修改）
- Affected code:
  - New: `ETF/pipeline/steps/check_trade_date_step.py`
  - Modified: `ETF/scrapers/xlsx_parser.py`, `ETF/pipeline/steps/multi_etf_step.py`, `ETF/scrapers/moneydj_scraper.py`, `ETF/pipeline/orchestrator.py`
