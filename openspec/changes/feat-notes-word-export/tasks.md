# Tasks: 筆記 Word 匯出功能實作

## Phase 1: 基礎建設 (Foundation)

### Task 1.1: 安裝依賴套件

**Priority**: P0  
**Estimate**: 30 分鐘

```bash
yarn add html-docx-js file-saver
yarn add -D @types/file-saver
```

**Acceptance Criteria**:

- [ ] `html-docx-js` 與 `file-saver` 成功安裝
- [ ] TypeScript 類型定義正常運作
- [ ] 無依賴衝突

---

### Task 1.2: 建立 useWordExport Hook

**Priority**: P0  
**Estimate**: 2 小時  
**File**: `src/hooks/useWordExport.ts`

**Implementation**:

```typescript
export function useWordExport() {
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const exportToWord = async ({ title, htmlContent }: ExportOptions) => {
    // 實作核心匯出邏輯
  };

  return { exportToWord, isExporting, error };
}
```

**Acceptance Criteria**:

- [ ] Hook 可接收 `title` 與 `htmlContent` 參數
- [ ] 回傳 `isExporting` 狀態
- [ ] 處理錯誤並回傳 `error` 訊息
- [ ] 純文字 HTML 可正常轉為 DOCX Blob

**Testing**:

```typescript
it('should export plain text HTML to Word', async () => {
  const { exportToWord } = useWordExport();
  const result = await exportToWord({
    title: 'Test',
    htmlContent: '<p>Hello</p>',
  });
  expect(result.success).toBe(true);
});
```

---

### Task 1.3: 實作檔名 Sanitization

**Priority**: P0  
**Estimate**: 30 分鐘  
**File**: `src/hooks/useWordExport.ts`

**Implementation**:

```typescript
function sanitizeFilename(name: string): string {
  return name
    .replace(/[<>:"/\\|?*]/g, '_')  // 移除非法字元
    .replace(/\s+/g, '_')            // 空格轉底線
    .substring(0, 100);              // 限制長度
}
```

**Acceptance Criteria**:

- [ ] 特殊字元（`<>:"/\|?*`）被替換為 `_`
- [ ] 檔名長度不超過 100 字元
- [ ] 中文字元保留

**Testing**:

```typescript
expect(sanitizeFilename('測試<檔案>/名稱?.docx')).toBe('測試_檔案__名稱_.docx');
expect(sanitizeFilename('A'.repeat(150))).toHaveLength(100);
```

---

## Phase 2: 格式保留 (Formatting)

### Task 2.1: 添加 HTML 樣式模板

**Priority**: P1  
**Estimate**: 1 小時  
**File**: `src/hooks/useWordExport.ts`

**Implementation**:

