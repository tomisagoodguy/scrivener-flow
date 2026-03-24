## Context

系統目前的 Google Drive 大檔案上傳（≥4MB）走瀏覽器直連 `googleapis.com`，
Google OAuth 登入需要瀏覽器 redirect 至 `google.com`。
在公司 Fortinet 防火牆環境下，兩者均被攔截。
Vercel 伺服器端對外連線不受防火牆限制，可作為代理層。

## Goals / Non-Goals

**Goals:**
- 公司內網使用者可透過 Email OTP 登入，不依賴 Google OAuth
- 大檔案上傳（≥4MB）全程不需要瀏覽器直連 googleapis.com
- 保持既有功能：Google Drive 檔案仍存在 Drive，不改變儲存位置
- 資料分流邏輯不變：帳號以 Email 識別，user_id 不變

**Non-Goals:**
- 不替換 Supabase Storage（Google Drive 仍為主儲存）
- 不修改 Gemini AI（Server Action，不受影響）
- 不修改 Drive 小檔案路徑（已走伺服器代理）

## Decisions

### 1. 大檔案上傳：Chunked Proxy Upload（而非直接 Multipart）

**選擇**：瀏覽器以 3MB 為一塊循序上傳至 Vercel，Vercel 以 Resumable Upload 轉發至 Google Drive。

**理由**：
- Vercel Serverless 每個 request body 上限 4.5MB，無法一次傳大檔案
- Google Resumable Upload 支援 Range header 分塊，可在伺服器端組合
- 3MB chunk < 4.5MB Vercel 限制，同時 > Google 推薦的最小 chunk（256KB）

**Resumable Session 管理**：
- `/api/drive/init-resumable`：伺服器向 Google 申請 upload session URL，
  存入 Supabase `drive_upload_sessions` 表（含 user_id、TTL 24h）
- `/api/drive/upload-chunk`：接收 chunk + sessionId，查 DB 取得 upload URL，
  以 `Content-Range` header 轉發至 Google

**捨棄的替代方案**：
- 直接改用 Supabase Storage：需改 schema、改 Drive viewer，工作量過大
- 提高 Vercel body limit：Pro Plan 可到 8MB，但仍無法解根本問題

### 2. 登入 UI：調換順序 + 提示文字（而非移除 Google OAuth）

**選擇**：Email OTP 移至上方，Google OAuth 保留於下方。

**理由**：
- 在家或外網使用者習慣 Google OAuth，保留避免困擾
- 只改 JSX 順序與加提示文字，風險極低

## Risks / Trade-offs

| 風險 | 緩解措施 |
|------|---------|
| Resumable Upload URL 過期（Google 預設 7 天） | TTL 存 DB，過期後前端重新呼叫 init-resumable |
| Vercel 30 秒 timeout（大 chunk 上傳時） | chunk 3MB + multipart，理論上 < 5 秒，低風險 |
| DB 寫入 session URL（輕量資料洩露風險） | session URL 僅在 Supabase 內，且綁 user_id RLS |
| 上傳中斷後重試邏輯 | 前端已有 onProgress 機制，可擴充斷點續傳 |

## Migration Plan

1. 新增 Supabase `drive_upload_sessions` 表（含 RLS）
2. 部署兩支新 API route
3. 更新 `GoogleDriveUpload.tsx` 的上傳邏輯
4. 更新 `ModernLogin.tsx` 的 UI 順序
5. Vercel 重部署（無 DB schema migration，只新增表）
6. Rollback：Revert commit 即可還原，無破壞性變更
