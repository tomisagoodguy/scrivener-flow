## 1. 共用元件

- [x] 1.1 建立 `src/components/shared/MilestoneCountdown.tsx`（`'use client'`），接受 `date: string | null | undefined` prop
- [x] 1.2 實作日期差計算邏輯（本地時間午夜基準，避免時區偏移）
- [x] 1.3 實作顏色邏輯：≥7天綠色、3-6天橘色、1-2天紅色、0天紅色今日到期、逾期閃爍紅色
- [x] 1.4 實作顯示文字：「還有 N 天」/「今日到期」/「已逾期 N 天」
- [x] 1.5 date 為 null/undefined 時回傳 null（不渲染）

## 2. 整合 RecentCases

- [x] 2.1 在 `src/components/features/cases/RecentCases.tsx` 的里程碑 chip 下方引入 `MilestoneCountdown`
- [x] 2.2 傳入對應里程碑欄位的 ISO date string（`ms[key]`）

## 3. 整合案件詳情頁

- [x] 3.1 找到 `src/app/cases/[id]/page.tsx` 中里程碑日期的顯示位置
- [x] 3.2 在每個里程碑日期旁套用 `MilestoneCountdown`

## 4. 驗證

- [ ] 4.1 確認 7 天以上、3-6 天、1-2 天、今日、逾期各情境顯示顏色正確
- [ ] 4.2 確認 date 為 null 時不顯示任何標籤
- [ ] 4.3 `yarn build` 無型別錯誤
