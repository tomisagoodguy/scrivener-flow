## 1. 標籤錯開

- [x] 1.1 在 `src/components/features/investment/BareKTradeLabels.ts` 新增純函式 `stackLabelTops`，`TradeLabelsPaneView.update()` 由錨點算初始 top 後呼叫它，`LabelPoint` 改存 top，renderer 直接使用（需求：Strategy holding marks on chart；決策：依時間順序貪婪疊層）。驗證：`yarn test --testPathPatterns BareKTradeLabels` 綠燈，含 spec 範例表五列。
- [x] 1.2 [after: 1.1] 實跑驗證：Playwright 截 `/investment/strategy?view=chart` 的 1815、3189 K 線主圖，確認相鄰「買」上下錯開、不重疊、不壓 K 棒；`yarn tsc --noEmit`、`yarn eslint` 改動檔通過；結果寫回本任務。
  - 實測紀錄（2026-10-31）：自行背景啟動 `yarn dev`（port 3000）後 `uv run --with playwright python -I shot2.py` 截 1815（idx 10）、3189（idx 40）。1815 右側 10-08／10-13 兩個「買」上下錯開一層、不再疊成「]買」；3189 2026-02 附近相鄰兩個「買」同樣錯開；所有標籤不壓 K 棒、留在圖內；console 無 error。
  - `yarn tsc --noEmit` 通過；`yarn eslint` 2 個改動檔 0 error；`yarn test --testPathPatterns "BareKTradeLabels|BareKHoldingMarks|BareKChartPanels"` 22 tests 全綠。
