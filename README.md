# Scrivener Flow - 專業代書案件管理系統 🚀

Scrivener Flow 是一款專為地政士（代書）量身打造的高效率、視窗化案件管理與時程監控系統。透過規格驅動開發 (SDD) 與 AI 代理組件，我們將繁瑣的法定流程轉化為直觀的戰情中心，協助您精確掌握每一個案件細節，從簽約到交屋全程無憂。

> 🗺️ **[文件導覽地圖 (DOCS_MAP)](./DOCS_MAP.md)**：如果您迷路了，可以在這裡找到所有的專案手冊與規範。

---

## 🌟 核心功能 (Core Features)

### 1. 全方位案件監控 (Advanced Monitoring)

- **全流程 Pipeline 戰情室**：將案件分類為「簽、印、稅、過、交」五大階段，透過動態圖表一目了然各階段存量，支援點擊圓圈立即篩選對應案件。
- **多維度檢視切換**：
  - **承辦中/已結案**：傳統清單模式，快速查閱案件基本資訊、價格與銀行。
  - **時程 (Timeline)**：基於日期的高密度任務列表。
  - **備忘錄 (Memo)**：集中管理案件記事，適合處理複雜的非結構化資訊。
  - **未完成統整 (Pending)**：自動掃描各案件 checklist，將落後進度集中呈現。

### 2. 時程總覽中心 (Timeline Hub)

- **今日焦點 (Today's Focus)**：聚合「逾期警示」、「近期注意事項推播」、「今日任務」與「明日預告」，讓您在開工前 1 分鐘掌握全天重點。
- **智能注意事項推播**：
  - **約客 (Appointment)**：提前 3 天開始提醒。
  - **稅單限繳 (Tax Deadline)**：提前 5 天開始提醒。
  - **里程碑 (Milestone)**：今日與明日發生時即刻呈報。
- **高密度列表 (Daily List)**：每日任務按類別（里程碑、約客、截止、待辦）顏色與圖標區分，支援一鍵過濾單一類別。

### 3. 精確案件管理 (Case Management)

- **法定事實 vs 執行任務**：里程碑為「法定基準」，待辦事項為「行動任務」。
- **Checklist 自動關聯**：未完成的 checklist 項目會自動掛載於時程中最接近的里程碑上，確保流程不中斷。
- **財務與規費自動化**：支援專業輸入縮寫（如 `5` 轉 `50,000`），內建土地增值稅、契稅限繳日期監控。
- **Excel 匯出與模板產表**：一鍵產生案件報表或填入 Word 模板（合約摘要等）。

### 4. 團隊協作與安全 (Security & Collaboration)

- **Google OAuth 2.0**：無感登入，安全可靠。
- **Row Level Security (RLS)**：基於 Supabase 內建資料隔離技術，確保不同使用者（地政士）的案件資料完全獨立，絕不越權。
- **即時數據同步 (Realtime)**：多裝置操作、標記完成後即時同步至時程看板，免手動重新整理。

---

## 🛠 技術堆疊 (Tech Stack)

- **Frontend**: Next.js 14 (App Router), TypeScript, Vanilla CSS (Refined Vibe)
- **Backend**: Supabase (Auth, PostgreSQL, Realtime, Storage)
- **Utils**: date-fns (Time matrix), docxtemplater (Word gen), xlsx (Excel export), Zod (Data Validation)
- **Design Paradigm**: Glassmorphism (玻璃擬態), Modern Minimalist, Responsive for Mobile/Tablet

---

## 🚀 快速啟動 (Quick Start)

1. **安裝依賴**:
   ```bash
   yarn install
   ```

2. **環境變數設定**:
   複製 `.env.example` 並更名為 `.env.local`，填入您的 Supabase 憑證。

3. **開發模式**:
   ```bash
   yarn dev
   ```

4. **構建與生產**:
   ```bash
   yarn build
   yarn start
   ```

---

## 🏗️ 代理開發流程 (ECC Protocol)

本專案採用 **OpenSpec** 規格驅動開發 (Specification Driven Development)。所有重大變更皆遵循以下流程：

1. **Proposal**: 建立 `/openspec/changes/[name]` 提案文件。
2. **Implement**: 由 AI 代理 (Antigravity) 根據 `tasks.md` 執行變更。
3. **Validate**: 執行 TypeScript 與 Lint 檢查，驗證介面 Vibe。
4. **Archive**: 歸檔變更，更新 `specs/` 下的系統真相。

---

## 📝 待辦與上線前確認 (Launch Checklist)

- [ ] 測試 Google OAuth 登入流程。
- [ ] 驗證 RLS 限制是否正確隔離不同使用者的案件。
- [ ] 測試 Excel 匯出與 Word 產表是否格式正確。
- [ ] 檢查「進度日期」修改後，儀表板提醒是否即時更新。
- [ ] 確認「緊急戰情室」僅顯示可執行的 Tasks 而非 Milestones。

---

## 🌐 部署說明 (Deployment)

本專案已部署至 Vercel：`https://scrivener-flow.vercel.app`

### 環境變數設定

在 Vercel Dashboard 的 Environment Variables 中需設定：
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `LINE_CHANNEL_ACCESS_TOKEN`
- `LINE_USER_ID`

---

**Scrivener Flow** - 讓代書作業更精確、更優雅。
