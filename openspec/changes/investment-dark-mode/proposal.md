# Proposal: Global Dark Mode (Full Site)

## Overview

**Change ID**: `investment-dark-mode` _(Note: ID 保留，但範圍已擴大)_
**Status**: Proposed
**Created**: 2026-02-03
**Updated**: 2026-02-03 (Scope expanded to全站)
**Problem**: 目前整個 Web 應用被強制鎖定為淺色模式（`globals.css` 第 3-17 行明確禁用深色），在夜間或低光環境下使用體驗不佳。使用者期望全站都能切換至舒適的深色模式。

## Background

**現狀分析**：

- ThemeProvider 存在但被鎖定為 `light` only (src/components/providers/ThemeProvider.tsx)
- globals.css 有 `color-scheme: light only` 強制禁用深色模式
- 多數元件已有 `dark:` class variants（Header、SideNav 等）
- 表示專案曾規劃過深色模式，但後來被禁用

**解決方案**：

- 移除 globals.css 中的深色模式禁用程式碼
- 重構 ThemeProvider，實作真正的主題切換邏輯
- 啟用全站深色模式支援

## User Value

使用者能夠：

- **全站切換深色/淺色模式**：所有頁面（案件管理、投資監控、共筆等）統一支援
- **自動記憶偏好**：系統記住使用者的模式選擇
- **降低眼部疲勞**：深色模式在夜間或長時間使用更舒適
- **專業視覺設計**：採用 UI PRO MAX 標準，結合 Fintech 配色與 Dark Mode (OLED) 風格

## Scope

### In Scope

- ✅ **重構 ThemeProvider**：實作真正的主題切換邏輯與持久化
- ✅ **移除深色模式禁用**：清理 globals.css 中的強制淺色設定
- ✅ **設計 Fintech Dark Mode 配色系統**：全站統一的深色配色
- ✅ **新增 ThemeToggler Component**：全局主題切換器（放置於 Header 或顯著位置）
- ✅ **升級全站元件**：確保所有頁面的元件正確支援 dark mode
  - Layout: Header, SideNav
  - Pages: 案件管理 (/cases), 投資監控 (/investment), 共筆 (/knowledge), 等
  - Components: Cards, Tables, Forms, Charts
- ✅ **使用者偏好持久化**：localStorage 儲存主題選擇
- ✅ **WCAG AAA 對比度標準**：所有文字與互動元件符合無障礙規範

### Out of Scope

- ❌ 自動依系統偏好切換（手動切換優先，Phase 2 考慮）
- ❌ 多主題支援（僅深色/淺色二選一）
- ❌ Per-page 主題設定（全站統一主題）

## Acceptance Criteria

1. **視覺品質**：
   - 深色模式配色符合 Fintech 專業風格
   - 文字對比度達 WCAG AAA 標準 (7:1 以上)
   - 圖表、卡片、表格在深色模式下清晰可讀

2. **互動體驗**：
   - 切換器位於明顯且易於操作的位置
   - 切換動畫流暢（200ms transition）
   - 切換後立即生效，無需重新載入

3. **持久化**：
   - 使用者偏好儲存至 localStorage
   - 下次訪問自動套用上次選擇的模式

4. **一致性**：
   - 所有投資子頁面 (`/investment`, `/investment/dashboard/[code]`) 共享主題狀態

## Design Philosophy: UI PRO MAX

基於 UI/UX Pro Max 搜尋結果，採用以下設計原則：

### 配色系統 (Fintech Dark Mode)

```css
/* Based on UI Pro Max - Fintech/Crypto Palette */
--dark-primary: #F59E0B;      /* Amber 500 - 強調色 */
--dark-secondary: #FBBF24;    /* Amber 400 - 次要強調 */
--dark-cta: #8B5CF6;          /* Violet 500 - 行動按鈕 */
--dark-bg: #0F172A;           /* Slate 950 - 主背景 */
--dark-bg-secondary: #1E293B; /* Slate 900 - 卡片背景 */
--dark-text: #F8FAFC;         /* Slate 50 - 主文字 */
--dark-text-muted: #94A3B8;   /* Slate 400 - 次要文字 */
--dark-border: #334155;       /* Slate 700 - 邊框 */

/* Custom Accent for Charts */
--dark-chart-positive: #10B981; /* Emerald 500 - 正值 */
--dark-chart-negative: #EF4444; /* Red 500 - 負值 */
```

