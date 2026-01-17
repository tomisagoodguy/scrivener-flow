---
description: 在 Next.js 中建立新的頁面
---

這個工作流將協助您建立新的應用程式頁面。

1. 請輸入頁面名稱 (例如: `Cases`, `Settings`)。
2. 根據 Next.js App Router 規範，在 `my-case-tracker/src/app/[page-name]/page.tsx` 建立檔案。
3. 寫入基礎樣板：
   ```tsx
   import React from 'react';

   export default function [ComponentName]Page() {
     return (
       <main className="container mx-auto p-4">
         <h1 className="text-2xl font-bold">[Page Name]</h1>
         {/* 內容實作 */}
       </main>
     );
   }
   ```
4. 確認檔案位於正確的渲染路徑。

---
**使用效益：**
- 符合 App Router 目錄結構。
- 內建基礎 Tailwind 排版。
