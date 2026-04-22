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
- [ ] 3.6 選股池列表加入訊號欄位，有訊號的股票列右側顯示最高 strength 的 `SignalBadge`

## 4. Phase 4 — Stock Detail Panel

- [ ] 4.1 建立 `src/components/features/investment/StockDetailPanel.tsx`，實作右側 slide-in/out 面板（桌面 480px，手機全螢幕）
- [ ] 4.2 實作面板開關邏輯：點擊個股開啟、ESC/點擊外部/關閉按鈕關閉、切換個股時 fade 過渡不重開面板
- [ ] 4.3 實作面板頂部：股票代號、名稱、現價、漲跌幅（立即顯示，不等 API）
- [ ] 4.4 實作區塊 1「持倉概況」：持有此股的 ETF 列表 + 各自比重 + 週變化箭頭
- [ ] 4.5 建立 `HoldingsPriceOverlayChart.tsx`，以個股為中心的跨 ETF 雙軸疊圖（左軸各 ETF 比重折線，右軸股價）
- [ ] 4.6 將 `HoldingsPriceOverlayChart` 嵌入面板區塊 2，實作 30D/60D/90D 切換
- [ ] 4.7 實作區塊 3「訊號」：查 `etf_signals`，顯示完整訊號卡片；無訊號顯示「今日無特殊訊號」
- [ ] 4.8 實作區塊 4「近期異動」：查 `etf_diff_logs`，顯示最近 20 筆
- [ ] 4.9 實作區塊 5「大戶籌碼」：查 `equity_distribution_stats`，顯示大戶比例 + 週變化
- [ ] 4.10 實作區塊 6「ETF 規模對比」：查 `etf_aum_series`，顯示持有此股各 ETF 的 AUM + 申購占成長比
- [ ] 4.11 各區塊獨立非同步載入，skeleton placeholder；單一區塊失敗顯示「載入失敗」不影響其他區塊
- [ ] 4.12 在 `/investment` 選股池列表綁定點擊事件，觸發 `StockDetailPanel` 開啟
- [ ] 4.13 前端驗證：slide-in/out 動畫、切換個股 fade、ESC 關閉、各區塊 skeleton + 資料顯示正常

## 5. Phase 5 — ETF Portfolio Analytics（深潛頁 6 Tab）

- [ ] 5.1 建立 migration `supabase/migrations/<timestamp>_add_etf_position_summary.sql`，建立 `etf_position_summary` 表（etf_code, stock_code, entry_date, entry_price, exit_date, exit_price, latest_weight, active_days, status, realized_pnl_pct, unrealized_pnl_pct）
- [ ] 5.2 建立 `ETF/pipeline/steps/position_summary_step.py`，實作增量更新：IN 事件建立 active 記錄、OUT 事件關閉為 exited、每日重算 unrealized_pnl
- [ ] 5.3 在 `orchestrator.py` 的 `SignalDetectStep` 之後插入 `PositionSummaryStep`；確認為輔助步驟
- [ ] 5.4 建立 backfill 腳本 `ETF/scripts/backfill_positions.py`，從既有 `etf_diff_logs` 重算歷史 position_summary
- [ ] 5.5 執行 backfill，確認各 ETF 的 active + exited 持倉記錄正確
- [ ] 5.6 重構 `/investment/[etf]` 的 DrilldownTabs 為 6 Tab 結構（目前持股、當日加減碼、歷史軌跡、單股進出場、損益排行、已出清）；Tab 切換以 `?tab=` query string 保留狀態
- [ ] 5.7 實作「目前持股」Tab：持倉列表（排名/代號/名稱/比重/張數/股價/漲跌幅/未實現損益%）；點擊個股觸發 `StockDetailPanel`
- [ ] 5.8 實作「當日加減碼」Tab：三區塊（新建倉/加碼/減碼），各含比重變化數字
- [ ] 5.9 實作「歷史軌跡」Tab：股票選擇器 + 比重折線圖（含持倉期間標示）
- [ ] 5.10 實作「單股進出場」Tab：active 持倉列表（進場日/進場價/當前價/持倉天數/未實現損益%）
- [ ] 5.11 實作「損益排行」Tab：active + exited 合併排序，含篩選器（持倉中/已出清）
- [ ] 5.12 實作「已出清」Tab：exited 列表（進出場日/天數/已實現損益%）+ 頂部匯總統計（出清數/平均天數/平均損益/勝率）
- [ ] 5.13 前端驗證：6 Tab 切換、URL query string 保留、損益色彩（台股慣例：正=紅/負=綠）

## 6. 收尾

- [ ] 6.1 commit `.gitmodules` 的 submodule pin 更新，確保 reference/tw-active 鎖在穩定 commit
- [ ] 6.2 更新 `ETF/CLAUDE.md`，新增官網 API 備援、AumSyncStep、PositionSummaryStep 架構說明
- [ ] 6.3 CI workflow (`etf_daily.yml`) 確認 21 支 ETF 不超過 FinLab 5GB/天配額限制
- [ ] 6.4 線上驗證：deploy 後確認 `/investment`、`/investment/[etf]`、`/investment/compare` 三頁面正常

- [ ] 5.1 commit `.gitmodules` 的 submodule pin 更新，確保 reference/tw-active 鎖在穩定 commit
- [ ] 5.2 更新 `ETF/CLAUDE.md`，新增「官網 API 備援」和「AumSyncStep」架構說明
- [ ] 5.3 CI workflow (`etf_daily.yml`) 確認 21 支 ETF 不超過 FinLab 5GB/天配額限制
