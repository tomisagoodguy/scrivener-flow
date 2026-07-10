## 1. Schema

- [x] 1.1 建立 4 張 migration：`supabase/migrations/20260706000021_futures_institutional_daily.sql`、`20260706000022_market_margin_daily.sql`、`20260706000023_institutional_stock_daily.sql`、`20260706000024_institutional_signals.sql`，欄位/UNIQUE 鍵/check 約束依 design contract，RLS 比照既有投資表。完成標準：本地套用成功且約束齊全

## 2. 爬蟲層

- [x] 2.1 [P] 實作 `ETF/scrapers/taifex_scraper.py`：抓 futContractsDate 三契約 × 三法人未平倉與全市場 OI（端點與轉換參考 TW_Active_Tracker scripts/update-data.mjs 的 fetchFuturesContractData）；來源無當日資料回傳空清單不報錯。完成標準：fixture 測試綠燈 + 對最近交易日實抓回傳 9 筆法人資料（實作 spec Requirement: Futures institutional positions sync 的爬蟲部分）
- [x] 2.2 [P] 實作 `ETF/scrapers/twse_chips_scraper.py`：`fetch_margin(date)` 抓 MI_MARGN 市場合計、`fetch_institutional(date)` 抓 T86（上市）與 TPEx 等價端點（上櫃）個股法人淨額並合併。完成標準：fixture 測試綠燈 + 實抓最近交易日上市與上櫃皆有資料（實作 spec Requirements: Market margin balance series、Per-stock institutional net-buy sync with rolling retention 的爬蟲部分）

## 3. Pipeline 計算層

- [x] 3.1 實作 `ETF/pipeline/steps/market_chips_step.py`（輔助步驟）：四段依序執行（期貨→散戶多空比→融資融券→個股法人→訊號），各段獨立 try、段錯誤記 log 續跑、全段失敗 step 標敗但不中斷 pipeline；期貨段寫 9 法人列 + MXF/TMF 兩筆 retail_summary（多空比公式依 design）；訊號段計算 dual_buy / consecutive_buy(≥3 交易日) / divergence(一正一負且雙方絕對值進當日前 50) 並 JOIN 當日 etf_diff_logs BUY/IN 設 etf_cross、metadata 記淨額。完成標準：pytest 覆蓋多空比運算例、三種訊號各一正例一反例（含「幅度不足不觸發 divergence」「跨週末仍算連續交易日」）；連跑兩次四表筆數不變（實作 spec Requirements: Futures institutional positions sync、Retail long-short ratio for mini contracts、Market margin balance series、Daily institutional signals with ETF cross-marking）
- [x] 3.2 `orchestrator.py` 掛 `market_chips_step` 於 retail_sentiment_step 之後、notify_step 之前；`cleanup_step.py` 加 `institutional_stock_daily` 90 天滾動刪除（`institutional_signals` 不刪）。完成標準：`--dry-run` 全 pipeline 跑通；cleanup 單元測試驗證只刪 90 天前的 stock_daily（實作 spec Requirement: Per-stock institutional net-buy sync with rolling retention 的保留政策）

## 4. 前端

- [x] 4.1 實作 Server Action `src/app/actions/getMarketChips.ts`：一次回傳期貨部位序列（近 60 交易日）、散戶多空比序列、融資融券序列、當日三類訊號清單；server client、型別 export、禁 any。完成標準：`yarn tsc --noEmit` 綠燈
- [x] 4.2 實作 `/investment/market-chips` 頁（Server Component + .glass-card）：四區塊（台指期三法人淨部位、小台/微台散戶多空比含 0 軸、融資融券雙線、三 Tab 訊號清單），etf_cross 帶「ETF 同步加碼」徽章連個股頁，缺資料區塊顯示明確空狀態，紅漲綠跌配色。完成標準：本地實跑四區塊渲染、徽章連結可導頁（實作 spec Requirements: Market chips dashboard page）
- [x] 4.3 `/investment` 入口頁加「市場籌碼」連結卡。完成標準：點擊導向 `/investment/market-chips`

## 5. 驗證與收尾

- [x] 5.1 資料正確性抽查：任一交易日散戶多空比與期交所公佈值手算一致；dual_buy 清單抽 3 檔與 TWSE T86 網頁核對；結果記錄於 commit message
- [x] 5.2 全面驗證：`uv run ruff check ETF/ && uv run pytest ETF/`、`yarn tsc --noEmit` 全綠；派 fresh agent 實跑 `/investment/market-chips` 截圖確認
- [x] 5.3 更新 `ETF/CLAUDE.md`：新增 market_chips 資料線（端點、四表、90 天保留政策、散戶多空比公式）一節
