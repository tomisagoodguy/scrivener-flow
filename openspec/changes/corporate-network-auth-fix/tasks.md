## 1. 資料庫 — 新增 drive_upload_sessions 表

- [x] 1.1 在 Supabase Dashboard 執行 SQL：建立 `drive_upload_sessions` 表（`id uuid PK`、`user_id uuid`、`upload_url text`、`file_name text`、`expires_at timestamptz`、`created_at timestamptz`）
- [x] 1.2 設定 RLS：啟用 RLS，新增 policy 讓 `user_id = auth.uid()` 可 SELECT / INSERT / DELETE

## 2. 後端 — 初始化 Resumable Upload Session

- [x] 2.1 新增 `src/app/api/drive/init-resumable/route.ts`
- [x] 2.2 實作 `POST` handler：驗證 session、呼叫 `getAccessToken()`、呼叫 `getOrCreateDriveFolder()` 取得資料夾 ID
- [x] 2.3 呼叫 Google Drive API 申請 Resumable Upload URL（`POST googleapis.com/upload/drive/v3/files?uploadType=resumable`）
- [x] 2.4 將 `{ sessionId, uploadUrl, userId, expiresAt: +24h }` upsert 至 `drive_upload_sessions`
- [x] 2.5 回傳 `{ sessionId }`

## 3. 後端 — 分塊代理上傳

- [x] 3.1 新增 `src/app/api/drive/upload-chunk/route.ts`
- [x] 3.2 實作 `PUT` handler：驗證 session、從 DB 查 `sessionId`（確認 `user_id` 符合且未過期）
- [x] 3.3 將 `chunkBase64` 解碼為 Buffer，組 `Content-Range: bytes {rangeStart}-{rangeEnd}/{totalSize}` header
- [x] 3.4 轉發至 Google Resumable Upload URL
- [x] 3.5 若 Google 回 `200/201`（最後一塊完成）：呼叫 `getDriveFileDetails()` 取 `webViewLink`，刪除 DB session 記錄，回傳 `{ status: "complete", webViewLink, fileId, fileName }`
- [x] 3.6 若 Google 回 `308`（中間塊）：回傳 `{ status: "incomplete", receivedBytes }`
- [x] 3.7 加入錯誤處理：session 不存在 → 404、user 不符 → 403、Google 回 4xx → 500 + 錯誤訊息

## 4. 前端 — 更新 GoogleDriveUpload 元件

- [x] 4.1 讀取 `src/components/features/cases/GoogleDriveUpload.tsx` 現有邏輯
- [x] 4.2 新增 `uploadLargeFile()` 函式：呼叫 `init-resumable` 取得 sessionId，將檔案以 3MB 分塊循序 PUT 至 `upload-chunk`
- [x] 4.3 更新進度顯示：改為 `已上傳塊數 / 總塊數`（百分比計算）
- [x] 4.4 移除 `GoogleDriveService.uploadFile()` 直連呼叫，改走 `uploadLargeFile()`
- [x] 4.5 保留小檔案（< 4MB）走 `/api/drive/secure-upload` 的既有路徑不動

## 5. 前端 — 更新登入頁 UI

- [x] 5.1 讀取 `src/app/login/ModernLogin.tsx`
- [x] 5.2 將 Email OTP 區塊（input + 傳送按鈕）移至 JSX 最上方
- [x] 5.3 將 Google OAuth / Apple 按鈕移至下方（加分隔線「或使用社群帳號」）
- [x] 5.4 在頁面頂部加入提示文字：「公司或企業網路環境，請輸入 Email 使用 Magic Link 登入」（淡色小字，不影響主視覺）

## 6. 驗證

- [ ] 6.1 `yarn dev` 啟動，測試 Email OTP 登入流程（傳送驗證信 → 點擊連結 → 登入成功）
- [ ] 6.2 上傳 < 4MB 檔案，確認走 `/api/drive/secure-upload`（DevTools Network 確認）
- [ ] 6.3 上傳 ≥ 4MB 檔案，確認走 `init-resumable` + `upload-chunk`（無 direct googleapis.com 請求）
- [ ] 6.4 DevTools → Network → Block `googleapis.com`，重新測試上傳，確認不報錯
- [ ] 6.5 `yarn build` 確認無 TypeScript 錯誤
