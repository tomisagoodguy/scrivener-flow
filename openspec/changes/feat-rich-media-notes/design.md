# Design: 多媒體資產架構 (Multimedia Assets Architecture)

## 1. 儲存流 (Storage Flow)

### 上傳流程 (Upload Strategy)

當使用者在 Tiptap 編輯器中上傳圖片，或在速記模組點擊附件按鈕時：

1. **Client**: 觸發上傳事件，檢查檔案大小（限 10MB）。
2. **Server Action**: 使用當前登入使用者的 `provider_token` 調用 `uploadToDrive`。
   - **資產歸屬**: 檔案將直接上傳至 **「該使用者自己」** 的 Google Drive 帳戶。
   - **資料夾管理**: 在使用者的 Google Drive 根目錄自動建立 `ScrivenerFlow_Attachments` 資料夾。
   - 上傳 Multipart 檔案內容。
3. **Response**: 伺服器回傳 `DriveFile` 物件（ID, Name, Link）。
4. **Client UI**:
   - Tiptap: 插入 `<img src="IMAGE_URL" data-drive-id="ID" />`。
   - Quick Notes: 更新 `attachments` 列表中。

## 2. 圖片預覽策略 (Image Preview Strategy)

由於 Google Drive 並非 CDN，直接連結無法保證在所有瀏覽器渲染。我們將採用以下網址格式：
`https://drive.google.com/uc?id={fileId}&export=view`

為了更好的穩定性，若上述網址遭遇 CORS 或權限阻塞，我們將實作一個 API Route：
`/api/drive/view/[fileId]`
該路由會從伺服器端抓取 Google Drive 串流並以正確的 `Content-Type` 轉發。

## 3. UI/UX 規範

### Tiptap Editor

- **Commands**: 增加 `setImage` 指令。
- **Toolbar**: 增加一個 `Image` 按鈕，點擊開啟 `FilePicker`。
- **Drag & Drop**: 實作 `drop` 處理器，自動觸發上傳流並顯示「正在上傳中...」的 Placeholder。

### Quick Notes

- **List View**: 筆記卡片下方顯示帶有檔案圖示的小標籤。
- **Image Gallery**: 點擊圖片附件開啟 `Framer Motion` 驅動的全螢幕預覽模式。

## 4. 資料庫架構變動

`notes` 表（或筆記對象）需要擴充以記錄關聯的附件資訊（若原本是純文字）。
目前筆記存儲在 `knowledge_notes` (KB) 與 `user_settings.scratchpad_content` (Dashboard)。

- **Knowledge Base**: 使用 HTML 存儲，圖片路徑直接嵌入 `src`。
- **Scratchpad**: 目前為純文字存儲，需升級為 HTML 或 JSON 格式以支援圖片。
