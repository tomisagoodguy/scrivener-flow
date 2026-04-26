## 1. Server Action：損益計算核心

- [x] 1.1 建立 `src/app/actions/investmentPnl.ts`，實作 `computeStockPnl(etfCode, stockCode)` — 查 `etf_weight_history` + `stock_prices_daily`，回傳 `{ pnl, pnlPct, mvNow, costBasis, minDate, curve: { date, value }[] }`
- [x] 1.2 實作日期軸對齊邏輯：`close_on_or_before` carry-forward（股價缺值時用前一日收盤）
- [x] 1.3 實作 CF 累計計算：`CF_t = -Δshares × close_t`，`costBasis = Σmax(0,-CF_t)`，`pnl = mvNow + ΣCF`
- [x] 1.4 實作 `getStockManagerPnl(stockCode)` — 查出所有持有此股票的 ETF，`Promise.all` 並行呼叫 `computeStockPnl`，回傳各 ETF 損益陣列
- [x] 1.5 確認 `etf_diff_logs.change_type` 實際值集合（查 DB），決定 ENTRY / ADD / REDUCE / EXIT / CLOSE 的 label 對應

## 2. 元件：損益卡片（ManagerPnlCard）

- [x] 2.1 建立 `src/components/features/investment/ManagerPnlCard.tsx`，顯示四項指標（損益額、報酬率、市值、成本）
- [x] 2.2 損益正負套用台股色彩慣例（`text-rose-600` 漲 / `text-emerald-600` 跌）
- [x] 2.3 整合 Lightweight Charts 折線圖顯示 P&L 曲線，正值區淺紅色填充，負值區淺綠色填充
- [x] 2.4 底部顯示資料起算日免責說明（`損益計算自 YYYY-MM-DD 起`）
- [x] 2.5 處理 N/A 狀態（無收盤價 / 無股數）與 skeleton loading 狀態

## 3. 元件：ETF 單股進出場視圖（EtfStockTradeView）

- [x] 3.1 建立 `src/components/features/investment/EtfStockTradeView.tsx`，左側選股列表 + 右側損益視圖的雙欄佈局
- [x] 3.2 左側清單依報酬率降序排列，每列顯示代號、名稱、報酬率%、目前權重%
- [x] 3.3 右側整合 ManagerPnlCard + 雙軸圖（股數左軸、收盤價右軸）
- [x] 3.4 雙軸圖加碼 / 減碼 / 建倉 / 出清事件圓點標記（對應 `etf_diff_logs` 事件）
- [x] 3.5 事件時間軸列表：日期、類型 badge、Δ 股數、估算投入金額（|Δshares × close|）

## 4. ETF 頁整合

- [x] 4.1 在 `src/app/investment/[etf]/page.tsx` 加入「單股進出場」tab，URL param `?tab=stock-trade`
- [x] 4.2 tab 切換使用 `useSearchParams` + `Suspense` 包裹（避免靜態 build 失敗，見 components.md 規則）
- [x] 4.3 載入 EtfStockTradeView，傳入 `etfCode` + 持倉股票清單

## 5. 個股頁整合

- [x] 5.1 在 `src/app/investment/stock/[code]/page.tsx` 於 ETF 持倉歷史圖表下方加入「經理人損益」區塊
- [x] 5.2 呼叫 `getStockManagerPnl(stockCode)`，以 2 欄 grid 並排顯示各 ETF 的 ManagerPnlCard
- [x] 5.3 無持倉 ETF 時不顯示區塊；載入中顯示 skeleton；失敗顯示 fallback 訊息

## 6. 驗證

- [ ] 6.1 以 2330 台積電驗證個股頁損益數字與 reference preview 頁比對（允許因資料起算日不同有差異）
- [ ] 6.2 以 00981A ETF 頁「單股進出場」tab 驗證選股列表排序、雙軸圖、事件時間軸
- [x] 6.3 `yarn build` 無 TypeScript 錯誤（禁用 `any`，N/A 狀態不崩潰）
