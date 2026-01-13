# 🚀 Deployment Guide (Vercel + Supabase)

本指南將協助您將 **My Case Tracker** 部署至 Vercel 雲端平台，實現全天候運作。

## 📋 事前準備 (Prerequisites)

1. **GitHub 帳號**：確保您的程式碼已推送到 GitHub Repository。
2. **Vercel 帳號**：前往 [vercel.com](https://vercel.com/) 註冊或登入。
3. **Supabase 專案**：您現有的 Supabase 專案 URL 與 API Keys。

---

## 🛠️ 步驟 1：取得環境變數 (Environment Variables)

請先整理好以下資訊，部署時需要填入 Vercel：

| 變數名稱 (Name) | 說明 | 取得方式 |
| :--- | :--- | :--- |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase 專案網址 | Supabase Dashboard > Settings > API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | 公開匿名金鑰 | Supabase Dashboard > Settings > API |
| `DATABASE_URL` | PostgreSQL 連線字串 (Transaction Pooler) | Supabase > Settings > Database > Connection String (Node.js) |
| `DIRECT_URL` | PostgreSQL 連線字串 (Session) | 同上，但 Port 通常為 5432 (非 6543) |

> **注意**：若您的專案未深度使用 Prisma，`DATABASE_URL` 與 `DIRECT_URL` 可能非必須，但建議設定以備不時之需。

---

## 🚀 步驟 2：部署至 Vercel

1. **新增專案**：
    * 在 Vercel Dashboard 點擊 **"Add New..."** > **"Project"**.
    * 連結您的 GitHub 帳號，並選擇 `scrivener-flow` (或您的 Repository 名稱)。

2. **設定專案 (Import Project)**：
    * **Root Directory**: 選擇 `my-case-tracker` (因為這是 Next.js 專案所在的子資料夾)。
    * **Framework Preset**: 選擇 `Next.js` (通常會自動偵測)。

3. **輸入環境變數 (Environment Variables)**：
    * 展開 **"Environment Variables"** 區塊。
    * 將步驟 1 整理的變數逐一貼上 (Key 與 Value)。

4. **開始部署**：
    * 點擊 **"Deploy"**。
    * 等待約 1-2 分鐘，看到滿屏煙火即代表部署成功！ 🎉

---

## 🔒 步驟 3：設定 Google OAuth (關鍵！)

為了讓 Google 登入功能在正式站運作，您必須將 Vercel 的網址加入 Google Cloud Console 的白名單。

1. 取得您的 Vercel 網址 (例如：`https://my-case-tracker.vercel.app`)。
2. 前往 **[Google Cloud Console](https://console.cloud.google.com/)** > **APIs & Services** > **Credentials**。
3. 找到您使用的 **OAuth 2.0 Client ID**。
4. 修改設定：
    * **Authorized JavaScript origins**: 新增您的 Vercel 網址 (移除結尾斜線，如 `https://my-case-tracker.vercel.app`)。
    * **Authorized redirect URIs**: 新增 Callback 網址 (通常是 `https://my-case-tracker.vercel.app/auth/callback`)。
5. **Supabase 設定**：
    * 前往 Supabase Dashboard > Authentication > URL Configuration。
    * 將 **Site URL** 改為您的 Vercel 正式網址。
    * 或者在 **Redirect URLs** 清單中加入 Vercel 網址。

---

## ✅ 完成

現在您可以訪問您的 Vercel 網址，測試登入與系統功能是否正常！
