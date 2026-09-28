## Why

代書蓋印章完成（買方用印、賣方用印）與「將加班費登打進公司系統」是兩件時間點不同步的事：蓋印章當下不一定會馬上登打加班費，可能事後才處理。目前案件列表沒有任何欄位可以記錄「買方/賣方的加班費是否已登打」，代書只能靠記憶或另外的紙本/群組訊息提醒自己，容易漏登打。

## What Changes

- 在 `/cases` 案件列表的買方欄與賣方欄，各自新增一顆手動勾選鈕，代表「該方加班費是否已登打進公司系統」。
- 買方與賣方各自獨立一個布林狀態（各報一次），勾選狀態與案件里程碑（買方蓋印章、賣方蓋印章待辦）完全獨立，不自動連動、不自動觸發、不因待辦完成而自動打勾或自動清除。
- 勾選狀態純粹由使用者手動點擊切換（未登打 → 已登打，或反向取消）。
- 未勾選（尚未登打）時，該按鈕在畫面上以醒目樣式呈現（例如橘色提示），已勾選（已登打）時以中性/完成樣式呈現，讓代書一眼看出哪些案件的哪一方還沒登打加班費。
- 勾選狀態需寫回資料庫並跨裝置同步（沿用既有 Supabase 資料流模式），刷新頁面或換裝置登入後狀態不遺失。

## Non-Goals (optional)

- 不做「蓋印章完成時自動提醒/自動彈窗」之類的主動通知機制，僅提供被動可見的按鈕狀態。
- 不串接公司內部加班費登打系統或任何自動化登打流程，純粹是代書自己的勾選記錄。
- 不記錄加班費金額、時數或登打時間戳，僅記錄「是/否已登打」布林狀態。
- 不新增獨立的「加班費」頁面或報表，僅在案件列表現有的買方欄、賣方欄呈現。

## Capabilities

### New Capabilities

- `case-overtime-claim-toggle`：案件列表買方/賣方欄位的加班費登打狀態手動勾選與持久化。

### Modified Capabilities

(none)

## Impact

- Affected specs: case-overtime-claim-toggle（新增）
- Affected code:
  - New:
    - supabase/migrations/<timestamp>_add_case_overtime_claimed_flags.sql
    - src/hooks/useOvertimeClaim.ts（Client hook，樂觀更新 + 失敗還原 + 錯誤提示）
  - Modified:
    - src/types/index.ts（`DemoCase` interface 新增 `buyer_overtime_claimed: boolean`、`seller_overtime_claimed: boolean`）
    - src/app/cases/page.tsx（Supabase query 需 select 新增的兩個欄位）
    - src/components/features/cases/case-list/CaseTableRow.tsx（買方欄、賣方欄各自加入勾選鈕 UI 與點擊處理）
    - src/services/caseService.ts（新增 `setOvertimeClaimed` 方法，比照既有 `updateCaseMemo` 風格）
