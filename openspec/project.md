# Project Context

## Purpose

Scrivener Flow 是一款專為代書（地政士）設計的高效率案件追蹤與管理系統。旨在簡化不動產過戶流程、自動化提醒重要稅金與合約里程碑、並提供團隊協作知識庫。

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript (Strict Mode)
- **Styling**: Tailwind CSS, Framer Motion (Animations)
- **Backend/DB**: Supabase (PostgreSQL, Auth, Realtime, Storage)
- **ORM**: Prisma
- **Icons**: Lucide React
- **Utilities**: date-fns, docxtemplater, xlsx

## Project Conventions

### Code Style

- 嚴格遵守 TypeScript，禁止使用 `any`（改用 `unknown` 或明確介面）。
- React 使用 Functional Components + Hooks。
- 優先使用 Next.js Server Components，僅在必要時使用 `'use client'`。
- UI 組件優先使用自定義 Design System（Vibe Design）。

### Architecture Patterns

- **Feature-based Structure**: 代碼按功能模組組織於 `src/components/features`。
- **Service Layer**: 複雜的資料庫與業務邏輯封裝於 `src/services` 或 `src/lib`。
- **Custom Hooks**: 狀態與副作用邏輯抽離至專屬 Hook。

### Testing Strategy

- 使用 Jest / Vitest 進行單元測試。
- 遵循 AAA (Arrange-Act-Assert) 模式與 Factory Pattern。

### Git Workflow

- 遵循 **Conventional Commits** 規範 (`feat`, `fix`, `refactor`, `style`, `chore`, `docs`, `perf`)。

## Domain Context

- 不動產代書（地政士）專業流程：簽約、用印、完稅、代償（清償）、交屋。
- 稅務計算：土地增值稅、契稅、贈與稅、遺產稅、房地合一稅。
- 地政資料解析：權狀、謄本、合約書。

## Important Constraints

- **Security**: 啟用了 RLS (Row Level Security)、端到端加密 (E2EE) 與流量混淆。
- **Privacy**: 所有案件資料必須嚴格隔離。
- **Infrastructure**: 已部署於 Vercel，並透過 Cloudflare 進行流量代理與 Geoblocking（限台灣 IP）。

## External Dependencies

- Supabase API
- LINE Notify API (通知功能)
- Google Drive API (附件存儲)
