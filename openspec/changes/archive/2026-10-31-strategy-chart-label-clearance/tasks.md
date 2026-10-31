## 1. 標籤避開 K 棒

- [x] 1.1 在 `src/components/features/investment/BareKTradeLabels.ts` 新增純函式 `labelAnchorY`，`TradeLabelsPaneView.update()` 以 `series.data()` 的 K 棒像素座標計算每個標籤錨點，renderer 依錨點定位並把標籤夾在 pane 內；`createKLinePanel` 有 `holdingMarks` 時 K 線價格軸邊距改為上 0.12、下 0.15（需求：Strategy holding marks on chart；決策：錨點取標籤覆蓋範圍內 K 棒的極值；決策：有持有標記時加大 K 線價格軸邊距）。驗證：`yarn test --testPathPatterns "BareKTradeLabels|BareKHoldingMarks"` 綠燈，含 spec 範例表兩列（40、95）與無覆蓋 K 棒回 null、邊距斷言。
- [x] 1.2 [after: 1.1] 實跑驗證：Playwright 截 `/investment/strategy?view=chart` 的 3189、1815 K 線主圖，確認「買」「賣」不壓任何 K 棒、未超出圖面；`yarn tsc --noEmit`、`yarn eslint` 改動檔通過；結果寫回本任務。
  - 實測紀錄（2026-10-31）：既有 dev server + `uv run --with playwright python -I shot2.py` 截 3189（idx 40）、1815（idx 10）K 線主圖：所有「買」位於覆蓋範圍內最高 K 棒之上、「賣」位於最低 K 棒之下，無標籤壓到 K 棒實體或影線；3189 最高點 1100 附近的「買」與 1815 最右側「賣」皆留在圖內（價格軸邊距上 0.12／下 0.15 生效）；console 無 error。觀察：相鄰日期的兩個「買」彼此部分重疊（1815 10-08 與 10-13），屬 design Non-Goals。
  - `yarn tsc --noEmit` 通過；`yarn eslint` 4 個改動檔 0 error；相關 6 個測試檔 36 tests 全綠。
