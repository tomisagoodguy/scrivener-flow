# Tasks: 實作多媒體筆記功能

## 核心基礎建設

- [ ] 驗證並更新 `getAccessToken` 邏輯，確保支援 `Refresh Token` 或明確提示權限不足。
- [ ] 建立 `/api/drive/proxy/[fileId]` 路由，解決 Google Drive 圖片權限與 CORS 問題。
- [ ] 單元測試 `GoogleDriveService.upload` 是否能正確建立資料夾。

## Rich Text Editor (Knowledge Base)

- [ ] 在 `RichTextEditor.tsx` 中啟用 Tiptap `Image` 擴充功能。
- [ ] 實作 `ImageUploadExtension`，攔截貼上 (Paste) 與拖放 (Drop) 事件。
- [ ] 整合上傳進度 UI (Progress UI)，在圖片上傳時顯示 Loading 狀態。
- [ ] 新增工具列圖片上傳按鈕。

## Dashboard Quick Notes

- [ ] 修改 `DashboardQuickNotes.tsx`，將原先的單行/純文字編輯器升級為迷你版 Rich Text 或支援附件附掛。
- [ ] 實作附件預覽組件 `AttachmentGallery`。
- [ ] 實作點擊預覽圖片的全螢幕燈箱 (Lightbox) 效果。

## 資料庫與驗證 (Verify Stage)

- [ ] 確保 `RLS` 規則允許使用者讀取與其 ID 關聯的筆記欄位內容。
- [ ] 驗證在 `tom890108159@gmail.com` 帳戶下的上傳權限完整性。
