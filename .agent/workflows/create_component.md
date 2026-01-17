---
description: 建立標準化結構的 React 元件 (搭配 TypeScript & CSS)
---

這個工作流將協助您建立符合專案規範的 React 元件。

1. 請輸入元件名稱 (例如: `Button`, `Header`)。
2. 我將在 `my-case-tracker/src/components/[ComponentName]` 建立目錄。
3. 建立元件主檔案 `index.tsx`。
4. 寫入樣板代碼：
   ```tsx
   import React from 'react';
   import styles from './styles.module.css';

   interface [ComponentName]Props {
     children?: React.ReactNode;
     className?: string;
   }

   export const [ComponentName] = ({ children, className }: [ComponentName]Props) => {
     return (
       <div className={`${styles.container} ${className || ''}`}>
         <h1>[ComponentName] Component</h1>
         {children}
       </div>
     );
   };
   ```
5. 建立 CSS Module 檔案 `styles.module.css`。
6. 加入基礎樣式。
7. 確認匯出正確。

---
**使用效益：**
- 保持元件結構一致。
- 自動化目錄管理與命名規範。
- 內建 TypeScript 支援與 CSS Modules。
