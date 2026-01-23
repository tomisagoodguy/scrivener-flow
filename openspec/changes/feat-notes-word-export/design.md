# Design: 筆記 Word 匯出功能

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    使用者介面 (UI Layer)                      │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  Knowledge Base / Notes Page                         │   │
│  │  - RichTextEditor (Tiptap)                          │   │
│  │  - [📥 匯出 Word] 按鈕                               │   │
│  └────────────────┬─────────────────────────────────────┘   │
└───────────────────┼─────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────────────────┐
│              Business Logic (Export Handler)                 │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  useWordExport Hook                                  │   │
│  │  1. 取得編輯器 HTML 內容                              │   │
│  │  2. 解析圖片 URLs                                    │   │
│  │  3. 下載 & 轉換圖片為 Base64                         │   │
│  │  4. 組裝完整 HTML 文件                               │   │
│  │  5. 調用轉換器                                       │   │
│  └────────────────┬─────────────────────────────────────┘   │
└───────────────────┼─────────────────────────────────────────┘
                    │
        ┌───────────┴───────────┐
        ▼                       ▼
┌──────────────────┐   ┌──────────────────────┐
│  Image Processor │   │  HTML→DOCX Converter │
│  - fetchImage()  │   │  - html-docx-js      │
│  - toBase64()    │   │  - format styles     │
│  - compress()    │   │  - embed images      │
└──────────────────┘   └──────────────────────┘
        │                       │
        └───────────┬───────────┘
                    ▼
            ┌──────────────────┐
            │  Browser Download│
            │  - Blob API      │
            │  - file-saver    │
            └──────────────────┘
```

## Component Design

### 1. UI Component Update

**檔案**: `src/components/knowledge/NoteDetail.tsx`  
**變更**: 在筆記標題列新增「匯出 Word」按鈕

```tsx
<div className="flex items-center gap-4">
  <h1>{note.title}</h1>
  <div className="flex gap-2">
    <button onClick={handleEdit}>✏️ 編輯</button>
    <button onClick={handleExportWord} disabled={isExporting}>
      {isExporting ? '⏳ 匯出中...' : '📥 匯出 Word'}
    </button>
    <button onClick={handleDelete}>🗑️ 刪除</button>
  </div>
</div>
```

### 2. Custom Hook: useWordExport

**檔案**: `src/hooks/useWordExport.ts`

```typescript
import { useState } from 'react';
import { asBlob } from 'html-docx-js/dist/html-docx';
import { saveAs } from 'file-saver';

interface ExportOptions {
  title: string;
  htmlContent: string;
}

export function useWordExport() {
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const exportToWord = async ({ title, htmlContent }: ExportOptions) => {
    setIsExporting(true);
    setError(null);

    try {
      // 1. 預處理 HTML：提取圖片 URLs
      const processedHtml = await processImages(htmlContent);

      // 2. 組裝完整 HTML 文件
      const fullHtml = `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="UTF-8">
            <style>
              body { font-family: 'Microsoft JhengHei', '微軟正黑體', sans-serif; }
              h1, h2, h3 { color: #1e3a8a; }
              table { border-collapse: collapse; width: 100%; }
              td, th { border: 1px solid #ddd; padding: 8px; }
              img { max-width: 100%; height: auto; }
            </style>
          </head>
          <body>
            <h1>${title}</h1>
            <hr />
            ${processedHtml}
          </body>
        </html>
      `;

      // 3. 轉換為 DOCX Blob
      const blob = asBlob(fullHtml);

      // 4. 觸發下載
      const filename = `${sanitizeFilename(title)}_${getDateString()}.docx`;
      saveAs(blob, filename);

      return { success: true };
    } catch (err: any) {
      setError(err.message);
      return { success: false, error: err.message };
    } finally {
      setIsExporting(false);
    }
  };

  return { exportToWord, isExporting, error };
}

// Helper Functions
function sanitizeFilename(name: string): string {
  return name.replace(/[<>:"/\\|?*]/g, '_').substring(0, 100);
}

function getDateString(): string {
  return new Date().toISOString().split('T')[0];
}

async function processImages(html: string): Promise<string> {
  // 使用正則提取所有 <img> 標籤
  const imgRegex = /<img[^>]+src="([^">]+)"/g;
  const matches = [...html.matchAll(imgRegex)];

  let processedHtml = html;

  for (const match of matches) {
    const originalSrc = match[1];
    try {
      // 如果是 Base64，保持不變
      if (originalSrc.startsWith('data:image')) {
        continue;
      }

      // 如果是 Google Drive URL，透過 Proxy 下載
      if (originalSrc.includes('drive.google.com')) {
        const base64 = await fetchGoogleDriveImage(originalSrc);
        processedHtml = processedHtml.replace(originalSrc, base64);
      } else {
        // 外部 URL：嘗試 fetch
        const base64 = await fetchExternalImage(originalSrc);
        processedHtml = processedHtml.replace(originalSrc, base64);
      }
    } catch (err) {
      console.warn(`Failed to process image: ${originalSrc}`, err);
      // 失敗時保留原始 URL（Word 會嘗試從網路載入）
    }
  }

  return processedHtml;
}

async function fetchGoogleDriveImage(url: string): Promise<string> {
  // 提取 fileId
  const fileIdMatch = url.match(/[-\w]{25,}/);
  if (!fileIdMatch) throw new Error('Invalid Drive URL');

  const fileId = fileIdMatch[0];
  const proxyUrl = `/api/drive/view/${fileId}`;

  const response = await fetch(proxyUrl);
  if (!response.ok) throw new Error('Drive fetch failed');

  const blob = await response.blob();
  return await blobToBase64(blob);
}

