## Context

Scrivener Flow 目前使用固定的 Tailwind 字體類別與 glassmorphism 視覺風格。主要使用者年齡偏高，有在戶外使用的需求。目前已有基礎字體提升（label 最低 text-sm），但缺少使用者可自行切換的大字體/高對比模式。

現有約束：
- dark-theme.css 使用 `!important` 覆蓋結構類別，任何新模式必須用相同機制實作
- 不引入外部依賴，只用 CSS 變數 + React Context
- 偏好持久化用 localStorage（不需後端）

## Goals / Non-Goals

**Goals:**
- 使用者可在設定面板一鍵切換大字體模式（1.2倍縮放）
- 使用者可切換高對比模式（提升色彩對比度）
- 所有可點擊元素觸控目標 ≥ 44×44px
- 關鍵數字（金額、日期）全域 `font-semibold`
- 警示色必須搭配圖示

**Non-Goals:**
- 不支援自訂縮放比例（固定 1.2 倍）
- 不修改 Tiptap 編輯器內部樣式
- 不引入 WCAG AA 全站審計（超出本次範圍）

## Decisions

### 決策 1：CSS 變數 + html class 驅動，非 Tailwind `scale`

**選擇**：在 `<html>` 加上 `.large-font` / `.high-contrast` 類別，配合 `globals.css` 中的 CSS 覆蓋。

**理由**：與現有 `dark-theme.css` 的 `!important` 模式一致，不需改動每個元件。若用 Tailwind 的 `text-[1.2rem]` 需改動所有元件，技術債過高。

**替代方案**：`zoom: 1.2` CSS 屬性 — 拒絕，因為 `zoom` 非標準且影響 fixed/sticky 定位。

### 決策 2：偏好存於 localStorage，React Context 讀取

**選擇**：`useAccessibility` hook 讀寫 localStorage，在 `layout.tsx` 包裹全域 Provider。

**理由**：不需 Supabase 寫入，無需 session，也支援未登入狀態下的偏好保留。

### 決策 3：觸控目標用全域 CSS，不逐一改元件

**選擇**：在 `globals.css` 加 `button, a, [role="button"] { min-height: 44px; min-width: 44px; }` 搭配 `touch-action: manipulation`。

**理由**：覆蓋面廣，維護成本低，符合 Apple HIG 44px 標準。

## Risks / Trade-offs

- **[Risk] 1.2 倍縮放與現有 glassmorphism layout 衝突** → Mitigation：用 `font-size` 縮放，不動 `zoom` 或 `transform`，只影響文字相關 rem 單位
- **[Risk] localStorage 偏好在 SSR 時無法讀取，造成閃爍（FOUC）** → Mitigation：在 `<head>` 加 inline script 提前注入 class（Next.js `<Script strategy="beforeInteractive">`）
- **[Risk] `min-height: 44px` 破壞緊湊型 UI（如表格內的小按鈕）** → Mitigation：用 `.compact` class 豁免，逐案評估

## Migration Plan

1. 新增 `src/hooks/useAccessibility.ts`（Context + localStorage）
2. 更新 `src/app/layout.tsx` 加入 Provider 與 beforeInteractive Script
3. 新增 `src/app/accessibility.css`（`.large-font` 與 `.high-contrast` 覆蓋規則）
4. 在 `src/app/globals.css` 加觸控目標規則
5. Header 加設定按鈕，開啟 `AccessibilityPanel` 元件
6. 全站關鍵數字 grep 後加 `font-semibold`（金額、日期）
7. 警示 Badge/狀態標籤加圖示

Rollback：移除 layout.tsx 的 Provider 與 Script 即可還原，CSS 無破壞性。

## Open Questions

- 設定入口放 Header 右上角 icon？還是整合進現有的使用者選單？（建議後者，減少 Header 擁擠）
- 高對比模式的色票需由設計確認（暫用 WCAG AA 4.5:1 比例作為基準）
