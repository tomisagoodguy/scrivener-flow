## Why

籌碼排行圖表視角（`/investment/equity?view=chart&list=big|retail`）目前只顯示前 30 名，使用者想往下瀏覽到前 100 名。現行限制有兩處：前端 `EQUITY_CHART_LIST_LIMIT` 截斷為 30，且每日 pipeline 只替 1 週視角的前 30 名同步裸K快照，2–4 週視角的股票常因沒有快照而畫不出圖。

## What Changes

- 「主力買進」「散戶減少」兩份圖表清單上限由 30 改為 100；「雙訊號」維持最多 10 檔。
- 圖表視角改為逐檔按需載入裸K快照（沿用選股池圖表頁的 `LazyBareKSlide`：段落連續停留在視窗內 300ms 才請求、一生只請求一次），頁面不再於 Server 端一次嵌入全部快照。
- 清單超過 30 檔時隱藏跳轉點（與選股池圖表頁相同），改靠子導覽列的上一檔／下一檔。
- `SyncBareKStep` 的籌碼排行名單由「只重現 1 週視角、各取前 30」改為「重現 1–4 週視角（不分級距、預設排序），每週雙訊號前 10、主力買進前 100、散戶減少前 100」，串接去重。
- 實測（2026-10-31 Supabase 查詢）：1–4 週前 100 去重共 241 檔，其中 107 檔目前沒有裸K快照；每日同步由 250 檔增為約 357 檔，仍低於 `MAX_STOCKS`（400）。以 `compute_snapshot` 約 5.2 秒／檔（既有實測值）估計，pipeline 約多 9 分鐘；實際增量以下一次 GitHub Actions 的 Sync BareK Snapshots 步驟耗時確認。

## Non-Goals (optional)

（見 design.md 的 Goals / Non-Goals。）

## Capabilities

### New Capabilities

（無）

### Modified Capabilities

- `equity-ranking-chart-view`: 圖表清單上限 30 → 100；快照改為按需載入、超過 30 檔隱藏跳轉點；`SyncBareKStep` 籌碼排行名單改為重現 1–4 週視角、各清單前 100。

## Impact

- 前端：src/lib/investment/equityChartUtils.ts、src/components/features/investment/equity/EquityChartViewer.tsx、src/app/investment/equity/page.tsx
- 前端測試：src/lib/investment/__tests__/equityChartUtils.test.ts、src/components/features/investment/equity/__tests__/EquityChartViewer.test.tsx
- Pipeline：ETF/pipeline/steps/sync_bare_k_step.py（`EQUITY_LIST_LIMIT`、新增 `EQUITY_MAX_WEEKS`、`_fetch_equity_ranking_stocks` 查詢）
- Pipeline 測試：ETF/tests/test_sync_bare_k_step.py
- 每日 GitHub Actions ETF pipeline 執行時間增加（估計約 9 分鐘）；資料表結構不變。
