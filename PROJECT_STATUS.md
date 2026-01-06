# 專案開發進度與技術狀態追蹤 (Project Status & Tech Stack)

> 此文件用於記錄專案目前的開發進度、技術選型、已完成功能以及待辦事項。
> 每次開發週期結束前請更新此文件，以便維持開發脈絡。

## 📅 當前狀態 (Current Status)

- **版本**: v0.1.0 (Alpha - UI & 基礎架構)
- **最後更新時間**: 2026-01-06
- **目前階段**: 核心功能 (CRUD) 已完成並驗證，準備開發進階功能 (彈性欄位)。

## 🛠️ 技術架構 (Tech Stack)

我們選用了目前 Web 開發最主流且支援度最高的技術組合：

1. **核心框架**: [Next.js 14+ (App Router)](https://nextjs.org/) - 支援伺服器端渲染 (SSR)，對 SEO 友善且效能極佳。
2. **程式語言**: [TypeScript](https://www.typescriptlang.org/) - 強型別語言，大幅減少執行時期錯誤。
3. **樣式系統**: [Tailwind CSS](https://tailwindcss.com/) - 搭配自訂的 Glassmorphism (玻璃擬態) 設計風格。
4. **資料庫與後端**: [Supabase](https://supabase.com/)
    - **核心**: PostgreSQL (關聯式資料庫，確保資料嚴謹)。
    - **彈性擴充**: 預計使用 `JSONB` 格式來儲存非結構化資料 (解決「每個使用者輸入不依樣」的需求)。
    - **API**: 使用 Supabase JS Client 直接與資料庫溝通 (無伺服器架構)。
5. **部署環境**: [Vercel](https://vercel.com/) (預計) 或任何支援 Node.js 的伺服器。

## ✅ 已完成功能 (Completed Features)

1. **專案初始化**:
    - [x] Next.js 環境建置。
    - [x] Tailwind CSS 設定與深色主題 (Dark Mode) 配置。
    - [x] 安裝 `@supabase/supabase-js` 套件。
    - [x] 資料庫與環境變數設定完成。

2. **UI/UX 介面開發**:
    - [x] **首頁 (Dashboard)**: 包含統計儀表板、近期案件列表 (目前為假資料)。
    - [x] **元件模組化**: 拆分為 `Header`, `DashboardStats`, `RecentCases`。
    - [x] **視覺優化**: 實作淡入 (Fade-in) 與滑動 (Slide-up) 動畫效果。

3. **案件管理功能**:
    - [x] **新增案件頁面 (`/cases/new`)**:
        - 實作完整表單 (含基本資料、貸款資訊、關鍵五大日期、稅務類型)。
        - 實作 Supabase `insert` 邏輯 (程式碼已就緒)。

## 📝 最近修改 (Recent Modifications)

- **修正表單欄位**: 補齊 `README.md` 中定義的所有欄位（如：過戶日、交屋日、貸款銀行）。
- **加入後端邏輯**: 將 `handleSubmit` 從模擬延遲改為真實的 Supabase API 呼叫。
- **資料串接 (Data Fetching)**:
  - `DashboardStats`: 實作數據統計 (案件數、本週新增、急件)。
  - `RecentCases`: 實作近期案件列表讀取。

## 🐛 待修復問題與已知限制 (Bugs & Known Issues)

1. **資料庫尚未建立 (Critical)**:
    - **描述**: 前端程式碼已寫好寫入資料庫的邏輯，但 Supabase 後台尚未建立 `cases` 表格。
    - **影響**: 提交表單會失敗 (Console 會報錯)。
    - **解法**: 需在 Supabase SQL Editor 執行建表 SQL。
2. **JSONB 彈性欄位尚未實作**:
    - **描述**: 尚未在表單中加入讓使用者動態新增欄位的 UI。

## 🚀 下一步行動 (Next Steps / Action Items)

## 🚀 下一步行動 (Next Steps / Action Items)

1. **[開發] 實作彈性欄位 UI**:
    - 在新增案件頁面加入「新增自訂欄位」的功能，存入 `custom_fields`。
2. **[開發] 編輯與刪除功能**:
    - 點擊案件卡片進入詳情頁 (`/cases/[id]`)。
3. **[開發] 部署**:
    - 準備部署至 Vercel。
