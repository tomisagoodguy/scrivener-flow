## Why

籌碼排行榜目前只顯示「上週 vs 本週」的單週變化，無法觀察大戶是否持續加碼。aistockmap.com 的「大戶加碼股」功能提供 1/2/3/4 週時間窗口，讓用戶看到中期籌碼趨勢；我們的系統 DB 已累積多期快照，具備實現此功能的條件。

## What Changes

- 新增 `weeks` URL 參數（1/2/3/4），預設 1
- `fetchRankingData()` 根據 `weeks` 動態計算多週期大戶持股變化（current_pct - pct_N_weeks_ago）
- 新增週數切換 UI 元件（類似 `TierNav`），顯示對應日期區間（e.g. 04/24 → 05/08）
- 現有 1 週排行榜行為維持不變（backward compatible）

## Capabilities

### New Capabilities
- `equity-multi-week-filter`: 籌碼排行榜多週時間窗口篩選，支援 1/2/3/4 週切換，動態計算跨期大戶持股比例變化

### Modified Capabilities
（無 spec-level 行為變更，僅新增功能）

## Impact

- `src/lib/investment/equityPageData.ts` — `fetchRankingData()` 接收 `weeks: 1|2|3|4`，新增查詢 N 期前快照的邏輯
- `src/app/investment/equity/page.tsx` — 接收 `weeks` URL param，傳入 `fetchRankingData()`
- 新元件 `src/components/features/investment/equity/WeekNav.tsx` — 週數切換 tabs
- `equity_distribution_stats` — 無 schema 變更，利用現有多期快照資料
- `sync_equity_distribution.py` — 無需修改
