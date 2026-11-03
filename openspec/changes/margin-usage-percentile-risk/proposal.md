## Why

持股表的融資使用率目前只顯示原始百分比，並用固定門檻（10／20／40%）上色，但「高不高」其實要看當天全市場的相對位置：2026-10-16 合格股的中位數是 11.3%，前 20% 門檻是 22.4%，門檻會隨市況移動。

以 FinLab 重現 2009-01 至 2026-10-16 的 58 個大盤收盤跌超過 3% 的交易日（實測，腳本與結果見 design.md「驗證依據」）：前一日融資使用率最高 20% 的一組當天平均跌 −5.84%，最低 20% 的一組平均跌 −3.55%，58 天裡有 54 天高融資組跌更重；同一天依市值分三層則幾乎沒有差別（2026-10-15：小 −4.03%、中 −3.53%、大 −3.79%）。所以「這檔是不是當天全市場高融資的前 20%」對大跌時的風險，比市值更有辨識力，值得直接標在持股上。

另外 `StockPoolMetrics` 與 `StockPickerTable` 把 `margin_ratio`（FinLab `margin_transactions:融資使用率`）標成「資券%」，資券比是不同欄位，會誤導判讀。

## What Changes

- ETF pipeline 同步個股日線時，依當日全市場合格股計算融資使用率百分位（0–100），寫入 `stock_prices_daily` 新欄位 `margin_pct_rank`；不合格的股票寫 NULL。合格條件：四碼普通股（首碼非 0）、含當日的 20 日平均成交金額 ≥ 5,000 萬元、當日收盤 ≥ 10 元、當日有融資使用率值。
- 百分位 ≥ 80 視為「高融資前 20%」。ETF 持股表（`HoldingRow`）在融資使用率旁顯示「前20%」標籤，取代原本 10／20／40% 固定門檻的上色。
- ETF 持股頁（`/investment/[etf]`）的概覽加一行高融資曝險摘要：持股中屬高融資前 20% 的檔數與其 ETF 權重合計。
- 自選股頁（`/investment/watch-list`）加同樣的摘要（檔數），並列出無日線資料而無法判斷的檔數。
- 把「資券%」標籤改為「融資使用率」（窄欄縮寫「資使用」維持與持股表一致）。

## Non-Goals

- 不做「大跌隔天買高融資組」的反彈策略：重現結果顯示 20 日優勢集中在 2017 年以後（2009–2016 差 +1.51 個百分點），文章作者也指出控制 beta 後差距不顯著，且途中跌破 −10% 的比例約 45%。
- 不做去槓桿週（上市加上櫃融資餘額 5 日減 >3%）警示：`market_margin_daily` 目前只有上市資料，需另開 change 補上櫃來源。
- 不回補歷史 `margin_pct_rank`：只有新同步的日期會有值，前端只讀最新一筆。
- 不改 `etf_holdings_snapshot` schema；百分位一律從 `stock_prices_daily` 讀，避免兩處各存一份。
- 不改量化策略內既有的 `融資使用率 < 34` 等過濾條件。

## Capabilities

### New Capabilities

- `margin-usage-percentile`: 個股融資使用率的當日全市場百分位計算、儲存，以及持股與自選股頁的高融資標示與曝險摘要

### Modified Capabilities

(none)

## Impact

- Affected specs: margin-usage-percentile（新增）
- Affected code:
  - ETF/services/finlab/ohlcv_service.py（附加 margin_pct_rank 欄位）
  - ETF/database/storage.py（save_prices 寫入新欄位）
  - src/lib/investment/etfPageData.ts（getHoldings 為每檔持股帶出 margin_pct_rank）
  - src/types/investment.ts（Holding 型別加欄位）
  - src/components/features/investment/HoldingRow.tsx（前20% 標籤）
  - src/app/investment/[etf]/page.tsx（掛載曝險摘要元件）
  - src/components/features/investment/StockPoolMetrics.tsx（標籤更正）
  - src/components/features/investment/StockPickerTable.tsx（標籤更正）
  - src/app/investment/watch-list/page.tsx（查詢自選股最新百分位並掛載曝險摘要元件）
- 新增檔案（尚不存在，路徑定義於 design.md）：百分位 Python 純函式模組與 pytest、前端百分位查詢與曝險彙總模組及 Jest 測試、曝險摘要元件、Supabase migration
- 資料庫：`stock_prices_daily` 新增可為 NULL 的 NUMERIC 欄位，不刪改既有欄位
- FinLab 配額：不新增資料集（close、amount、margin_usage 已在同步時載入）
