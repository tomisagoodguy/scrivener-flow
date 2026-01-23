# Proposal: 筆記 Word 匯出功能 (Notes Word Export)

## Problem

當前系統的「工作筆記 (Knowledge Base)」與「速記 (Quick Notes)」雖然支援富文本編輯（包含圖片、表格、待辦事項等），但使用者無法將撰寫完成的內容下載為 Word 文件（.docx）。這導致以下問題：

1. **離線編輯限制**: 使用者無法在沒有網路的情況下繼續編輯筆記內容。
2. **跨平台分享困難**: 代書（地政士）需要將案件筆記轉發給客戶、銀行或合作夥伴時，Word 格式是業界標準。
3. **備份與存檔**: 使用者無法輕鬆建立本地備份，所有資料僅存在於雲端。
4. **格式保留需求**: 使用者希望下載後的文件能保留原有的格式（粗體、斜體、清單、表格、圖片等）。

## Proposed Change

本功能將為「工作筆記」與「速記」系統新增「📥 匯出為 Word」按鈕，讓使用者能將當前筆記內容轉換為標準的 .docx 檔案並下載。

### 核心功能

1. **單一筆記匯出** (`/knowledge` 頁面):
   - 在筆記詳細檢視/編輯頁面新增「匯出為 Word」按鈕。
   - 將富文本內容（HTML）轉換為 .docx 格式。
   - 檔案命名規則：`{筆記標題}_{日期}.docx`（例如：`AB案件備註_2026-01-23.docx`）。

2. **批量筆記匯出** （可選，未來擴充）:
   - 在筆記清單頁面支援勾選多個筆記，批量下載為壓縮檔（.zip）。

3. **保留富文本格式**:
   - **文字格式**: 粗體、斜體、底線、刪除線、標題層級。
   - **清單**: 有序清單、無序清單、待辦事項清單（轉為勾選框）。
   - **表格**: 保留表格結構與儲存格合併。
   - **圖片**: 嵌入圖片（Base64 或從 Google Drive URL 下載後嵌入）。
   - **連結**: 保留超連結與 URL。

4. **技術方案**:
   - **前端**: 使用 `html-docx-js` 或 `docx` npm 套件進行 HTML → DOCX 轉換。
   - **後端（可選）**: 如果前端轉換品質不佳，可建立 Server Action 使用 `mammoth` 或 `pandoc` 進行伺服器端轉換。
   - **圖片處理**: 若圖片為 Google Drive URL，需先透過 Proxy API 下載並轉為 Base64 再嵌入。

## Objectives

- **提升使用者彈性**: 允許離線編輯與分享。
- **符合業界標準**: Word 格式為代書業最常使用的文件格式。
- **保持品質**: 確保匯出的文件格式正確、圖片清晰。
- **快速實作**: 優先實作單一筆記匯出，批量功能可後續迭代。

## Technical Approach

### Option 1: 純前端轉換 (推薦)

```typescript
// 使用 html-docx-js 套件
import { asBlob } from 'html-docx-js/dist/html-docx';

const handleExportWord = () => {
  const htmlContent = `
    <!DOCTYPE html>
    <html>
      <head><meta charset="UTF-8"></head>
      <body>${editor.getHTML()}</body>
    </html>
  `;
  
  const blob = asBlob(htmlContent);
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${noteTitle}_${new Date().toISOString().split('T')[0]}.docx`;
  link.click();
  URL.revokeObjectURL(url);
};
```

**優點**: 不需後端處理，速度快。  
**缺點**: 圖片處理可能需要額外邏輯（需轉為 Base64）。

### Option 2: Server Action 轉換（備選）

```typescript
// app/actions/exportWord.ts
'use server';

