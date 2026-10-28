## Why

籌碼排行榜（/investment/equity）只有表格，想看主力買進股的 K 線得逐檔點進裸K頁。策略選股中心已有 ?view=chart 連續捲動圖表，籌碼排行應提供同樣體驗。但 2026-10-22 實測，籌碼排行股票多數沒有裸K快照（雙訊號 10 檔僅 4 檔、主力買進 218 檔僅 60 檔、散戶減少 272 檔僅 64 檔有近 7 天快照），只做前端會滿版「尚未同步」，因此 Pipeline 同步名單必須一併納入。

## What Changes

- 籌碼排行頁新增「排行 / 圖表」視角切換，圖表視角網址為 `/investment/equity?view=chart`。
- 圖表視角可用 `list` 參數切換三個清單：雙訊號（`double`，預設）、主力買進（`big`）、散戶減少（`retail`）；清單內容與順序沿用目前 `tier` / `weeks` / `sort` 的排行結果，主力買進與散戶減少各取前 30 名。
- 圖表沿用策略頁的 `ScrollChartViewer` + `BareKSlideContent`，每檔標題附「大戶 +x.xxpp・股東 -y.yy%」籌碼脈絡，標籤顯示持有該股的 E 經理人 ETF 代號。
- `TierNav` / `WeekNav` 切換時保留 `view` 與 `list` 參數，不會跳回表格視角。
- `SyncBareKStep` 在自選股 → 策略股 → 同步加碼股之後，追加籌碼排行預設視角（1 週、不分級距）的雙訊號前 10、主力買進前 30、散戶減少前 30，去重後仍受 `MAX_STOCKS`（200）上限約束，排在最後、最先被截斷。

## Capabilities

### New Capabilities

- `equity-ranking-chart-view`: 籌碼排行頁的圖表視角（視角切換、三清單切換、捲動裸K圖表、籌碼脈絡標題），以及 Pipeline 把籌碼排行股票納入裸K同步名單。

### Modified Capabilities

(none)

## Impact

- Affected specs: `equity-ranking-chart-view`（新增）
- Affected code:
  - New: src/components/features/investment/equity/EquityChartViewer.tsx
  - New: src/components/features/investment/equity/EquityViewNav.tsx
  - New: src/lib/investment/equityChartUtils.ts
  - New: src/lib/investment/__tests__/equityChartUtils.test.ts
  - New: src/components/features/investment/equity/__tests__/EquityChartViewer.test.tsx
  - Modified: src/app/investment/equity/page.tsx
  - Modified: src/components/features/investment/equity/TierNav.tsx
  - Modified: src/components/features/investment/equity/WeekNav.tsx
  - Modified: ETF/pipeline/steps/sync_bare_k_step.py
  - Modified: ETF/tests/test_sync_bare_k_step.py
- Pipeline 成本：每日裸K同步最多多約 70 支（實際因與自選/策略股重疊會更少），以 compute_snapshot 約 5.2 秒/支估算，最壞多約 6 分鐘。
