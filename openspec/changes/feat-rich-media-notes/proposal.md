# Proposal: 多媒體筆記與附件支援 (Rich Media Notes & Attachments)

## Problem

當前系統的「工作筆記 (Knowledge Base)」與「儀表板速記 (Dashboard Quick Notes)」僅支援純文字與基本格式。使用者無法插入圖片、掃描文件或案件相關照片，這對於代書（地政士）在處理權狀、誊本或現場拍照記錄時非常不便。此外，使用者希望能將這些多媒體資產直接整合進其 Google 帳戶 (<tom890108159@gmail.com>) 的儲存空間中。

## Proposed Change

本功能將擴展筆記系統，支援多媒體資產的「上傳、嵌入與管理」。

1. **RichTextEditor 增強**: 整合 Tiptap Image 擴充，支援拖放上傳圖片。
2. **儀表板速記增強**: 支援附件上傳與預覽清單。
3. **Google Drive 深度整合**:
    - 利用現有的 `GoogleDriveService` 進行檔案上傳。
    - 在 Google Drive 中自動建立 `ScrivenerFlow_Attachments` 專屬資料夾。
    - 取得圖片的 Direct Link 並轉換為可在 HTML 中顯示的格式。
4. **檔案安全性**: 確保所有上傳均通過 Server-side Action 並使用使用者的 Session 權杖。

## Objectives

- 使代書能直接在案號筆記中貼入現況照片或謄本影本。
- 符合使用者對儲存於個人 Google 雲端硬碟的需求。
- 提供直覺的「拖即上傳」體驗。

## Risks & Mitigations

- **圖片載入問題**: Google Drive 預設不提供 Direct Image `src`。
  - *方案*: 使用者已使用 Google 登入，瀏覽器具備權限。我們將使用 `https://drive.google.com/uc?id={ID}&export=view` 格式，或實作一個簡單的 Image Proxy API。
- **儲存配額**: 使用者個人空間可能用盡。
  - *方案*: 在上傳失敗時提供明確的提示訊息。
- **權限失效**: `provider_token` 逾期。
  - *方案*: 實作 Token 刷新偵測，必要時引導使用者重新登入以獲取新 Scopes。
