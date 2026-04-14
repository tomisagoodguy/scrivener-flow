---
name: impeccable-detail
description: Guidelines to ensure impeccable and pixel-perfect design details. Use this skill when auditing UI, polishing visual components, adding micro-interactions, handling component states (hover, focus, disabled, loading, empty, error), or refining accessibility.
---

# Impeccable Detail (精緻細節風格)

本技能指南專注於傳遞「極致細緻」的使用者體驗，拒絕平庸且無靈魂的介面。你的目標是做到高規格的視覺反饋與無懈可擊的狀態管理。

## 🔍 Pixel-Perfection (像素完美)

1. **對齊與留白 (Alignment & Whitespace)**
   - 確保區塊之間的 Spacing 是均勻或具有層次感，例如使用 `p-6` 或 `p-8` 賦予足夠的呼吸空間。
   - 保證排版上的對齊一致性 (例如 Icon 與旁側文字的垂直置中，使用 `flex items-center gap-2`)。
2. **防禦性排版 (Defensive UI)**
   - 處理文字溢出：標題或過長標籤應該搭配 `truncate` 或 `line-clamp`。
   - 動態內容支援：針對可能為空、可能出現超長字串的區塊進行設計。

## 🪄 Micro-interactions (微互動設計)

1. **互動感 (Tactile Feedback)**
   - 滑鼠懸停 (Hover)：必須提供順滑的變化。例如使用 `hover:scale-[1.01] transition-all duration-200` 或 `hover:bg-gray-50/50` 以增添觸感。
   - 焦點 (Focus)：重視鍵盤可訪問性。必須優化 `focus` 的外觀 (非預設的醜陋邊框，而是柔和的 `focus:ring-2 focus:ring-slate-300` 等)。
   - 按壓 (Active)：當按鈕被按壓時，考慮給予 `active:scale-[0.98]` 帶來實體按壓的反饋感。

2. **進場與轉場動畫 (Transitions & Entry Animations)**
   - 頁面載入應使用淡入：`animate-fade-in` (約 0.6s)。
   - 卡片或表單列表的出現：使用延遲或階梯式的動畫，如 `animate-slide-up` (Staggered)。

## 🚦 Comprehensive Edge States (無懈可擊的邊界狀態)

永遠為每一個互動元件考慮齊全的狀態：
- **Default**：預設優雅安靜的姿態。
- **Hover/Focus**：操作提示與明確回饋。
- **Loading (Skeleton / Spinner)**：資料讀取時不能閃爍，預先以 Skeleton 佔位，消除 CLS (Cumulative Layout Shift)。
- **Empty State**：空資料時不僅僅是顯示空白，請提供含有溫柔引導的 Icon 與文字。
- **Error/Destructive**：發生錯誤或進行刪除等危險動作時，顏色警示應具有足夠對比度，並附帶二次確認 (Double Check)。

## ♿ A11y (無障礙與易讀性)

- 為互動元素補充缺漏的 `aria-label`。
- 顏色對比必須通過標準，絕不能為了「隱晦」而使用極難閱讀的灰色 (`text-gray-200` 等無法識別的文字配置)。