async function fetchExternalImage(url: string): Promise<string> {
  const response = await fetch(url);
  if (!response.ok) throw new Error('External fetch failed');

  const blob = await response.blob();
  return await blobToBase64(blob);
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}
```

### 3. Integration Example

**檔案**: `src/components/knowledge/NoteDetail.tsx`

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
    <div>
      {/* ... existing code ... */}
      <button onClick={handleExportWord} disabled={isExporting}>
        {isExporting ? '⏳ 匯出中...' : '📥 匯出 Word'}
      </button>
      {error && <div className="text-red-500">{error}</div>}
    </div>
  );
}
```

## Data Flow

```
1. 使用者點擊「📥 匯出 Word」
   ↓
2. useWordExport Hook 啟動
   ↓
3. 從 Editor 取得 HTML 內容 (editor.getHTML())
   ↓
4. 掃描 HTML 中的 <img> 標籤
   ↓
5. 逐一處理圖片：
   - Base64 → 保持不變
   - Google Drive URL → 透過 /api/drive/view/{fileId} 下載
   - 外部 URL → fetch() 下載
   ↓
6. 將圖片轉為 Base64 並替換 HTML 中的 src
   ↓
7. 組裝完整 HTML（包含樣式與 metadata）
   ↓
8. 調用 asBlob(html) 轉為 DOCX Blob
   ↓
9. 使用 saveAs() 觸發瀏覽器下載
   ↓
10. 顯示成功/失敗訊息
```

## Error Handling Strategy

### 1. 圖片處理錯誤

```typescript
// 單一圖片失敗不中斷整體匯出
try {
  const base64 = await fetchImage(url);
  processedHtml = processedHtml.replace(url, base64);
} catch (err) {
  console.warn(`Image processing failed: ${url}`);
  // 保留原始 URL，Word 會嘗試從網路載入
  // 或者替換為佔位符：
  // processedHtml = processedHtml.replace(url, 'data:image/png;base64,iVBORw0...');
}
```

### 2. 轉換失敗

```typescript
try {
  const blob = asBlob(fullHtml);
} catch (err) {
  throw new Error('HTML 格式異常，無法轉換為 Word。請檢查內容是否包含不支援的元素。');
}
```

### 3. 下載失敗

```typescript
try {
  saveAs(blob, filename);
} catch (err) {
  throw new Error('檔案下載失敗。請檢查瀏覽器權限設定。');
}
```

## Performance Optimization

### 1. 圖片壓縮

```typescript
async function compressImage(base64: string, maxWidth = 1200): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const scale = Math.min(1, maxWidth / img.width);
      canvas.width = img.width * scale;
      canvas.height = img.height * scale;

      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

      resolve(canvas.toDataURL('image/jpeg', 0.85));
    };
    img.src = base64;
  });
}
```

### 2. 並行圖片處理

```typescript
const imagePromises = matches.map(async (match) => {
  const src = match[1];
  const base64 = await fetchAndConvert(src);
  return { src, base64 };
});

const results = await Promise.allSettled(imagePromises);
results.forEach((result) => {
  if (result.status === 'fulfilled') {
    processedHtml = processedHtml.replace(result.value.src, result.value.base64);
  }
});
```

### 3. 進度指示

```typescript
const [progress, setProgress] = useState(0);

for (let i = 0; i < matches.length; i++) {
  await processImage(matches[i]);
  setProgress(Math.round(((i + 1) / matches.length) * 100));
}
```

## Testing Strategy

### Unit Tests

```typescript
describe('useWordExport', () => {
  it('should convert plain HTML to DOCX', async () => {
    const { exportToWord } = useWordExport();
    const result = await exportToWord({
      title: 'Test Note',
      htmlContent: '<p>Hello World</p>',
    });
    expect(result.success).toBe(true);
  });

  it('should handle Base64 images', async () => {
    const html = '<img src="data:image/png;base64,iVBORw0..." />';
    const result = await exportToWord({ title: 'Test', htmlContent: html });
    expect(result.success).toBe(true);
  });

  it('should handle image fetch failures gracefully', async () => {
    const html = '<img src="https://invalid-url.com/image.jpg" />';
    const result = await exportToWord({ title: 'Test', htmlContent: html });
    expect(result.success).toBe(true); // 應該成功，只是保留原始 URL
  });
});
```

### Integration Tests

1. 測試包含各種格式（粗體、清單、表格）的筆記匯出。
2. 測試包含 Google Drive 圖片的筆記。
3. 測試大型筆記（>10MB HTML）的效能。

### Manual QA Checklist

- [ ] 匯出的 .docx 可在 Microsoft Word 2016+ 正常開啟
- [ ] 匯出的 .docx 可在 Google Docs 正常開啟
- [ ] 中文字體顯示正確
- [ ] 圖片清晰度可接受（≥600px 寬）
- [ ] 表格邊框與對齊正確
- [ ] 待辦清單顯示為勾選框符號
- [ ] 超連結可點擊
- [ ] 檔名不包含非法字元

## Security Considerations

1. **檔名 Sanitization**: 移除可能導致路徑穿越的字元（`../`, `<`, `>`）。
2. **圖片來源驗證**: 僅允許從信任的來源（Google Drive, Base64）載入圖片。
3. **CORS 限制**: 外部圖片可能因 CORS 政策無法 fetch，需要提示使用者。
4. **檔案大小限制**: 限制單一匯出的檔案大小（例如：< 50MB）以避免瀏覽器崩潰。

## Accessibility

- 匯出按鈕應具備 `aria-label` 描述其功能。
- 鍵盤快捷鍵：`Ctrl+Shift+E` 觸發匯出（可選）。
- 匯出過程中顯示 Loading Spinner 與文字說明。
