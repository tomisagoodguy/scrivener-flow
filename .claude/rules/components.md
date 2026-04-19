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

## UI 風格規範（強制）

所有容器使用 `.glass-card`（`backdrop-blur + bg-white/65 + border-white/50`）。  
Input 使用 Glass Input Style：`bg-white/50 backdrop-blur-sm border-gray-200 focus:bg-white`。  
頁面進場：`animate-fade-in`（0.6s）；列表卡片：`animate-slide-up`（staggered）。

深色模式限制：`dark-theme.css` 對結構性 class 套用 `!important` 會蓋掉 Tailwind `dark:` variants。詳見 `dark-mode.md`。

## 台股色彩慣例（投資模組強制）

台股與歐美相反：**紅色 = 上漲 / 利多，綠色 = 下跌 / 利空**。

| 情境 | 顏色 class |
|------|-----------|
| 漲幅、主力買進、正向訊號 | `text-rose-600 dark:text-rose-400` |
| 跌幅、主力賣出、負向訊號 | `text-emerald-600 dark:text-emerald-400` |
| icon 背景（利多） | `bg-rose-500/10` + `text-rose-600` |
| icon 背景（利空） | `bg-emerald-500/10` + `text-emerald-600` |

投資模組所有漲跌色彩**禁止**使用歐美慣例（綠漲紅跌）。

## CaseStatus 型別陷阱

`CaseStatus` 型別混用中英文值（`'辦理中'` 和 `'Processing'` 並存）。  
寫 filter 條件時，注意資料來源實際儲存的是哪一種；使用 `src/lib/constants/caseConstants.ts` 的常數，不要硬編碼字串。

## 登入頁面元件結構

登入表單已拆至 `src/app/login/components/`（`MfaTotpForm`、`PasswordLoginForm` 等子元件）。  
修改登入邏輯時，直接修改對應子元件，不要在 `ModernLogin.tsx` 主檔寫表單邏輯。
