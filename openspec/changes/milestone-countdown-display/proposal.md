## Why

代書在高壓狀態下，看到絕對日期（2026-04-15）還需自行換算剩餘天數，增加認知負擔。
在 UI 同時顯示「日期 + 剩餘天數」並以顏色編碼緊急程度，讓代書一眼判斷優先順序。

## What Changes

- 所有里程碑日期顯示元件新增倒數天數標籤
- 顏色規則：7天+ 綠色、3-7天 橘色、3天內 紅色、逾期閃爍紅色
- 新增可重用的 `MilestoneCountdown` 元件，封裝日期計算與顏色邏輯

## Capabilities

### New Capabilities
- `milestone-countdown`: 里程碑日期旁顯示剩餘/逾期天數，含顏色編碼與逾期閃爍動畫

### Modified Capabilities
（無）

## Impact

- `src/components/features/cases/` 相關里程碑顯示元件（CasesPendingView、RecentCases 等）
- `src/app/cases/[id]/` 案件詳情頁里程碑區塊
- 新增共用元件 `src/components/shared/MilestoneCountdown.tsx`
