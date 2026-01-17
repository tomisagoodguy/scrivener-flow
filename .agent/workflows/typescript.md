---
name: typescript-specialist
description: TypeScript/Next.js 全端開發規範。包含 yarn、ESLint、React Hooks 與 Server Components 最佳實踐。
---

# TypeScript & Next.js 開發專家規範

## 🛠 工具鏈與依賴管理

- **套件管理**：嚴格使用 `yarn`。
- **Lint/Format**：使用 `ESLint` 與 `Prettier`。
- **測試**：使用 `Jest` 或 `Vitest`。
- **Type Check**：`npx tsc --noEmit`。

## 💻 程式碼風格

- **禁止 `any`**：使用 `unknown` 並配合 Type Guards。
- **物件定義**：優先使用 `interface`。
- **React**：使用 Functional Components + Hooks。
- **Next.js**：
  - 優先使用 **Server Components**。
  - 客戶端交互僅在必要時加 `'use client'`。
- **狀態管理**：優先使用 `Zustand` 或 `React Context`。

## 🚀 常用指令

| 任務 | 指令 |
|------|------|
| 初始化專案 | `yarn create next-app .` |
| 安裝依賴 | `yarn add <pkg>` |
| 開發依賴 | `yarn add -D <pkg>` |
| 啟動開發伺服器 | `yarn dev` |
| 建置專案 | `yarn build` |
| 執行 Lint | `yarn lint --fix` |

## 🏗️ 架構模式

- **Zod**：用於 Runtime 資料驗證。
- **Server Actions**：Next.js 中優先處理表單或資料修改。
- **SOLID 原則**：遵守單一職責與介面隔離。

---
*由 Global Rules 自動分割而成。*
