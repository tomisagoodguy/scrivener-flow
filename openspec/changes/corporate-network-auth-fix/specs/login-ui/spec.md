## MODIFIED Requirements

### Requirement: Email OTP 為主要登入方式
登入頁面 SHALL 將 Email OTP（Magic Link）區塊置於頁面最上方，Google OAuth 置於下方作為次要選項，並顯示企業網路提示文字。

#### Scenario: 公司內網使用者看到 OTP 優先的 UI
- **WHEN** 使用者開啟登入頁面
- **THEN** Email 輸入框與「傳送登入連結」按鈕顯示在最上方，Google OAuth 按鈕在下方，頁面頂部顯示提示：「公司或企業網路環境，請輸入 Email 使用 Magic Link 登入」

#### Scenario: OTP 登入後帳號識別不變
- **WHEN** 原本以 Google OAuth（`tom@gmail.com`）登入的使用者改用 Email OTP（`tom@gmail.com`）登入
- **THEN** Supabase 識別為同一帳號（相同 `user_id`），資料 RLS 隔離行為不變

#### Scenario: 外網使用者仍可使用 Google OAuth
- **WHEN** 使用者點擊下方的 Google OAuth 按鈕
- **THEN** 走原有 `supabase.auth.signInWithOAuth({ provider: 'google' })` 流程，行為不變
