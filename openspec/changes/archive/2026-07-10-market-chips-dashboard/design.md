## Context

TW_Active_Tracker 已驗證四條公開資料線：TAIFEX futContractsDate（三大法人期貨契約未平倉）、TAIFEX 全市場 OI、TWSE MI_MARGN（融資融券）、TWSE T86／TPEx 法人日買賣超。本專案 pipeline 已有 35 個 steps 與「輔助步驟失敗不中斷」慣例（如 disposal_detect、retail_sentiment），以及 cleanup_step 做滾動清理。FinLab 有 5GB/天配額壓力（見 finlab-quota-guard spec），故本 change 全部走免費公開端點。

## Goals / Non-Goals

**Goals:**

- 期貨籌碼、融資融券、個股法人買賣超三條資料線落地 Supabase，日頻自動更新
- 雙法人同買/連買/分歧訊號每日產出，並與 ETF 加碼交叉標記
- 一頁式市場籌碼儀表板

**Non-Goals:**

- 不做選擇權籌碼（put/call ratio 等，後續 change）
- 不做券商分點勝率雷達（另屬規格路線圖獨立項目）
- 不做法人訊號的 LINE 推播
- 不做個股頁面的法人籌碼區塊改版（既有 chips API route 不動）
- 不回補超過 90 天的個股法人歷史（訊號只需近期窗口）

## Decisions

1. **全走公開端點、不吃 FinLab 配額**：TAIFEX/TWSE/TPEx 端點免費且 TW_Active_Tracker 實證穩定；FinLab 配額留給既有用途。替代方案「FinLab 法人資料集」被否決：配額壓力 + 端點已被參考專案驗證。
2. **個股法人日資料存 90 天滾動**：全市場約 2000 檔 × 每日一列，全量長存增長快；訊號（連買 ≥3 日、分歧）只需近期窗口。清理掛進既有 `cleanup_step`。訊號結果表 `institutional_signals` 長存（每日僅數十列）。
3. **散戶多空比公式**：散戶未平倉 = 全市場 OI − 三大法人 OI；散戶多空比 =（散戶多單 − 散戶空單）/ 全市場 OI × 100。只對小台（MXF）與微台（TMF）計算——大台散戶佔比低無意義。此為市場慣用定義，與 TW_Active_Tracker 一致。
4. **訊號計算放 Python step 不放前端**：清單類訊號（同買/分歧/連買）屬「當日事實」，算一次存表，前端只讀；避免前端每次載入掃 2000 檔 × 90 天。ETF 交叉標記在計算時 JOIN `etf_diff_logs` 當日 BUY/IN 完成。
5. **單一 step 涵蓋三條線**：`market_chips_step` 內部依序跑期貨→融資融券→個股法人→訊號，各段獨立 try（一段失敗不影響其他段），比開三個 step 省 orchestrator 噪音；段級錯誤記 log 並在 step 摘要呈現。

## Implementation Contract

**資料表（4 張 migration，RLS 均比照既有投資表：authenticated 讀、service role 寫）**

- `futures_institutional_daily`: (data_date date, contract text check in ('TX','MXF','TMF'), institution text check in ('dealer','trust','foreign'), long_oi int, short_oi int, net_oi int, market_oi int NULL, retail_ls_ratio numeric NULL, UNIQUE(data_date, contract, institution))；retail_ls_ratio 只在 institution='foreign' 之外另存彙總列不好——改為：散戶多空比存於 contract 層彙總列（institution='retail_summary'，long_oi/short_oi 為推導散戶值）
- `market_margin_daily`: (data_date date PK, margin_balance numeric, margin_change numeric, short_balance numeric, short_change numeric)
- `institutional_stock_daily`: (data_date date, stock_code text, foreign_net bigint, trust_net bigint, dealer_net bigint, UNIQUE(data_date, stock_code))
- `institutional_signals`: (data_date date, signal_type text check in ('dual_buy','consecutive_buy','divergence'), stock_code text, metadata jsonb, etf_cross boolean, UNIQUE(data_date, signal_type, stock_code))

**同步行為（market_chips_step，輔助步驟）**

- 期貨段：抓當日 futContractsDate 三契約 × 三法人 + 全市場 OI，寫 9 列法人 + 2 列散戶彙總（MXF/TMF）；非交易日由既有 check_trade_date 前置早退涵蓋
- 融資融券段：抓 MI_MARGN 當日市場合計，寫 1 列
- 個股法人段：抓 T86（上市）與 TPEx 等價端點（上櫃），upsert 全市場個股淨額
- 訊號段：dual_buy = foreign_net > 0 且 trust_net > 0；consecutive_buy = foreign_net+trust_net 合計連續 ≥3 日 > 0；divergence = foreign_net 與 trust_net 一正一負且兩者絕對值皆進當日前 50 大；每筆訊號 JOIN 當日 `etf_diff_logs`（BUY/IN）設 etf_cross
- 各段獨立 try/except，段錯誤記 log 並繼續下一段；全部段失敗時 step 標記失敗（輔助語義，不中斷 pipeline）

**前端（/investment/market-chips，Server Component + .glass-card）**

- 區塊一：三大法人台指期淨部位走勢（近 60 日，三法人三線）
- 區塊二：小台/微台散戶多空比走勢（近 60 日，0 軸參考線）
- 區塊三：融資融券餘額走勢（近 60 日雙線）
- 區塊四：當日訊號清單三 Tab（雙法人同買/連買/分歧），etf_cross 者帶「ETF 同步加碼」徽章並連結個股頁；台股紅漲綠跌
- 資料走 Server Action `getMarketChips()`（server client、型別 export、禁 any）

**驗收條件**

- `uv run pytest ETF/` 綠燈：三個 parser 各有 fixture 測試；散戶多空比與三種訊號判定各至少一正例一反例
- 抽查：任一交易日的散戶多空比與期交所公佈值手算一致；dual_buy 清單與 TWSE 網站 T86 抽 3 檔核對
- `yarn tsc --noEmit` 綠燈；本地實跑 `/investment/market-chips` 四區塊渲染
- 連跑兩次 step，四表筆數不變（冪等）

**範圍邊界**

- In scope：4 表、2 scraper、1 step、cleanup 擴充、1 頁、1 Server Action、入口連結
- Out of scope：選擇權籌碼、分點勝率、推播、個股頁改版、90 天以上歷史回補

## Risks / Trade-offs

- [TAIFEX/TWSE 端點格式變動] → parser fixture 測試鎖格式；段級錯誤進 step 摘要，配合既有 CI 失敗通知
- [T86 全市場資料量（約 2000 列/日）] → 90 天滾動清理 + 批次 upsert（沿用 sql_storage chunk_size 3000 慣例）
- [假日/補班日期貨與現貨開市不一致] → 各段以來源回應為準：來源無當日資料則該段跳過記 log，不寫空列
- [散戶多空比對大台無意義被誤讀] → 只算 MXF/TMF，前端不提供大台散戶選項

## Migration Plan

1. 套用 4 張 migration
2. 部署 pipeline（orchestrator 掛 `market_chips_step` 於 retail_sentiment_step 之後、notify_step 之前；cleanup_step 加清理）
3. 手動觸發一次當日同步驗證四表
4. 部署前端頁與入口連結

## Open Questions

- TPEx 上櫃法人端點與 T86 欄位對齊細節（實作時以 TW_Active_Tracker 的 fetchTpexInstitutionalDaily 轉換邏輯為參考基準）
