## ADDED Requirements

### Requirement: 初始化 Resumable Upload Session
系統 SHALL 提供 `POST /api/drive/init-resumable` 端點，讓客戶端在大檔案上傳前向 Google 申請 Resumable Upload Session。

#### Scenario: 成功申請 session
- **WHEN** 已驗證的使用者 POST `{ caseId, caseNumber, fileName, mimeType, fileSize }` 至 `/api/drive/init-resumable`
- **THEN** 系統在 Google Drive 建立目標資料夾（若不存在），向 Google 申請 upload session URL，將 `{ sessionId, uploadUrl, userId, expiresAt }` 存入 `drive_upload_sessions` 表，並回傳 `{ sessionId }`

#### Scenario: 未登入時拒絕存取
- **WHEN** 未帶有效 session 的請求呼叫此端點
- **THEN** 回傳 `401 Unauthorized`

---

### Requirement: 分塊代理上傳至 Google Drive
系統 SHALL 提供 `PUT /api/drive/upload-chunk` 端點，接收瀏覽器分塊並透過伺服器轉發至 Google Resumable Upload URL。

#### Scenario: 中間塊上傳成功
- **WHEN** 客戶端 PUT `{ sessionId, chunkBase64, rangeStart, rangeEnd, totalSize }` 且非最後一塊
- **THEN** 系統以正確 `Content-Range` header 將 chunk 轉發至 Google，回傳 `{ status: "incomplete", receivedBytes }`

#### Scenario: 最後一塊上傳完成
- **WHEN** 客戶端上傳最後一塊（`rangeEnd === totalSize - 1`）
- **THEN** Google 回傳檔案資訊，系統回傳 `{ status: "complete", webViewLink, fileId, fileName }`

#### Scenario: sessionId 不存在或過期
- **WHEN** 客戶端帶入不存在或 `expiresAt` 已過的 `sessionId`
- **THEN** 回傳 `404` 並附帶 `{ error: "session_expired" }`，提示前端重新呼叫 init-resumable

#### Scenario: 非 session 擁有者拒絕存取
- **WHEN** 呼叫者的 `userId` 與 session 記錄的 `userId` 不符
- **THEN** 回傳 `403 Forbidden`

---

### Requirement: 前端改用分塊代理路徑上傳所有檔案
`GoogleDriveUpload` 元件 SHALL 將所有檔案（不論大小）改走伺服器代理路徑，移除直連 `googleapis.com` 的程式碼。

#### Scenario: 小檔案（< 4MB）繼續走現有加密通道
- **WHEN** 使用者選擇小於 4MB 的檔案
- **THEN** 元件走既有 `/api/drive/secure-upload` 路徑，行為不變

#### Scenario: 大檔案（≥ 4MB）走分塊代理上傳
- **WHEN** 使用者選擇大於等於 4MB 的檔案
- **THEN** 元件呼叫 `init-resumable` 取得 sessionId，將檔案以 3MB 為一塊循序 PUT 至 `upload-chunk`，顯示進度（已傳塊數 / 總塊數），完成後取得 `webViewLink`
