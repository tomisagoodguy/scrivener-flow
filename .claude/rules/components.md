# 元件規則

## 大小限制

- **單一元件檔案 ≤ 150 行**，超過必須拆分
- **任何單一檔案 ≤ 800 行**
- 業務邏輯抽至 `use*.ts` hook

## Supabase Client 用法

| 檔案 | 用途 | 限制 |
|------|------|------|
| `src/lib/supabase/client.ts` | Client Component | 受 RLS |
| `src/lib/supabase/server.ts` | Server Component / Server Action | 受 RLS |
| `src/lib/supabase/service.ts` | 管理員（bypass RLS） | **僅 Server 端** |

禁止在 Client Component 直接查詢資料庫。優先 Server Component；複雜查詢走 API Route。

## Server Actions vs API Routes

**資料突變優先用 Server Actions**，禁止建 `route.ts`，除非：
- Webhooks（LINE、Google 等）
- 需要特定 HTTP Method 的第三方整合

## 型別規則

```ts
// ❌
const data: any = response

// ✅
const data: unknown = response
if (data instanceof Error) { ... }
```

`catch` 變數用 `unknown`，存取 `.message` 前必須 `instanceof Error` guard。

## 常數來源

| 用途 | 檔案 |
|------|------|
| 案件狀態 | `src/lib/constants/caseConstants.ts` |
| 投資年份 | `src/lib/investment/yearUtils.ts` |
| 稅費計算 | `src/lib/calculator/taxConstants.ts` |
| 案件領域型別 | `src/domain/case/types.ts` |

禁止硬編碼年份陣列（`[2025, 2026]`），使用 `generateAvailableYears()`。

## useSearchParams 陷阱

`useSearchParams()` 不能放在 layout / header 全域元件，會導致靜態 build 失敗。  
必須在 `layout.tsx` 用 `<Suspense>` 包裹含有 `useSearchParams` 的 Client Component。
