# Specs: 巨石元件重構需求規格

## ADDED Capabilities

---

### Capability: `revenue-lab-query-service`

**目標**：將 `revenueLabActions.ts` 的 DB 查詢邏輯抽取為獨立 service

#### Requirement: 勝率查詢 Service

`revenueLabService.ts` SHALL 匯出 `fetchWinRateFromDB` 函式，
接受 `(year: number, low?: number, high?: number)` 參數，
回傳 `Promise<WinRateYearData | null>`。

#### Scenario: 正常查詢

- **WHEN** 呼叫 `fetchWinRateFromDB(2025, 50, 100)`
- **THEN** 回傳符合 `WinRateYearData` 型別的資料，不含快取包裝

#### Requirement: 熱力圖查詢 Service

`revenueLabService.ts` SHALL 匯出 `fetchHeatmapFromDB` 函式，
接受 `(year: number)` 參數，回傳 `Promise<HeatmapYearData | null>`。

#### Requirement: Server Action 薄層

`revenueLabActions.ts` SHALL 只保留 `unstable_cache` 包裝，
委派實際查詢給 `revenueLabService`，單檔行數 SHALL NOT 超過 100 行。

---

### Capability: `word-export-utils`

**目標**：將 `useWordExport.ts` 的工具函式抽取為純函式模組

#### Requirement: 圖片處理模組

`src/utils/wordExport/imageProcessor.ts` SHALL 匯出：

- `processImages(html: string, setProgress?: (p: number) => void): Promise<string>`
- `fetchGoogleDriveImage(url: string): Promise<string | null>`
- `fetchExternalImage(url: string): Promise<string | null>`
- `blobToBase64(blob: Blob): Promise<string>`
- `compressImage(base64: string, maxWidth?: number, quality?: number): Promise<string>`

#### Requirement: HTML 組裝模組

`src/utils/wordExport/htmlAssembler.ts` SHALL 匯出：

- `assembleFullHtml(title: string, bodyContent: string): string`
- `escapeHtml(text: string): string`

#### Requirement: 檔案工具模組

`src/utils/wordExport/fileUtils.ts` SHALL 匯出：

- `sanitizeFilename(name: string): string`
- `getDateString(): string`
- `convertTaskLists(html: string): string`

#### Requirement: Hook 精簡

`useWordExport` Hook SHALL 只保留狀態管理與 `exportToWord` 函式，
單檔行數 SHALL NOT 超過 80 行。

#### Scenario: 匯出功能不受影響

- **WHEN** 呼叫 `exportToWord({ title, htmlContent })`
- **THEN** 行為與重構前完全相同，成功下載 `.docx` 檔案

---

### Capability: `weather-animation-effects`

**目標**：將 `WeatherAnimation.tsx` 的天氣效果拆分為獨立子元件

#### Requirement: 效果元件獨立

`src/components/layout/weather/effects/` 目錄 SHALL 包含各天氣效果的獨立元件，
每個效果元件 SHALL NOT 超過 80 行。

#### Requirement: 主元件精簡

`WeatherAnimation.tsx` SHALL 只負責根據天氣代碼選擇並渲染對應效果元件，
行數 SHALL NOT 超過 80 行。

#### Requirement: 向後相容

`src/components/layout/WeatherAnimation.tsx` SHALL 繼續存在（或透過 index.ts re-export），
確保現有 import 路徑不需修改。

#### Scenario: 天氣動畫正常顯示

- **WHEN** `useWeather` hook 回傳天氣代碼
- **THEN** 對應的天氣動畫效果正確渲染，視覺效果與重構前相同

---

### Capability: `heatmap-color-utils`

**目標**：將 `RevenueHeatmap.tsx` 的工具函式與子元件拆分

#### Requirement: 工具函式模組

`src/components/features/investment/heatmap/heatmapUtils.ts` SHALL 匯出：

- `valueToColor(value: number, mode: HeatmapStatMode): string`
- `textColorClass(value: number, mode: HeatmapStatMode): string`
- `formatMonth(month: string): string`

#### Requirement: 子元件獨立

- `HeatmapCell.tsx` SHALL 匯出 `HeatmapCellContent` 元件
- `ColorLegend.tsx` SHALL 匯出 `ColorLegend` 元件

#### Requirement: 主元件精簡

`RevenueHeatmap.tsx` SHALL 只保留主元件邏輯，行數 SHALL NOT 超過 120 行。

---

### Capability: `win-rate-sub-components`

**目標**：將 `WinRateLab.tsx` 的子元件拆分至獨立檔案

#### Requirement: 子元件獨立

- `MetricCard.tsx` SHALL 匯出 `MetricCard` 元件，接受相同 props interface
- `StockListAccordion.tsx` SHALL 匯出 `StockListAccordion` 元件，接受相同 props interface

#### Requirement: 主元件精簡

`WinRateLab.tsx` SHALL 只保留主元件邏輯，行數 SHALL NOT 超過 150 行。

---

### Capability: `identify-page-hook`

**目標**：將 `identify/page.tsx` 的業務邏輯抽取為 Hook

#### Requirement: Hook 抽取

`src/hooks/useIdentifyPage.ts` SHALL 匯出 `useIdentifyPage` hook，
包含所有狀態（`parsedData`, `loading`, `progress` 等）與 `handleUpload`、`copyToClipboard` 函式。

#### Requirement: Page 精簡

`src/app/identify/page.tsx` SHALL 只保留 UI 渲染邏輯，行數 SHALL NOT 超過 150 行。

#### Scenario: 身份辨識功能正常

- **WHEN** 使用者上傳身份證圖片
- **THEN** AI 辨識流程正常執行，進度條正確更新，結果正確顯示

---

### Capability: `note-detail-hook`

**目標**：將 `NoteDetail.tsx` 的資料獲取邏輯抽取為 Hook

#### Requirement: Hook 抽取

`src/hooks/useNoteDetail.ts` SHALL 匯出 `useNoteDetail(noteId: string)` hook，
包含 `note`, `isLiked`, `loading` 狀態與 `handleLike`、`handleDelete`、`loadNote` 函式。

#### Requirement: 元件精簡

`NoteDetail.tsx` SHALL 只保留 UI 渲染邏輯，行數 SHALL NOT 超過 120 行。

#### Scenario: 筆記詳情正常載入

- **WHEN** 傳入有效的 `noteId`
- **THEN** 筆記內容正確顯示，按讚/刪除功能正常運作

## CHANGED Requirements

（本次重構不改變任何現有行為，僅移動程式碼位置，無 CHANGED requirements）
