## Why

本專案的籌碼視角目前只有「投信買超」（fund_momentum）與「集保股權分散」（retail_sentiment，週頻），缺三塊 TW_Active_Tracker 已驗證有效的大盤擇時輔助資料：期貨籌碼（三大法人期貨部位與小台/微台散戶多空比，日頻情緒指標）、融資融券餘額（市場槓桿水位）、以及個股級的「雙法人同買/法人分歧」清單（外資＋投信同步動作是強訊號，與既有 ETF 加碼交叉比對價值高）。

## What Changes

- 新增 TAIFEX 期貨籌碼同步：三大法人台指期／小台／微台未平倉部位（TAIFEX futContractsDate 端點，TW_Active_Tracker 已驗證），並推導小台/微台散戶多空比，寫入 `futures_institutional_daily`
- 新增市場融資融券指標：TWSE MI_MARGN 融資/融券餘額與日變化，寫入 `market_margin_daily`
- 新增個股三大法人買賣超同步：TWSE T86 ＋ TPEx 等價端點（走公開 API，不吃 FinLab 配額），全市場個股外資/投信/自營日淨額，寫入 `institutional_stock_daily`（90 天滾動保留）
- 新增法人訊號計算：雙法人同買（外資＋投信同日淨買超）、法人連買（≥3 日）、法人分歧（外資買投信賣或反向），每日清單寫入 `institutional_signals`，並與 ETF 當日加碼（etf_diff_logs）交叉標記
- 新增每日 pipeline 輔助步驟 `market_chips_step`（失敗只 log 不中斷）
- 新增前端頁 `/investment/market-chips`：期貨法人部位走勢、散戶多空比、融資融券趨勢、雙法人同買/分歧清單（含 ETF 加碼交叉標記）

## Capabilities

### New Capabilities

- `futures-chips-sync`: TAIFEX 三大法人期貨部位與小台/微台散戶多空比日同步
- `margin-trading-indicator`: 市場融資融券餘額日序列
- `institutional-buy-signals`: 個股級三大法人日資料同步與雙法人同買/連買/分歧訊號計算（含 ETF 加碼交叉標記）
- `market-chips-page`: 前端市場籌碼儀表板頁

### Modified Capabilities

（無現有 spec 需修改）

## Impact

- Affected specs: futures-chips-sync（新）、margin-trading-indicator（新）、institutional-buy-signals（新）、market-chips-page（新）
- Affected code:
  - New:
    - ETF/scrapers/taifex_scraper.py
    - ETF/scrapers/twse_chips_scraper.py
    - ETF/pipeline/steps/market_chips_step.py
    - supabase/migrations/20260706000021_futures_institutional_daily.sql
    - supabase/migrations/20260706000022_market_margin_daily.sql
    - supabase/migrations/20260706000023_institutional_stock_daily.sql
    - supabase/migrations/20260706000024_institutional_signals.sql
    - src/app/investment/market-chips/page.tsx
    - src/app/actions/getMarketChips.ts
  - Modified:
    - ETF/pipeline/orchestrator.py（掛新輔助步驟）
    - ETF/pipeline/steps/cleanup_step.py（institutional_stock_daily 90 天滾動清理）
    - src/app/investment/page.tsx（入口加連結卡）
  - Removed: （無）
- 外部依賴：TAIFEX（www.taifex.com.tw）、TWSE（www.twse.com.tw）、TPEx 公開端點；皆免費無金鑰，不佔 FinLab 配額
- 參考實作：C:\Users\user\Documents\GitHub\TW_Active_Tracker 的 scripts/update-data.mjs（fetchFuturesContractData、buildMarginTradingIndex、buildDualInstitutionalBuys、buildInstitutionalDivergence、buildConsecutiveInstitutionalBuys）
