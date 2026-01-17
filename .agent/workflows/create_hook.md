---
description: 建立標準化的自定義 React Hook
---

這個工作流將協助您建立符合規範的 React Hook。

1. 請輸入 Hook 名稱 (必須以 `use` 開頭，例如: `useWindowSize`)。
2. 我將在 `my-case-tracker/src/hooks/[HookName].ts` 建立檔案。
3. 寫入 TypeScript 樣板代碼：
   ```typescript
   import { useState, useEffect } from 'react';

   export const [HookName] = () => {
     const [data, setData] = useState<unknown>(null);

     useEffect(() => {
       // 邏輯實作
       console.log('[HookName] mounted');
     }, []);

     return { data };
   };
   ```
4. 確認檔案採用命名匯出 (Named Export)。

---
**使用效益：**
- 強制命名規範。
- 提供基礎 useState/useEffect 結構，節省打字時間。
