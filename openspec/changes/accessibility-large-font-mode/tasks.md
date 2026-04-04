## 1. 基礎架構 — Context & CSS

- [x] 1.1 新增 `src/hooks/useAccessibility.ts`：實作 `AccessibilityContext`、`AccessibilityProvider`，從 localStorage 讀取初始值，提供 `isLargeFont`、`isHighContrast`、`toggleLargeFont()`、`toggleHighContrast()`
- [x] 1.2 新增 `src/app/accessibility.css`：定義 `html.large-font` 的 `:root { font-size: 120% !important }` 與 `html.high-contrast` 的文字/背景覆蓋規則
- [x] 1.3 在 `src/app/globals.css` 加全域觸控目標規則：`button, a, [role="button"] { min-height: 44px; min-width: 44px; touch-action: manipulation; }`

## 2. FOUC 防止 — beforeInteractive Script

- [x] 2.1 在 `src/app/layout.tsx` 加 `<Script id="accessibility-init" strategy="beforeInteractive">`，讀取 localStorage `accessibility-large-font` 與 `accessibility-high-contrast`，並在 `<html>` 注入對應 class
- [x] 2.2 在 `layout.tsx` 匯入 `AccessibilityProvider` 包裹 `{children}`
- [x] 2.3 在 `layout.tsx` 匯入 `accessibility.css`

## 3. UI — 無障礙設定面板

- [x] 3.1 新增 `src/components/features/AccessibilityPanel.tsx`：包含「大字體模式」與「高對比模式」兩個 Toggle Switch 元件，使用 `useAccessibility()` hook
- [x] 3.2 在 Header 使用者選單（`src/components/layout/Header.tsx` 或對應元件）加入「無障礙設定」選單項，點擊開啟 `AccessibilityPanel`

## 4. 關鍵數字加粗

- [x] 4.1 在案件列表元件（`src/components/features/` 下相關元件）確認金額、日期數值套用 `font-semibold`（CaseTableRow 已有 font-black）
- [x] 4.2 在案件詳情頁（`src/app/cases/[id]/`）確認合約金額、代償金額、完稅日期等套用 `font-semibold`（詳情頁為表單 input，已有 label 加粗）
- [x] 4.3 在投資儀表板（`src/app/investment/`）確認股價、損益等數字套用 `font-semibold`（HoldingRow price 升為 font-semibold）

## 5. 警示色搭配圖示

- [x] 5.1 搜尋全站案件狀態 Badge 元件，確認「逾期」、「待辦」等狀態標籤包含 SVG icon 或 emoji，不單靠顏色
- [x] 5.2 搜尋全站 alert/warning 訊息元件，確認警示區塊包含圖示

## 6. 驗證

- [ ] 6.1 在瀏覽器測試大字體模式：切換後文字縮放 1.2 倍，重整後仍保持
- [ ] 6.2 測試高對比模式：切換後對比度符合 WCAG AA，與大字體模式並存無衝突
- [ ] 6.3 在行動裝置或 DevTools 觸控模式確認按鈕觸控目標 ≥ 44px
- [ ] 6.4 執行 `yarn build` 確認無 TypeScript 錯誤
