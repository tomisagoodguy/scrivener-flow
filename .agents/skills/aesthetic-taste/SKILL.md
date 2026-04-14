---
name: aesthetic-taste
description: Guidelines to maintain a premium 'Vibe' across the product. Use this skill when making design decisions relating to colors, typography, layout aesthetic, spacing, and glassmorphism styling.
---

# Taste (品味美感風格)

美感不是副產物，而是產品傳遞價值的核心。在設計與開發時，你的決策必須體現最高水準的 Taste (品味)。

## 🎨 Visual Vocabulary (The Vibe)

當需求涵蓋特定氛圍時，請直接對應至以下實例與 CSS / Tailwind 樣式：

1. **"Glassmorphic" (玻璃擬態)**
   - **感受**：現代 (Modern)、輕盈透氣 (Airy)、層次感 (Layered)。
   - **實作 (Tailwind)**：使用 `.glass-card` 的設計概念。例如 `backdrop-blur-md bg-white/60 border border-white/40 shadow-[0_4px_30px_rgba(0,0,0,0.05)]`。確保背景非純白，而是帶有環境反射的質感。

2. **"Clean" / "Minimal" (極簡乾淨)**
   - **感受**：呼吸空間 (Breathing room)、專注 (Focus)。
   - **實作 (Tailwind)**：避免壓迫感，容器 `padding` 充足 (如 `p-6` 或 `p-8`)；元素間距開闊 (`gap-6` 或 `gap-8`)。文字不用純黑，採 `text-slate-700` 或 `text-gray-600`；邊框隱形化或極其微弱。

3. **"Subtle" (低調細膩)**
   - **感受**：內斂的優雅 (Refined)、不喧賓奪主 (Non-intrusive)。
   - **實作 (Tailwind)**：次要文字與輔助訊息使用 `text-gray-400` 或 `text-gray-500`。背景選色在 `#F9FAFB` 到 `#F3F4F6` 之間游移 (`bg-gray-50` 到 `bg-gray-100/50`)。

## 🖋Typography & Colors (字型與顏色)

- **字型**：避免依賴系統預設的難看字型。以現代俐落的 Sans-serif (如 `Inter`, `Roboto`, `Geist`, `Fira Code`) 為主軸，行高 (`leading-relaxed` 或 `leading-10`) 需足以撐起文字。
- **色彩策略**：放棄使用未經調和的粗暴顏色 (如純紅 `#FF0000` 或純藍 `#0000FF`)，必須採用 Tailwind 預設的精調色彩盤，或使用自定義的 HSL 調色，創造專屬的 Harmony。
- **Glass Inputs**：所有輸入框優先使用玻璃態：`bg-white/50 backdrop-blur-sm border-gray-200 focus:bg-white focus:ring-slate-300`。不使用死板的純色背景。

## 🧠 設計哲學

> **"You are not just writing code, you are coding a vibe."**

拒絕一切「堪用就好」的粗糙介面組件。每一個按鈕的陰影、每一段文字的透明度、每一條分隔線的粗細，都必須體現在程式碼的琢磨之中。這就是能夠讓人「眼睛一亮」的設計原則。
