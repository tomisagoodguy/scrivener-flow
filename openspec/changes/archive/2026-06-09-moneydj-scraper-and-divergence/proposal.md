## Why

Pocket.tw 爬蟲僅在 ETF 官方公告日更新持股資料，導致 `00998A`、`00983A`、`00401A`、`00400A` 等 ETF 資料可能數日才有一筆新紀錄。MoneyDJ `Basic0007B` 頁面每日顯示最新全部持股，且以 `curl` 呼叫 TLS 最穩定，可作為更可靠的 fallback 來源。此外，現有共識持股分析只追蹤多 ETF 同步買進方向，缺少「同一股票同日不同 ETF 方向相反」的分歧訊號，此訊號在選股決策上極具參考價值。

## What Changes

- 新增 `ETF/scrapers/moneydj_scraper.py`：以 subprocess curl 抓取 MoneyDJ `Basic0007B.xdjhtm?etfid={code}.TW`，解析 `col05/col06/col07` 持股表格與 `sdate3` 資料日期，取代 Pocket.tw 作為 fallback
- 修改 `ETF/scrapers/unified_scraper.py` 與 `ETF/pipeline/steps/multi_etf_step.py`：當 `source='pocket'` ETF 的 Pocket.tw 爬取失敗或資料過舊時，自動 fallback 到 MoneyDJ 爬蟲
- 新增 `ETF/pipeline/steps/divergence_detect_step.py`（輔助步驟）：讀取當日 `etf_diff_logs`，找出同一股票同日有 ETF 買進（BUY/IN）也有 ETF 賣出（SELL/OUT）的分歧標的，結果寫入 `etf_stock_divergence` 新資料表
- 新增 Supabase migration：`supabase/migrations/<timestamp>_add_etf_stock_divergence.sql`
- 修改前端共識頁面 `src/app/investment/consensus/page.tsx`：新增「分歧標的」分頁，顯示各分歧股票的買方/賣方 ETF 清單

## Non-Goals

- 不修改現有 official_api ETF 的爬蟲邏輯
- 不引入 MoneyDJ 作為主要（primary）爬蟲，僅作 fallback
- 不在 MoneyDJ scraper 實作 Playwright，維持純 curl + regex
- 不修改 `etf_stock_overlap` 現有欄位結構（`consensus_buy_count/sell_count` 已由 etf-consensus-direction spec 定義）

## Capabilities

### New Capabilities

- `moneydj-etf-scraper`: MoneyDJ Basic0007B HTML 爬蟲，以 curl 抓取並解析全部持股，作為 pocket source ETF 的穩定 fallback
- `etf-divergence-detection`: 跨 ETF 分歧偵測，識別同日同股票買賣方向相反的 ETF 對，結果存入 `etf_stock_divergence` 表並於前端共識頁面展示

### Modified Capabilities

- `etf-consensus-direction`: 前端共識頁面新增「分歧」分頁，讀取 `etf_stock_divergence` 資料展示

## Impact

- Affected specs: `moneydj-etf-scraper`（新）、`etf-divergence-detection`（新）、`etf-consensus-direction`（修改）
- Affected code:
  - New: `ETF/scrapers/moneydj_scraper.py`, `ETF/pipeline/steps/divergence_detect_step.py`, `supabase/migrations/<timestamp>_add_etf_stock_divergence.sql`
  - Modified: `ETF/scrapers/unified_scraper.py`, `ETF/pipeline/steps/multi_etf_step.py`, `ETF/pipeline/orchestrator.py`, `src/app/investment/consensus/page.tsx`
  - Removed: (none)
