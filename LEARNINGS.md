# 2026-01-07 學習與開發紀錄

## 🎯 今日目標：完備 Demo 頁面與 Excel 實務結合

今天我們成功地將「不動產案控進度追蹤」從一個基礎的概念，進化到了一個具備專業實務深度的 Demo 系統。

### 1. 技術架構與開發技巧

- **Next.js 端口配置**：學會處理 Windows 環境下的端口衝突 (EACCES)，透過 `yarn dev -p 4321` 指定端口解決連線問題。
- **Supabase 深度整合**：
  - 透過 `SCHEMA_DISCUSSION.md` 實作了多表關聯的資料庫架構 (Cases, Milestones, Financials)。
  - 設定了 Supabase MCP Server，並透過 Access Token 實現自動化資料庫管理。
- **現代 Web UI 設計**：
  - **玻璃擬態 (Glassmorphism)**：利用 CSS 變數、`backdrop-blur` 與 `rgba` 邊框打造高級感介面。
  - **白天/黑夜模式切換**：透過 `data-theme` 屬性與 CSS Variables 實現全局色彩連動切換。

### 2. 領域知識 (Domain Knowledge) 實務應用

- **Excel 邏輯還原**：分析《案件進度設計範本.xlsx》後，理解了代書實務中「今日須完成」標記的重要性，並將其整合為 UI 核心。
- **代書流程數位化**：
  - **核心六大節點**：簽約、簽差、用印、預收、完稅、交屋。
  - **貸款與代償追蹤**：區分 B貸款 (買方貸款) 與 S貸款 (賣方貸款)，這是處理代償案件的邏輯關鍵。

### 3. 操作體驗 (UX) 優化

- **工作表式切換 (Excel-like Sheet Tabs)**：模仿 Excel 頁籤導覽，讓使用者能快速在多個案件間「無痛切換」，保有傳統表格的操作直覺。
- **即時內容渲染**：透過 React State 有效管理複雜的 JSON 關聯資料，點擊頁籤後自動載入該案件的所有時程與財務數據。

---
*備註：今日成果已同步至開發伺服器，並準備上傳至 GitHub。*