```typescript
const fullHtml = `
  <!DOCTYPE html>
  <html>
    <head>
      <meta charset="UTF-8">
      <style>
        body { 
          font-family: 'Microsoft JhengHei', '微軟正黑體', sans-serif; 
          line-height: 1.6;
        }
        h1 { color: #1e3a8a; font-size: 24pt; }
        h2 { color: #2563eb; font-size: 18pt; }
        h3 { color: #3b82f6; font-size: 14pt; }
        table { border-collapse: collapse; width: 100%; }
        td, th { border: 1px solid #d1d5db; padding: 8px; }
        img { max-width: 100%; height: auto; }
        strong { font-weight: bold; }
        em { font-style: italic; }
        u { text-decoration: underline; }
      </style>
    </head>
    <body>
      <h1>${title}</h1>
      <hr />
      ${htmlContent}
    </body>
  </html>
`;
```

**Acceptance Criteria**:

- [ ] 中文字體正確設定（微軟正黑體）
- [ ] 標題層級有不同大小與顏色
- [ ] 表格有邊框
- [ ] 圖片自動縮放

---

### Task 2.2: 待辦清單轉換

**Priority**: P2  
**Estimate**: 1.5 小時  
**File**: `src/hooks/useWordExport.ts`

**Implementation**:

```typescript
function convertTaskLists(html: string): string {
  // 將 <li data-checked="true"> 轉為 ☑
  html = html.replace(/<li data-checked="true">/g, '<li>☑ ');
  // 將 <li data-checked="false"> 轉為 ☐
  html = html.replace(/<li data-checked="false">/g, '<li>☐ ');
  return html;
}
```

**Acceptance Criteria**:

- [ ] 已勾選項目顯示 ☑ 符號
- [ ] 未勾選項目顯示 ☐ 符號
- [ ] 清單縮排正確

---

## Phase 3: 圖片處理 (Image Handling)

### Task 3.1: Base64 圖片支援

**Priority**: P1  
**Estimate**: 30 分鐘  
**File**: `src/hooks/useWordExport.ts`

**Implementation**:

```typescript
async function processImages(html: string): Promise<string> {
  const imgRegex = /<img[^>]+src="([^">]+)"/g;
  const matches = [...html.matchAll(imgRegex)];

  for (const match of matches) {
    const src = match[1];
    if (src.startsWith('data:image')) {
      // Base64 已可用，保持不變
      continue;
    }
    // 其他來源處理...
  }

  return html;
}
```

**Acceptance Criteria**:

- [ ] Base64 圖片直接嵌入
- [ ] 不進行二次轉換

---

### Task 3.2: Google Drive 圖片處理

**Priority**: P1  
**Estimate**: 2 小時  
**File**: `src/hooks/useWordExport.ts`

**Implementation**:

```typescript
async function fetchGoogleDriveImage(url: string): Promise<string> {
  const fileIdMatch = url.match(/[-\w]{25,}/);
  if (!fileIdMatch) throw new Error('Invalid Drive URL');

  const fileId = fileIdMatch[0];
  const response = await fetch(`/api/drive/view/${fileId}`);
  
  if (!response.ok) throw new Error('Drive fetch failed');

  const blob = await response.blob();
  return await blobToBase64(blob);
}
```

**Acceptance Criteria**:

- [ ] Google Drive URL 正確解析出 fileId
- [ ] 透過現有的 `/api/drive/view/{fileId}` 端點下載
- [ ] Blob 正確轉為 Base64
- [ ] 失敗時拋出清楚的錯誤訊息

**Testing**:

```typescript
it('should fetch Google Drive image', async () => {
  const url = 'https://drive.google.com/file/d/1A2B3C4D/view';
  const base64 = await fetchGoogleDriveImage(url);
  expect(base64).toMatch(/^data:image\//);
});
```

---

### Task 3.3: 外部圖片處理（含錯誤容忍）

**Priority**: P2  
**Estimate**: 1.5 小時  
**File**: `src/hooks/useWordExport.ts`

**Implementation**:

```typescript
async function fetchExternalImage(url: string): Promise<string | null> {
  try {
    const response = await fetch(url, { mode: 'cors' });
    if (!response.ok) return null;

    const blob = await response.blob();
    return await blobToBase64(blob);
  } catch (err) {
    console.warn(`External image fetch failed: ${url}`, err);
    return null; // 失敗時回傳 null，保留原始 URL
  }
}
```

**Acceptance Criteria**:

- [ ] 成功時回傳 Base64
- [ ] 失敗時回傳 `null` 並保留原始 URL
- [ ] CORS 錯誤不中斷整體匯出

---

### Task 3.4: 圖片壓縮

**Priority**: P2  
**Estimate**: 2 小時  
**File**: `src/hooks/useWordExport.ts`

**Implementation**:

```typescript
async function compressImage(
  base64: string, 
  maxWidth = 1200, 
  quality = 0.85
): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const scale = Math.min(1, maxWidth / img.width);
      canvas.width = img.width * scale;
      canvas.height = img.height * scale;

      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

      resolve(canvas.toDataURL('image/jpeg', quality));
    };
    img.src = base64;
  });
}
```

**Acceptance Criteria**:

- [ ] 圖片寬度超過 1200px 時自動縮小
- [ ] 壓縮品質為 85%
- [ ] 保持長寬比

**Testing**:

```typescript
it('should compress large images', async () => {
  const largeBase64 = '...'; // 2400px 寬圖片
  const compressed = await compressImage(largeBase64);
  const img = new Image();
  img.src = compressed;
  await img.decode();
  expect(img.width).toBeLessThan(1200);
});
```

---

## Phase 4: UI 整合 (UI Integration)

### Task 4.1: 更新 NoteDetail 組件

**Priority**: P0  
**Estimate**: 1.5 小時  
**File**: `src/components/knowledge/NoteDetail.tsx`

**Implementation**:

```tsx
import { useWordExport } from '@/hooks/useWordExport';

export function NoteDetail({ note }: { note: Note }) {
  const { exportToWord, isExporting, error } = useWordExport();

  const handleExportWord = async () => {
    const result = await exportToWord({
      title: note.title,
      htmlContent: note.content,
    });

    if (result.success) {
      toast.success('✅ Word 文件已下載！');
    } else {
      toast.error(`⚠️ 匯出失敗: ${result.error}`);
    }
  };

  return (
    <div className="flex justify-between items-center mb-4">
      <h1>{note.title}</h1>
      <div className="flex gap-2">
        <button onClick={handleExportWord} disabled={isExporting}>
          {isExporting ? '⏳ 匯出中...' : '📥 匯出 Word'}
        </button>
      </div>
    </div>
  );
}
```

**Acceptance Criteria**:

- [ ] 按鈕在匯出時顯示「⏳ 匯出中...」
- [ ] 成功時顯示 Toast 訊息
- [ ] 失敗時顯示錯誤訊息

---

### Task 4.2: 更新 QuickNotes 組件

**Priority**: P1  
**Estimate**: 1 小時  
**File**: `src/components/dashboard/quick-notes/QuickNotesSection.tsx`

**Implementation**:

```tsx
const handleExportNote = async (note: QuickNote) => {
  const { exportToWord } = useWordExport();
  await exportToWord({
    title: note.title || `速記_${new Date().toLocaleDateString()}`,
    htmlContent: note.content,
  });
};
```

**Acceptance Criteria**:

- [ ] 每個速記卡片有「⋯」選單
- [ ] 選單內有「📥 匯出 Word」選項
- [ ] 點擊後觸發匯出

---

### Task 4.3: 添加進度指示器（可選）

**Priority**: P3  
**Estimate**: 2 小時  
**File**: `src/hooks/useWordExport.ts`

**Implementation**:

```typescript
const [progress, setProgress] = useState(0);

for (let i = 0; i < matches.length; i++) {
  await processImage(matches[i]);
  setProgress(Math.round(((i + 1) / matches.length) * 100));
}
```

**UI Display**:

```tsx
{isExporting && (
  <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
    <div className="bg-white p-6 rounded-2xl">
      <p>正在處理圖片... {progress}%</p>
      <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
        <div 
          className="bg-blue-600 h-2 rounded-full transition-all" 
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  </div>
)}
```

**Acceptance Criteria**:

- [ ] 顯示百分比進度
- [ ] 進度條視覺化更新
- [ ] 完成時自動關閉

---

## Phase 5: 測試與優化 (Testing & Optimization)

### Task 5.1: 單元測試

**Priority**: P1  
**Estimate**: 3 小時  
**File**: `src/hooks/useWordExport.test.ts`

**Test Cases**:

```typescript
describe('useWordExport', () => {
  it('exports plain text HTML', async () => { ... });
  it('handles Base64 images', async () => { ... });
  it('handles Google Drive images', async () => { ... });
  it('handles external image failures gracefully', async () => { ... });
  it('sanitizes filenames correctly', async () => { ... });
  it('converts task lists', async () => { ... });
});
```

**Acceptance Criteria**:

- [ ] 所有測試通過
- [ ] 覆蓋率 ≥ 80%

---

### Task 5.2: 手動 QA 測試

**Priority**: P0  
**Estimate**: 2 小時  
**Checklist**:

- [ ] 純文字筆記匯出成功
- [ ] 包含粗體、斜體的筆記格式正確
- [ ] 包含清單的筆記縮排正確
- [ ] 包含表格的筆記邊框顯示
- [ ] 包含 Base64 圖片的筆記圖片清晰
- [ ] 包含 Google Drive 圖片的筆記圖片成功嵌入
- [ ] 包含外部圖片的筆記（失敗時）不中斷匯出
- [ ] 待辦清單顯示 ☐/☑ 符號
- [ ] 超連結可點擊
- [ ] 在 Microsoft Word 2016+ 正常開啟
- [ ] 在 Google Docs 正常開啟
- [ ] 檔名無非法字元
- [ ] 大型筆記（>5MB）匯出時間 < 10 秒

---

### Task 5.3: 效能優化

**Priority**: P2  
**Estimate**: 2 小時  
**File**: `src/hooks/useWordExport.ts`

**Optimizations**:

1. **並行圖片處理**:

   ```typescript
   const imagePromises = matches.map(processImage);
   await Promise.allSettled(imagePromises);
   ```

2. **圖片快取**:

   ```typescript
   const imageCache = new Map<string, string>();
   ```

3. **限制並行數量**:

   ```typescript
   const limit = pLimit(3); // 最多同時處理 3 張圖片
   ```

**Acceptance Criteria**:

- [ ] 10 張圖片的筆記匯出時間 < 5 秒
- [ ] 不阻塞 UI（使用 Web Worker 或異步處理）

---

## Phase 6: 文件與部署 (Documentation & Deployment)

### Task 6.1: 撰寫使用文件

**Priority**: P2  
**Estimate**: 1 小時  
**File**: `docs/features/word-export.md`

**Content**:

- 功能說明
- 使用步驟
- 常見問題 (FAQ)
- 已知限制

---

### Task 6.2: 更新 Changelog

**Priority**: P1  
**Estimate**: 15 分鐘  
**File**: `CHANGELOG.md`

```markdown
## [1.5.0] - 2026-01-24

### Added
- 筆記 Word 匯出功能
  - 支援富文本格式（粗體、清單、表格）
  - 自動嵌入 Base64 與 Google Drive 圖片
  - 檔名安全化處理
```

---

### Task 6.3: Git Commit & Push

**Priority**: P0  
**Estimate**: 15 分鐘  

```bash
git add .
git commit -m "feat(notes): add Word export functionality with image embedding support"
git push
```

---

## Summary

**Total Estimate**: ~23 小時  
**Critical Path**: Task 1.2 → 2.1 → 3.2 → 4.1 → 5.2  
**Optional Tasks**: Task 4.3 (進度指示器), Task 5.3 (效能優化)

**Dependencies**:

- `html-docx-js@^0.3.1`
- `file-saver@^2.0.5`

**Risks**:

- 圖片處理可能因網路問題失敗（已有容錯機制）
- 大型筆記效能問題（需監控並優化）
