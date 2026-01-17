---
description: 實作 Google 登入與權限控管
---

# 實作 Google 登入與權限控管 (Supabase Auth)

## 背景與目的

### 目的
為網站實作 Google OAuth 登入功能，並透過 Supabase Row Level Security (RLS) 保護資料，防止未授權的修改。

### 項目上下文
- 當前專案使用 Next.js App Router。
- 資料庫為 Supabase (PostgreSQL)。
- 目前依賴包含 `next-auth` (未使用的舊依賴) 和 `@supabase/auth-helpers-nextjs` (已過時)。
- 需要遷移至最新的 `@supabase/ssr` 以獲得最佳 App Router 支援。

### 相關文件
- `package.json` — 需更新依賴
- `src/lib/supabaseClient.ts` — 現有的舊客戶端 (需重構)
- `src/middleware.ts` — 需新增以保護路由

---

## 技術決策記錄

### 已決定（代理選擇）
- **Auth Library**: `@supabase/ssr` — 官方推薦用於 Next.js App Router 的最新標準庫，取代 `auth-helpers`。
- **Auth Pattern**: PKCE Flow — 透過 `auth/callback` 路由處理，適用於 SSR 環境。
- **Middleware**: 使用 Next.js Middleware 保護 `/cases` 等私有路徑。
- **RLS 策略**:
  - `SELECT`: 允許所有登入用戶 (Authenticated) 或特定白名單。
  - `INSERT/UPDATE/DELETE`: 僅允許資料擁有者 (Owner) 或管理員。
  - *初期寬容模式*：如果尚未實作 `user_id` 綁定，先要求「必須登入」才能操作。

---

## 實現計劃

### 1. 依賴與環境設置

**目的**: 清理舊依賴並安裝標準庫。

**執行過程**:
1. 移除 `next-auth`, `@supabase/auth-helpers-nextjs`。
2. 安裝 `@supabase/ssr`。
3. 確保 `.env.local` 包含 `NEXT_PUBLIC_SUPABASE_URL` 和 `NEXT_PUBLIC_SUPABASE_ANON_KEY`。

### 2. 建構 Supabase Utils (`src/utils/supabase/`)

**目的**: 建立不同環境下的 Supabase Client 工廠函數。

**執行過程**:
- 建立 `src/utils/supabase/server.ts`: 使用 `createServerClient` (用於 Server Components/Actions)。
- 建立 `src/utils/supabase/client.ts`: 使用 `createBrowserClient` (用於 Client Components)。
- 建立 `src/utils/supabase/middleware.ts`: 用於 Middleware 的客戶端創建與 Session 管理。

### 3. 用戶登入介面 (`src/app/login/page.tsx`)

**目的**: 提供 Google 登入按鈕。

**執行過程**:
- 建立一個美觀的登入頁面 (使用 Glassmorphism 風格)。
- 包含一個 "Sign in with Google" 按鈕。
- 點擊按鈕呼叫 `supabase.auth.signInWithOAuth`，並設定 `redirectTo` 指向 `/auth/callback`。

### 4. Auth Callback 處理 (`src/app/auth/callback/route.ts`)

**目的**: 處理 OAuth 重新導向並交換 Session。

**執行過程**:
- 接收 URL 中的 `code` 參數。
- 使用 `supabase.auth.exchangeCodeForSession(code)` 換取 Token。
- 驗證成功後導向回原頁面或 `/cases`。

### 5. 路由保護 (`src/middleware.ts`)

**目的**: 全局路由保護。

**執行過程**:
- 檢查用戶 Session 狀態。
- 如果未登入且訪問受保護路徑 (如 `/cases/*`)，重導向至 `/login`。
- 更新 Session (Refresh Token)。

### 6. RLS 權限設定 (SQL)

**目的**: 在資料庫層級強制執行權限。

**執行過程**:
- 編寫 SQL 腳本啟用 RLS。
- 為 `cases`, `milestones` 等表添加 Policy：
  - `Enable read access for all users` (或僅限 authenticated)。
  - `Enable insert/update/delete for authenticated users only` (第一階段)。
- (進階) 如果表中有 `user_id` 欄位，限制僅能操作自己的資料。

---

## 驗收標準

**自動化/手動驗證**:
- [ ] **AC-1** [manual] 點擊登入按鈕能跳轉至 Google 登入畫面
- [ ] **AC-2** [manual] 登入成功後能正確跳轉回 `/cases`，且右上角顯示用戶資訊
- [ ] **AC-3** [manual] 未登入狀態下直接訪問 `/cases` 會被踢回 `/login`
- [ ] **AC-4** [manual] 登入後可以成功新增/修改案件 (RLS 通過)
- [ ] **AC-5** [test] 未登入用戶嘗試透過 API 或直接操作 DB 寫入資料應被拒絕 (RLS 阻擋)

**構建檢查**:
- [ ] **AC-6** [build] 無 Lint 錯誤
- [ ] **AC-7** [build] 移除未使用的依賴後 Build 成功

---

## 注意事項

1. **Supabase 設定**: 用戶需自行在 Supabase Dashboard -> Authentication -> Providers 開啟 Google，並填入 Client ID / Secret。
2. **Redirect URL**: 必須在 Supabase 後台將 `Deployment_URL/auth/callback` (如 `http://localhost:3000/auth/callback`) 加入 Redirect URLs 白名單。
