# ANTIGRAVITY.md - Project Specific Memory
>
> This file is the primary target for antigravity-reflect auto-learning.
> High-level behavioral rules are in .agent/rules.md.

## 🛠️ Technical Context

- **Project**: my-case-tracker (Next.js 14, Supabase, Tailwind)
- **Primary Language**: Traditional Chinese (繁體中文)
- **Role**: Antigravity (Senior Architect & Product Designer)

## 🧠 Auto-Learned Conventions

- [Auto-Added]: Use .agent/workflows/reflect.md for batch reflection.
- [Auto-Added]: When using antigravity-reflect, targeted file is this ANTIGRAVITY.md for project specifics.
- [Auto-Added]: Ensure uv is used for Python scripts (if any).
- [2026-01-17]: For Excel export features in Client Components, prefer `exceljs` over `xlsx` (SheetJS). It offers superior styling (column widths, fonts) and buffer stability.
- [2026-01-17]: Always implement `isExporting` loading states for file download buttons (`file-saver` operations) to provide immediate user feedback.
- [2026-01-17]: Avoid using `Math.random()` or `Date.now()` directly in JSX rendering (especially in Next.js Server/Client components) as it causes Hydration Mismatches. Use deterministic values or `useEffect` for random data.
