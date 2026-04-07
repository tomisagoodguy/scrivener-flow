## 1. 計算邏輯

- [x] 1.1 在 `EtfWeightHistoryChartInner` 中，從 `data` 派生每個 ETF 的最新值（取陣列最後一筆）
- [x] 1.2 計算前一期差值：排名用整數差，權重用浮點差（閾值 rank ≥ 1、weight ≥ 0.05）
- [x] 1.3 決定趨勢方向：rank 變小為 ↑（升）、weight 變大為 ↑（升），否則 ↓ 或 →

## 2. 摘要卡片元件

- [x] 2.1 在 `EtfWeightHistoryChart.tsx` 內新增 `EtfSummaryCard` 子元件（不建新檔）
- [x] 2.2 卡片顯示：ETF 代碼、ETF 縮短名稱（如「統一台股增長」去掉代碼前綴）
- [x] 2.3 卡片顯示：根據 `viewMode` 切換最新排名（`#N`）或最新權重（`N.NN%`）
- [x] 2.4 卡片顯示：趨勢 icon（↑ / ↓ / →）與變化量，套用對應顏色（綠/紅/灰）
- [x] 2.5 卡片左側加 4px border，顏色使用 `ETF_CONFIG[etfCode].color`

## 3. 整合進圖表元件

- [x] 3.1 在 `EtfWeightHistoryChartInner` 的 JSX 中，於圖表 `div` 上方插入卡片列（`flex flex-wrap gap-2`）
- [x] 3.2 確認 `viewMode` 切換時卡片內容同步更新（直接從 prop 計算，無需額外 state）
- [x] 3.3 確認只有 1 筆資料的 ETF 顯示 `—` 而非錯誤

## 4. 驗證

- [ ] 4.1 瀏覽 `/investment/stock/2383`，確認卡片列正確顯示在圖表上方
- [ ] 4.2 切換「持股排名」↔「權重%」，確認卡片數值同步切換
- [ ] 4.3 確認趨勢方向與顏色正確（↑ 綠、↓ 紅、→ 灰）
- [ ] 4.4 確認無 TypeScript 編譯錯誤（`yarn build` 或 `yarn lint`）
