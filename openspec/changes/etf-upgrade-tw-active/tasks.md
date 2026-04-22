## 1. Phase 1 — ETF 擴增 + 官網 API Backup Scraper

- [ ] 1.1 讀取 `reference/tw-active/tools/etfdaily.py` 的 CATALOG，確認 10 支新增 ETF 的 endpoint 與認證方式
- [ ] 1.2 建立 `ETF/scrapers/official_api_scraper.py`，移植 6 家投信 HTTP client（統一/野村/復華/安聯/群益）
- [ ] 1.3 實作 `fetch_holdings(etf_code, date_str)` 統一介面，回傳 DataFrame (code, name, weight, shares)
- [ ] 1.4 加入錯誤處理：API 異常回傳空 DataFrame，不拋例外
- [ ] 1.5 更新 `ETF/config/etf_registry.py`，新增 10 支 ETF，加入 `source` 欄位（`finlab` / `official_api` / `pocket`）
- [ ] 1.6 更新 `src/lib/investment/etfRegistry.ts`，新增相同 10 支 ETF，加入 `issuer` 欄位，確保顏色不重複
- [ ] 1.7 修改 `MultiEtfStep`，改為動態讀取 `etf_registry.get_all_etf_codes()`，移除硬編碼清單
- [ ] 1.8 修改 `ScrapeStep`，加入備援觸發邏輯：price 空缺率 > 30% 時呼叫 `official_api_scraper`
- [ ] 1.9 本地 dry-run 驗證：`uv run python ETF/main.py --dry-run`，確認 21 支 ETF 均能取得持股資料

## 2. Phase 2 — AUM 規模儀表板

- [ ] 2.1 建立 migration `supabase/migrations/<timestamp>_add_etf_aum_series.sql`，建立 `etf_aum_series` 表（etf_code, data_date, aum_100m, nav, units, inflow_100m，PK 為兩欄組合）
- [ ] 2.2 建立 `ETF/pipeline/steps/aum_sync_step.py`，計算 NAV × units = AUM，inflow = AUM 日差 - 價格貢獻，寫入 `etf_aum_series`
- [ ] 2.3 在 `orchestrator.py` 的 `MultiEtfStep` 之後插入 `AumSyncStep`；確認為輔助步驟（失敗不中斷）
- [ ] 2.4 建立一次性 backfill 腳本 `ETF/scripts/backfill_aum_from_twactive.py`，解析 `reference/tw-active/site/preview/scale.json` 並批次寫入歷史資料
- [ ] 2.5 執行 backfill，確認 21 支 ETF 的 2025-05 至今資料寫入正確
- [ ] 2.6 建立 `src/components/features/investment/AumScalePanel.tsx`，實作表格（代號、名稱、天數、AUM 倍數、累計申購、申購占成長比、sparkline）
- [ ] 2.7 實作展開列：發行商、最高申購/贖回日、NAV、流通單位、AUM 折線圖
- [ ] 2.8 實作「申購占成長比」顏色規則（> 0.7 紅警示，< 0.3 綠正向）與 tooltip 說明文字
- [ ] 2.9 在 `/investment/compare` 頁面新增「規模分析」Tab，掛入 `AumScalePanel`
- [ ] 2.10 前端驗證：欄位排序、展開/收合、顏色顯示均正常

## 3. Phase 3 — 進階訊號偵測

- [ ] 3.1 建立 migration `supabase/migrations/<timestamp>_add_etf_signals.sql`，建立 `etf_signals` 表（含 JSONB 欄位 `etf_codes`, `metadata`，INDEX 在 `signal_type, data_date`）
- [ ] 3.2 建立 `ETF/pipeline/steps/signal_detect_step.py`，實作 3 種 Phase 1 訊號：`multi_fund_consensus`、`single_fund_overweight`、`cross_product_accumulation`
- [ ] 3.3 各訊號以 `(signal_type, stock_code, data_date)` 為鍵 upsert，避免重複
- [ ] 3.4 在 `orchestrator.py` 的 `OverlapComputeStep` 之後插入 `SignalDetectStep`；確認為輔助步驟
- [ ] 3.5 建立 `src/components/features/investment/SignalBadge.tsx`，依 strength 顯示顏色（1=灰、2=橙、3=紅）
- [ ] 3.6 在選股池 `/investment` 的股票列表加入訊號欄位，顯示最高 strength 的 `SignalBadge`
- [ ] 3.7 實作 hover tooltip：展開所有訊號類型 + 「此為參考指標，非投資建議」說明
- [ ] 3.8 前端驗證：有訊號的股票正確顯示徽章，無訊號的列空白

## 4. Phase 4 — 持股比重 + 股價雙軸疊圖

- [ ] 4.1 建立 `src/components/features/investment/HoldingsPriceOverlayChart.tsx`，使用 Lightweight Charts 實作雙軸折線圖
- [ ] 4.2 左軸（紫色）= 持股比重 %（來源：`etf_weight_history`），右軸（灰色細線）= 股價 NT$（來源：`stock_prices_daily`）
- [ ] 4.3 實作前端 merge：以 `data_date` 為 key join 兩組資料；股價缺漏日期斷線不填補
- [ ] 4.4 加入時間區間切換按鈕（30D / 60D / 90D）
- [ ] 4.5 加入資料不足降級處理：< 7 天顯示「歷史資料不足」提示
- [ ] 4.6 在 `/investment/[etf]` 深潛頁的「持股明細」Tab 加入個股點擊事件，點擊後顯示 `HoldingsPriceOverlayChart`
- [ ] 4.7 前端驗證：雙軸標籤清楚、時間區間切換正常、非交易日斷線正確

## 5. 收尾

- [ ] 5.1 commit `.gitmodules` 的 submodule pin 更新，確保 reference/tw-active 鎖在穩定 commit
- [ ] 5.2 更新 `ETF/CLAUDE.md`，新增「官網 API 備援」和「AumSyncStep」架構說明
- [ ] 5.3 CI workflow (`etf_daily.yml`) 確認 21 支 ETF 不超過 FinLab 5GB/天配額限制
- [ ] 5.4 線上驗證：deploy 後確認 `/investment`、`/investment/[etf]`、`/investment/compare` 三頁面正常