### 視覺風格特徵

- **Dark Mode (OLED)**: 深黑背景，高對比度，適合長時間閱讀
- **Glassmorphism**: 適度透明度與模糊效果，增添層次感
- **Subtle Shadows**: 使用 `shadow-xl` + glow effects 取代傳統陰影

### 字體系統

維持現有的 Inter 字體系統，但調整權重與間距：

- Heading: `font-semibold` (600) → `font-bold` (700)
- Body: `text-slate-700` → `dark:text-slate-300`

## Technical Approach

### 架構設計

```
Theme System
├─ Context: ThemeProvider (全局狀態)
│  ├─ State: 'light' | 'dark'
│  └─ Toggle: switchTheme()
│
├─ Persistence: localStorage ('theme')
│
├─ UI Components
│  ├─ ThemeToggler (Header Component)
│  └─ Dark Mode Variants (Tailwind CSS)
│
└─ Chart Adaptations
   ├─ RankingTrendChart
   ├─ ChangeImpactChart
   ├─ ChipsChart
   └─ BrokerChart
```

### 關鍵實作點

1. **Theme Context**:
   - 使用 React Context API 管理全局主題狀態
   - 提供 `useTheme()` hook 供元件使用

2. **Tailwind Configuration**:
   - 擴展 `tailwind.config.js` dark mode 配色
   - 確保所有自訂顏色有對應的 dark 變體

3. **Component Updates**:
   - 為所有元件加入 `dark:*` class variants
   - 優先處理高頻使用的元件：
     - HoldingsTable
     - DiffLedger
     - Chart Components

4. **Chart Library Compatibility**:
   - 若使用 Recharts: 提供 dark theme config
   - 若使用 Chart.js: 動態切換配色

## Dependencies

- 現有：`react`, `tailwindcss`, `lucide-react`
- 新增：無（使用現有技術棧）

## Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| 圖表元件不支援動態主題 | 切換後圖表顏色不變 | 預先測試，準備 theme props 注入機制 |
| 對比度不足 | 無法通過 WCAG 標準 | 使用對比度檢查工具驗證所有配色 |
| 效能問題（重繪） | 切換時卡頓 | 使用 CSS transitions，避免 JS 動畫 |
| 不同瀏覽器行為不一致 | 視覺效果差異 | 測試主流瀏覽器 (Chrome, Safari, Firefox) |

## Alternatives Considered

1. **純 CSS Variables 方案**：
   - 優點：輕量，無需 React Context
   - 缺點：難以管理複雜狀態，與現有架構不一致
   - **不選擇原因**：專案已使用 React，Context API 更易維護

2. **第三方主題庫 (next-themes)**：
   - 優點：開箱即用，支援系統偏好
   - 缺點：引入額外依賴，學習成本
   - **考慮採用**：若手動實作複雜度過高，可切換至此方案

3. **僅用 Tailwind dark: 不加 Context**：
   - 優點：實作簡單
   - 缺點：無法動態切換，需重新載入頁面
   - **不選擇原因**：UX 體驗差

**選擇方案**：React Context + Tailwind Dark Mode + localStorage

## Implementation Plan

詳見 `tasks.md`

## UI/UX Pro Max Checklist

基於 UI/UX Pro Max 標準，確保以下項目：

### Visual Quality

- [ ] 深色模式使用 OLED 級深黑背景 (`#0F172A`)
- [ ] 所有文字對比度 ≥ 7:1 (WCAG AAA)
- [ ] 圖表顏色在深色背景下清晰可見
- [ ] 使用 Fintech 配色系統（金黃 + 紫羅蘭強調色）

### Interaction

- [ ] 切換器有明確的視覺回饋
- [ ] Hover 狀態清晰（不造成 layout shift）
- [ ] 所有互動元件加入 `cursor-pointer`

### Accessibility

- [ ] Keyboard 可操作切換器（Enter/Space）
- [ ] Focus states 明顯
- [ ] 顏色不是唯一的資訊指標

### Performance

- [ ] 切換動畫 ≤ 200ms
- [ ] 無閃爍或重排問題
- [ ] localStorage 操作非同步化

## Success Metrics

1. **視覺驗證**：團隊確認深色模式符合專業標準
2. **對比度測試**：所有文字通過 WCAG AAA
3. **使用者測試**：切換流暢，偏好正確持久化
4. **效能測試**：切換時 FPS ≥ 60
