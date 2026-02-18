# Tasks: 巨石元件重構執行清單

## P0 - 立即重構（最嚴重）

### 1. 重構 `revenueLabActions.ts`（453 行）

- [ ] 1.1 建立 `src/services/revenueLabService.ts`，移入 `fetchWinRateFromDB`（157 行）
- [ ] 1.2 建立 `src/services/revenueLabService.ts`，移入 `fetchHeatmapFromDB`（157 行）
- [ ] 1.3 更新 `revenueLabActions.ts`，改為 import 並委派給 `revenueLabService`
- [ ] 1.4 確認 `revenueLabActions.ts` 行數降至 100 行以內
- [ ] 1.5 驗證：`yarn build` 無 TypeScript 錯誤，WinRateLab/RevenueHeatmap 頁面正常顯示

### 2. 重構 `WeatherAnimation.tsx`（374 行）

- [ ] 2.1 建立 `src/components/layout/weather/` 目錄
- [ ] 2.2 分析 `renderWeatherEffect` 的 switch-case，識別各天氣效果區塊
- [ ] 2.3 建立 `effects/RainEffect.tsx`，移入雨天動畫邏輯
- [ ] 2.4 建立 `effects/SunEffect.tsx`，移入晴天動畫邏輯
- [ ] 2.5 建立 `effects/CloudEffect.tsx`，移入多雲動畫邏輯
- [ ] 2.6 建立 `effects/SnowEffect.tsx`，移入雪天動畫邏輯（如有）
- [ ] 2.7 建立 `effects/ThunderEffect.tsx`，移入雷雨動畫邏輯（如有）
- [ ] 2.8 建立 `useWeatherEffect.ts`，移入天氣代碼 → 效果映射邏輯
- [ ] 2.9 重寫 `WeatherAnimation.tsx` 主元件，只負責組裝（目標 < 80 行）
- [ ] 2.10 建立 `src/components/layout/weather/index.ts` re-export，確保現有 import 不需修改
- [ ] 2.11 驗證：天氣動畫在 Dashboard 頁面正常顯示

## P1 - 高優先

### 3. 重構 `useWordExport.ts`（386 行）

- [ ] 3.1 建立 `src/utils/wordExport/` 目錄
- [ ] 3.2 建立 `imageProcessor.ts`，移入 5 個圖片處理函式
- [ ] 3.3 建立 `htmlAssembler.ts`，移入 `assembleFullHtml` 和 `escapeHtml`
- [ ] 3.4 建立 `fileUtils.ts`，移入 `sanitizeFilename`、`getDateString`、`convertTaskLists`
- [ ] 3.5 建立 `src/utils/wordExport/index.ts` 統一 export
- [ ] 3.6 更新 `useWordExport.ts`，改為 import 工具函式，確認行數 < 80 行
- [ ] 3.7 驗證：知識庫筆記的 Word 匯出功能正常

### 4. 重構 `RevenueHeatmap.tsx`（379 行）

- [ ] 4.1 建立 `src/components/features/investment/heatmap/` 目錄
- [ ] 4.2 建立 `heatmapUtils.ts`，移入 `valueToColor`、`textColorClass`、`formatMonth`
- [ ] 4.3 建立 `HeatmapCell.tsx`，移入 `HeatmapCellContent` 元件
- [ ] 4.4 建立 `ColorLegend.tsx`，移入 `ColorLegend` 元件
- [ ] 4.5 重寫 `RevenueHeatmap.tsx` 主元件，只保留主邏輯（目標 < 120 行）
- [ ] 4.6 建立 `index.ts` re-export
- [ ] 4.7 更新 `src/app/investment/page.tsx` 的 import 路徑（如有需要）
- [ ] 4.8 驗證：熱力圖頁面正常顯示，年份切換功能正常

### 5. 重構 `WinRateLab.tsx`（341 行）

- [ ] 5.1 建立 `src/components/features/investment/win-rate/` 目錄
- [ ] 5.2 建立 `MetricCard.tsx`，移入 `MetricCard` 元件（含 props interface）
- [ ] 5.3 建立 `StockListAccordion.tsx`，移入 `StockListAccordion` 元件（含 props interface）
- [ ] 5.4 重寫 `WinRateLab.tsx` 主元件，只保留主邏輯（目標 < 150 行）
- [ ] 5.5 建立 `index.ts` re-export
- [ ] 5.6 更新 `src/app/investment/page.tsx` 的 import 路徑（如有需要）
- [ ] 5.7 驗證：勝率回測頁面正常顯示，年份切換與股票清單展開功能正常

## P2 - 中優先

### 6. 重構 `identify/page.tsx`（363 行）

- [ ] 6.1 建立 `src/hooks/useIdentifyPage.ts`
- [ ] 6.2 移入所有狀態定義（`parsedData`, `loading`, `progress`, `error` 等）
- [ ] 6.3 移入 `handleUpload` 函式（含 API 呼叫邏輯）
- [ ] 6.4 移入 `copyToClipboard` 函式
- [ ] 6.5 更新 `identify/page.tsx`，使用 `useIdentifyPage` hook，確認行數 < 150 行
- [ ] 6.6 驗證：身份辨識頁面正常，上傳功能與進度條正常運作

### 7. 重構 `NoteDetail.tsx`（316 行）

- [ ] 7.1 建立 `src/hooks/useNoteDetail.ts`
- [ ] 7.2 移入 `loadNote`、`checkIfLiked`、`handleLike`、`handleDelete` 函式
- [ ] 7.3 移入相關狀態（`note`, `isLiked`, `loading` 等）
- [ ] 7.4 更新 `NoteDetail.tsx`，使用 `useNoteDetail` hook，確認行數 < 120 行
- [ ] 7.5 驗證：知識庫筆記詳情頁正常，按讚/刪除功能正常

### 8. 重構 `BasicInfoSection.tsx`（334 行）

- [ ] 8.1 分析 JSX 結構，識別可獨立的子區塊（如：基本資訊區、貸款比較區等）
- [ ] 8.2 建立子元件（如 `LoanInfoBlock.tsx`、`PropertyInfoBlock.tsx`）
- [ ] 8.3 更新 `BasicInfoSection.tsx`，組裝子元件，確認行數 < 150 行
- [ ] 8.4 驗證：案件編輯頁面基本資訊區塊正常顯示與互動

## 驗收標準

- [ ] 所有 P0/P1 目標檔案行數降至 200 行以下
- [ ] `yarn build` 無 TypeScript 錯誤
- [ ] `yarn dev` 所有重構頁面功能正常
- [ ] 無任何 `any` 型別新增（遵守 TypeScript 嚴格模式）