export async function exportToWord(htmlContent: string, title: string) {
  // 使用 pandoc 或其他套件進行轉換
  const docxBuffer = await convertHtmlToDocx(htmlContent);
  return { buffer: docxBuffer, filename: `${title}.docx` };
}
```

**優點**: 更好的格式控制，處理複雜圖片。  
**缺點**: 需要伺服器資源，增加延遲。

### 圖片處理策略

1. **Base64 圖片**: 直接嵌入。
2. **Google Drive URL**:
   - 透過現有的 `/api/drive/view/[fileId]` 端點下載圖片。
   - 轉為 Base64 後嵌入 Word 文件。
3. **外部 URL**: 嘗試 fetch 並轉為 Base64，失敗則保留原始 URL。

## UI/UX Changes

### 1. 筆記詳細頁面 (`/knowledge`)

在筆記編輯器的工具列右上角新增：

```
[✏️ 編輯] [📥 匯出 Word] [🗑️ 刪除]
```

### 2. 匯出進度提示

```
⏳ 正在轉換格式，請稍候...
✅ 檔案已下載！
```

### 3. 錯誤處理

```
⚠️ 匯出失敗：圖片載入逾時。請重試或移除部分圖片。
```

## Risks & Mitigations

### 1. **格式轉換品質**

- **風險**: HTML → DOCX 轉換可能丟失某些 CSS 樣式或複雜排版。
- **緩解**:
  - 使用業界驗證的套件（如 `html-docx-js`）。
  - 提供「預覽 HTML」功能，讓使用者先檢視匯出前的格式。
  - 文件中加入 Disclaimer：「匯出功能盡力保留格式，但建議下載後檢視並微調。」

### 2. **圖片載入失敗**

- **風險**: Google Drive 圖片可能因權限或網路問題無法載入。
- **緩解**:
  - 實作 Retry 機制（最多重試 3 次）。
  - 失敗時在 Word 文件中插入佔位符（例如：`[圖片載入失敗: {URL}]`）。
  - 提供錯誤訊息，引導使用者手動插入圖片。

### 3. **大型文件效能**

- **風險**: 包含數十張高解析度圖片的筆記可能導致瀏覽器凍結或記憶體溢位。
- **緩解**:
  - 限制單一匯出的圖片數量（例如：最多 20 張）。
  - 在匯出前壓縮圖片（例如：限制寬度為 1200px）。
  - 顯示進度指示器，讓使用者了解處理進度。

### 4. **相容性問題**

- **風險**: 生成的 .docx 在某些 Word 版本（如 Office 2007）中可能顯示異常。
- **緩解**:
  - 使用 OOXML 標準格式（docx 套件預設支援）。
  - 在文件說明中建議使用 Office 2016 以上版本或 Google Docs 開啟。

### 5. **待辦清單轉換**

- **風險**: Tiptap 的 TaskList 在 Word 中沒有直接對應格式。
- **緩解**:
  - 轉為 `☐` / `☑` 符號 + 文字。
  - 或使用 Word 的「內容控制項」（Content Controls）實作勾選框（較複雜）。

## Dependencies

### NPM Packages

```json
{
  "html-docx-js": "^0.3.1",  // HTML → DOCX 轉換
  "file-saver": "^2.0.5"     // 觸發檔案下載
}
```

### Optional (進階轉換)

```json
{
  "docx": "^8.0.0"  // 更精細的 DOCX 生成控制
}
```

## Success Criteria

1. ✅ 使用者可以在筆記詳細頁面點擊「匯出 Word」按鈕。
2. ✅ 下載的 .docx 檔案能在 Microsoft Word / Google Docs 正常開啟。
3. ✅ 文字格式（粗體、斜體、標題）正確保留。
4. ✅ 清單與表格結構保持完整。
5. ✅ 圖片嵌入成功率 ≥ 90%（允許少數外部圖片失敗）。
6. ✅ 匯出時間 < 5 秒（包含 3 張圖片的一般筆記）。
7. ✅ 錯誤訊息清楚，使用者知道如何處理失敗情況。

## Future Enhancements

1. **批量匯出**: 支援選取多筆記並下載為 .zip。
2. **PDF 匯出**: 提供 PDF 格式選項（使用 `jsPDF` + `html2canvas`）。
3. **自訂範本**: 允許使用者上傳自己的 Word 範本（例如：公司 Logo、頁首頁尾）。
4. **雲端同步**: 匯出後自動上傳至 Google Drive（可選）。
5. **版本記錄**: 追蹤匯出歷史，方便還原舊版本。

## Timeline Estimate

- **Phase 1** (3 天): 純文字與基本格式匯出（無圖片）。
- **Phase 2** (2 天): Base64 圖片嵌入支援。
- **Phase 3** (2 天): Google Drive 圖片處理與錯誤處理。
- **Phase 4** (1 天): UI 優化與測試。

**Total**: ~8 工作天

## Open Questions

1. 是否需要支援「匯出為 PDF」？（可能更通用）
2. 批量匯出的優先級為何？
3. 是否需要在匯出時加入「浮水印」或「產生日期」？
4. 圖片品質壓縮比例如何設定？（目前建議：最大寬度 1200px）
