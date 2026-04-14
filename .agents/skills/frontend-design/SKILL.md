---
name: frontend-design
description: Frontend design and architecture guidelines. Use this skill when establishing layout, creating React components, building Next.js pages, and structuring the frontend layer.
compatability: Next.js, React, Tailwind CSS
---

# Frontend Design (前端設計導向)

本技能指南專注於提供極致效能、可維護性與最佳實踐的前端架構設計。

## 🎯 前端架構原則 (Frontend Architecture Standards)

1. **分離關注點 (Separation of Concerns, SoC)**
   - Components (`.tsx`)：專注於 UI 呈現。超過 150 行必定拆分。
   - Hooks (`use*.ts`)：封裝複雜業務邏輯、狀態與介面副作用 (Side Effects)。
   - 避免過度 Prop Drilling，適時使用 Context 或 Zustand 管理狀態。

2. **單一真理來源 (Single Source of Truth, SSOT)**
   - 系統配置與常數：以 `.env` 與 Config 為準。
   - 商業邏輯突變：以 Server Actions 為準，並結合完善的錯誤捕捉機制。

3. **伺服器與客戶端分層**
   - 優先使用 Server Components 計算資料與渲染初始視圖。
   - 僅在需要互動性 (如 `onClick`, `useState` 等綁定) 的最末端節點使用 `'use client'`。
   - 使用 `<Suspense>` 包覆邊界，特別是涉及 Request-bound hooks (如 `headers`, `cookies`) 時，防止 Static Build 失敗。

## 🛡️ 強制安全與質量 (Strict Quality & Security)

- **型別與資料驗證**：全面引入 `Zod` 進行 Runtime 資料驗證。禁止在處理外部資料時使用裸奔的 Type Casting。
- **無 `any` 政策**：遇到不確定型別請使用 `unknown` 搭配 Type Guards 進行收斂。
- **防止靜默失敗**：所有的 API / Server Actions 失敗都必須有明確的狀態碼與 UI 反饋，嚴禁出現空的 `try/catch` 捕捉。

## 🛠 開發工作流 (Development Workflow)

1. **分析 (CoT)**：在撰寫畫面與邏輯前，分析 UI、依賴 (Dependencies) 與邊界條件 (Edge cases)。
2. **組件建構**：
   - 定義 Schema/Interface / Type。
   - 實作無狀態 (Stateless) 的 UI。
   - 綁定狀態 (Stateful) 或 Hook。
3. **驗證與效能查核**：
   - 執行 `yarn lint --fix` 確保無潛在錯誤。
   - 檢查過度重新渲染 (Unnecessary Re-renders)。

## 🚨 注意事項
- 嚴格使用 `yarn` 管理前端套件，**禁止** 出現 `package-lock.json` 或 `pnpm-lock.yaml`。
- 對於大型文字與區塊的截斷，請確實添加 `truncate` 與 `break-words` 防禦性樣式。
