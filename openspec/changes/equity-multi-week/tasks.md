## 1. 資料層

- [x] 1.1 `equityPageData.ts`：`fetchRankingData()` 新增 `weeks: 1|2|3|4` 參數
- [x] 1.2 實作「查詢 N 期前快照」邏輯：先取所有不重複 `snapshot_date`（降序），找出 `index = weeks` 的那期
- [x] 1.3 當 DB 期數不足 `weeks` 時，回傳 `insufficientData: true` 標記
- [x] 1.4 多週模式下，動態計算 `pct_change_nw = current_pct - old_pct`，並在應用層依此排序（與現有 `it_buy_5d` 排序同模式）
- [x] 1.5 `RankingData` interface 新增 `weeks`、`dateRange: { from: string; to: string }`、`insufficientData?: boolean` 欄位

## 2. 頁面層

- [x] 2.1 `equity/page.tsx`：讀取 `weeks` URL param（驗證為 `1|2|3|4`，否則預設 1），傳入 `fetchRankingData()`
- [x] 2.2 將 `weeks` 傳入新的 `WeekNav` 元件

## 3. UI 元件

- [x] 3.1 建立 `WeekNav.tsx`（`src/components/features/investment/equity/`），1/2/3/4 週切換 tabs，樣式與 `TierNav` 一致
- [x] 3.2 `WeekNav` 接收 `weeks`、`dateRange`、`tier`（保留 tier param），產生正確的 `href`
- [x] 3.3 `WeekNav` 顯示日期區間標記（`04/24 → 05/08`）
- [x] 3.4 `equity/page.tsx` 在 `TierNav` 下方加入 `WeekNav`
- [x] 3.5 資料不足時顯示提示訊息（替代排行榜區塊）
