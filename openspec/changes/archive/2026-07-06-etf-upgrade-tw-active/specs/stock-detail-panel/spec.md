## ADDED Requirements

### Requirement: Stock Detail Panel 滑出面板

`/investment` 選股池 SHALL 在使用者點擊任一個股後，從右側滑出 `StockDetailPanel`，整合顯示該股所有維度資訊，不跳頁、不開新 tab。

面板寬度：桌面版 480px，手機版全螢幕覆蓋。
關閉方式：點擊面板外區域、ESC 鍵、右上角關閉按鈕。

#### Scenario: 點擊個股開啟面板
- **WHEN** 使用者點擊選股池列表中任一股票列
- **THEN** StockDetailPanel 從右側以 slide-in 動畫出現，顯示該股代號與名稱於面板頂部，背景選股池仍可見且互動

#### Scenario: 面板不跳頁
- **WHEN** StockDetailPanel 開啟
- **THEN** URL 不變更（不做 route push），瀏覽器返回鍵行為不受影響

#### Scenario: 關閉面板
- **WHEN** 使用者按 ESC、點擊面板外部、或點擊關閉按鈕
- **THEN** 面板以 slide-out 動畫收起，選股池回到正常狀態

---

### Requirement: 面板內容 — 6 個區塊

`StockDetailPanel` SHALL 按以下順序顯示 6 個區塊，各區塊獨立載入（skeleton 佔位），不因某區塊載入慢而阻塞整頁。

#### Scenario: 區塊 1 — 持倉概況
- **WHEN** 面板開啟
- **THEN** 顯示「持倉概況」區塊：持有此股的 ETF 清單（各 ETF 代號徽章 + 當前比重 % + 比重週變化箭頭）、合計跨 ETF 持有比重

#### Scenario: 區塊 2 — 跨 ETF 雙軸疊圖
- **WHEN** `etf_weight_history` 資料載入完成
- **THEN** 顯示 `HoldingsPriceOverlayChart`：左軸各 ETF 比重折線（各 ETF 顏色），右軸股價走勢；預設 60D，可切換 30D/90D

#### Scenario: 區塊 3 — 訊號
- **WHEN** `etf_signals` 資料載入完成
- **THEN** 顯示當日所有訊號（signal_type 名稱、strength 顏色標示、觸發說明）；無訊號時顯示「今日無特殊訊號」

#### Scenario: 區塊 4 — 近期異動
- **WHEN** `etf_diff_logs` 資料載入完成
- **THEN** 顯示此股最近 20 筆異動記錄（ETF 代號、異動類型 IN/OUT/BUY/SELL、日期、比重變化）

#### Scenario: 區塊 5 — 大戶籌碼
- **WHEN** `equity_distribution_stats` 資料載入完成
- **THEN** 顯示最新一期大戶（400張+）持股比例 + 週變化；有 💎 積累訊號時以玫瑰色標示

#### Scenario: 區塊 6 — 持有此股的 ETF 規模對比
- **WHEN** `etf_aum_series` 資料載入完成
- **THEN** 顯示持有此股各 ETF 的當前 AUM（億）+ 申購占成長比，方便判斷哪個 ETF 的持倉更「真實」

---

### Requirement: 面板載入效能

各區塊 SHALL 獨立非同步載入，使用 skeleton placeholder，不因單一區塊慢而阻塞整個面板。

#### Scenario: 資料尚未載入時
- **WHEN** StockDetailPanel 剛開啟，API 尚未回應
- **THEN** 各區塊顯示 skeleton（灰色動畫佔位），面板頂部股票代號與名稱立即顯示（不需等待）

#### Scenario: 某區塊載入失敗
- **WHEN** 某一區塊的資料 fetch 失敗
- **THEN** 該區塊顯示「載入失敗，請重試」，其他區塊不受影響、正常顯示

---

### Requirement: 面板與選股池的互動

`StockDetailPanel` 開啟時，選股池列表 SHALL 保持可操作，支援連續切換個股。

#### Scenario: 切換到另一支股票
- **WHEN** StockDetailPanel 已開啟，使用者點擊列表中另一支股票
- **THEN** 面板內容切換為新股票資料，不重新 slide-out/slide-in，以 fade 過渡更新內容
