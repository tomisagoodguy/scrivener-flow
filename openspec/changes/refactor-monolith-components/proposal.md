# Proposal: 巨石元件重構 (Refactor Monolith Components)

## Problem

透過全專案掃描，發現多個超過 300 行的巨石檔案，違反單一職責原則（SRP），導致：

1. **可讀性差**：單一函式/元件承擔過多責任，難以快速理解邏輯
2. **測試困難**：龐大元件無法進行單元測試，只能做整合測試
3. **耦合過高**：UI 渲染、資料獲取、業務邏輯混在同一檔案
4. **維護成本高**：修改任何細節都需要理解整個龐大檔案

### 掃描結果（行數 > 200 的巨石檔案）

| 行數 | 檔案 | 問題類型 |
|------|------|---------|
| 453 | `src/app/actions/revenueLabActions.ts` | 多模組混合（勝率+熱力圖+黃金區間），單函式 157 行 |
| 386 | `src/hooks/useWordExport.ts` | Hook 混入工具函式（圖片處理、HTML 組裝），職責不清 |
| 379 | `src/components/features/investment/RevenueHeatmap.tsx` | 主元件 270 行，顏色計算、格式化、UI 全混在一起 |
| 374 | `src/components/layout/WeatherAnimation.tsx` | 單一函式 270 行，天氣動畫邏輯全部堆疊 |
| 363 | `src/app/identify/page.tsx` | Page 元件承擔 API 呼叫、狀態管理、UI 渲染 |
| 341 | `src/components/features/investment/WinRateLab.tsx` | 多個子元件定義在同一檔案 |
| 334 | `src/components/features/cases/edit-case/BasicInfoSection.tsx` | 單一 JSX return 超過 300 行 |
| 316 | `src/components/knowledge/NoteDetail.tsx` | 資料獲取 + 互動邏輯 + UI 全混合 |
| 315 | `src/components/knowledge/NoteDetail.tsx` | 同上 |
| 301 | `src/components/knowledge/TeamKnowledgeBase.tsx` | 複雜狀態管理與 UI 混合 |
| 293 | `src/app/notes/page.tsx` | Page 層承擔過多邏輯 |
| 282 | `src/lib/crypto/secureApi.ts` | 加密工具與 API 呼叫混合 |
| 276 | `src/components/todo/TodoCalendarView.tsx` | 日曆 UI 與業務邏輯耦合 |
| 275 | `src/app/actions/googleDrive.ts` | Server Action 過於龐大 |
| 262 | `src/components/features/investment/ChipsChart.tsx` | 圖表元件含大量資料轉換邏輯 |
| 261 | `src/components/dashboard/AIWorkAssistant.tsx` | AI 整合 + UI 混合 |
| 261 | `src/lib/crypto/keyManagement.ts` | 金鑰管理邏輯過於集中 |
| 260 | `src/components/knowledge/editor/EditorToolbar.tsx` | 工具列元件含複雜邏輯 |
| 259 | `src/services/caseService.ts` | 服務層多個 CRUD 操作混合 |
| 257 | `src/components/features/cases/new-case/BatchCaseReview.tsx` | 批次審查 UI + 邏輯混合 |

## Capabilities

### 新增能力

- `revenue-lab-query-service`：將 `revenueLabActions.ts` 的 DB 查詢邏輯抽取為獨立 service
- `word-export-utils`：將 `useWordExport.ts` 的工具函式抽取為 `src/utils/wordExport/` 模組
- `weather-animation-effects`：將 `WeatherAnimation.tsx` 的天氣效果拆分為獨立子元件
- `identify-page-hook`：將 `identify/page.tsx` 的業務邏輯抽取為 `useIdentifyPage` hook
- `heatmap-color-utils`：將 `RevenueHeatmap.tsx` 的顏色計算邏輯抽取為純函式模組

### 受影響能力

- `revenue-lab-actions`：重構後僅保留 Server Action 入口，委派給 service 層
- `win-rate-lab`：子元件（MetricCard、StockListAccordion）移至獨立檔案
- `note-detail`：資料獲取邏輯移至 `useNoteDetail` hook
- `basic-info-section`：拆分為多個子區塊元件

## Impact

### 受影響的程式碼

- `src/app/actions/revenueLabActions.ts` → 拆分為 action + service
- `src/hooks/useWordExport.ts` → hook 保留，工具函式移至 utils
- `src/components/features/investment/RevenueHeatmap.tsx` → 拆分子元件
- `src/components/features/investment/WinRateLab.tsx` → 拆分子元件
- `src/components/layout/WeatherAnimation.tsx` → 拆分天氣效果元件
- `src/app/identify/page.tsx` → 抽取 hook
- `src/components/knowledge/NoteDetail.tsx` → 抽取 hook

### 優先順序（依影響範圍與複雜度）

**P0 - 立即重構（最嚴重）**

1. `revenueLabActions.ts`（453 行，兩個 157 行超長函式）
2. `WeatherAnimation.tsx`（374 行，單一函式 270 行）

**P1 - 高優先**
3. `useWordExport.ts`（386 行，Hook 混入工具函式）
4. `RevenueHeatmap.tsx`（379 行，主元件 270 行）
5. `WinRateLab.tsx`（341 行，多子元件混合）

**P2 - 中優先**
6. `identify/page.tsx`（363 行，Page 承擔過多）
7. `NoteDetail.tsx`（316 行，資料獲取混合 UI）
8. `BasicInfoSection.tsx`（334 行，JSX 過長）

### 不受影響的部分

- 公開 API 介面（props interface 保持不變）
- 路由結構
- 資料庫 schema
- 測試檔案（現有測試應繼續通過）
