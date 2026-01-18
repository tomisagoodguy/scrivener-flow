# Scrivener Flow - 專業代書案件管理系統 🚀

Scrivener Flow 是一款專為代書（地政士）設計的高效率案件追蹤與代辦管理系統。結合合約里程碑監控、智慧任務提醒及團隊知識庫，協助您精確掌握每一個案件細節，從簽約到交屋全程無憂。

---

## 🌟 核心功能 (Core Features)

### 1. 專業工作面板 (Workflow Dashboard)

* **緊急戰情室**：自動篩選 3 天內需完成的「待辦任務」，支援一鍵完成同步更新。
* **未來七日預告**：結合「行動任務」與「合約里程碑 (用印/完稅/交屋)」，以時序圖呈現一週進度。
* **稅單限繳監控**：土增稅、契稅、地價稅及房屋稅限繳日期自動 5 天前提醒。
* **即時統計圖表**：一眼掌握全案進度、財務狀況及任務分布。

### 2. 精確案件管理 (Case Management)

* **合約里程碑基準**：手動錄入合約規定的簽約、用印、完稅、代償、交屋日期作為法定基準。
* **預收規費自動化**：支援便捷金額格式（如輸入 `5` 自動轉為 `50,000`），支撐整數與小數點輸入。
* **進度與任務隔離**：里程碑為「法定事實」（唯讀），待辦事項為「可執行的任務」，確保資料嚴謹。
* **即時備註與標記**：自定義標籤（如：訴訟、卡營業登記等）與案件即時備註。

### 3. 智慧代辦中心 (Todo Center)

* **多維度檢視**：
  * **清單模式 (List)**：詳盡的任務細節。
  * **矩陣模式 (Matrix)**：依衝突優先級區分重要性。
  * **日曆模式 (Calendar)**：全局時程掌控。
* **系統自動任務**：根據填寫的案件日期，自動在 3-5 天前產生系統提醒任務。
* **自定義任務**：支援快速新增個人或案件相關的非標任務。

### 4. 團隊知識庫與檔案 (Knowledge Base & Files)

* **Word 級編輯器**：內建富文本編輯器，支援格式豐富的作業規範與筆記。
* **團隊共編**：所有登入成員皆可更新維護作業手冊、銀行窗口資訊。
* **表單自動生成**：一鍵將案件數據填入 Word 模板（合約摘要等）。
* **Excel 匯出**：完整案件資料匯出，方便進行行政匯報與離線歸檔。

### 5. 安全與架構 (Security & Infra)

* **Google OAuth**：快速登入，無需排他性權限。
* **資料隔離 (RLS)**：內建 Row Level Security，確保各個代書者的資料完全獨立。
* **即時數據同步**：基於 Supabase Realtime 技術，多裝置操作同步不延遲。

---

## 🛠 技術堆疊 (Tech Stack)

* **Frontend**: Next.js 14 (App Router), TypeScript, Tailwind CSS
* **Backend**: Supabase (Auth, PostgreSQL, Realtime, Storage)
* **ORM**: Prisma (Schema definition & local exploration)
* **UI Components**: Lucide React Icons, Radix UI (Headless components)
* **Utils**: date-fns, docxtemplater (Word gen), xlsx (Excel export)

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

## 📝 待辦與上線前確認 (Launch Checklist)

* [ ] 測試 Google OAuth 登入流程。
* [ ] 驗證 RLS 限制是否正確隔離不同使用者的案件。
* [ ] 測試 Excel 匯出與 Word 產表是否格式正確。
* [ ] 檢查「進度日期」修改後，儀表板提醒是否即時更新。
* [ ] 確認「緊急戰情室」僅顯示可執行的 Tasks 而非 Milestones。

---

## 🌐 部署說明 (Deployment)

本專案已部署至 Vercel：`https://scrivener-flow.vercel.app`

### 環境變數設定
在 Vercel Dashboard 的 Environment Variables 中需設定：
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `LINE_CHANNEL_ACCESS_TOKEN`
- `LINE_USER_ID`

**注意**：設定環境變數後，務必執行 Redeploy 才會生效。

---

**Scrivener Flow** - 讓代書作業更精確、更優雅。
