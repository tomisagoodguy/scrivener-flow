## Why

公司 IT 部門的 Fortinet 防火牆封鎖瀏覽器對 `google.com` / `googleapis.com` 的連線，
導致 Google OAuth 登入與大檔案直連上傳在公司內網完全失效。
Vercel 伺服器端對 Google API 的呼叫不受影響，因此可透過伺服器代理解決。

## What Changes

- **登入頁**（`ModernLogin.tsx`）：Email OTP 區塊移至最上方，Google OAuth 降為次要選項；加入企業網路提示文字
- **大檔案上傳（≥4MB）**：移除瀏覽器直連 `googleapis.com` 的路徑，改為透過兩支新 Server API 進行分塊代理上傳（Chunked Proxy Upload）

## Capabilities

### New Capabilities
- `chunked-drive-proxy`：分塊代理上傳 API，讓大檔案從瀏覽器分塊傳至 Vercel，再由 Vercel 以 Resumable Upload 轉發至 Google Drive，全程不需要瀏覽器直連 googleapis.com

### Modified Capabilities
- `login-ui`：登入 UI 的按鈕順序與提示文字調整（不改變認證邏輯，Supabase Auth 帳號識別以 Email 為準，資料分流不受影響）

## Impact

- **新增**：`src/app/api/drive/init-resumable/route.ts`
- **新增**：`src/app/api/drive/upload-chunk/route.ts`
- **修改**：`src/components/features/cases/GoogleDriveUpload.tsx`
- **修改**：`src/app/login/ModernLogin.tsx`
- **複用**：`src/app/actions/googleDrive.ts` 中的 `getAccessToken()`、`getOrCreateDriveFolder()`
- **不受影響**：Gemini AI（Server Action）、Drive 小檔案（已走 `/api/drive/secure-upload`）、資料 RLS 隔離
