Phase 4 — 拆解巨石元件
風險：High，逐一執行並手動測試

Step 4.1 — 拆解 investment dashboard page（480 行）
抽取: src/hooks/investment/useStockDashboard.ts（所有 state + fetch）
抽取: src/components/features/investment/StockDashboardNav.tsx
注意: Promise.all 並行載入與各自 loading state 必須完整保留
Step 4.2 — 拆解 ModernLogin.tsx（474 行）
抽取 hook: src/hooks/useLoginFlow.ts（auth state + handlers）
抽取元件: PasswordLoginForm, MfaTotpForm, OtpLoginForm, OAuthButtons（放 src/app/login/components/）
Step 4.3 — 拆解 IdentifyPage（363 行）
抽取 hook: src/hooks/useIdentifyUpload.ts
抽取元件: FileDropzone, ProgressDisplay, IdentifyResults
注意: setInterval cleanup 必須正確保留
Step 4.4 — 抽離 ChecklistSection.tsx 中的硬編碼資料
新增: src/lib/checklist/checklistData.ts（匯出所有 todo 陣列為型別常數）
風險: Low，純資料搬移
成功標準: 4 個目標檔案各不超過 150 行

Phase 5 — 型別安全：消除 any
風險：Low-Medium，TypeScript 錯誤會揭露隱藏 bug

Step 5.1 — 三個代表性修復
banks.ts: contacts: any[] → contacts: BankContact[]
TaxCalculatorComponents.tsx: ({ label, ...props }: any) → InputGroupProps
messageUtils.ts: caseData: any → caseData: DemoCase
Step 5.2 — 投資 hooks 型別化
將 RevenueRow, PriceRow 等整合至 src/types/investment.ts
Step 5.3 — 知識庫與 Tiptap slash-command 型別化
使用 @tiptap/core 的 Editor 和 @tiptap/suggestion 的 SuggestionOptions
Step 5.4 — 批次處理其餘 60+ 處
優先順序：Server Actions → API Routes → Utilities → UI 元件
成功標準: grep -r ': any' src/ < 20 個結果（皆附說明注解）；tsc --noEmit 零錯誤

Phase 6 — 業務邏輯常數化
風險：Low

Step 6.1 — 動態年份列表
新增: src/lib/investment/yearUtils.ts 的 generateAvailableYears(startYear, endYear?) 取代所有硬編碼 [2025]
Step 6.2 — 稅費計算常數
新增: src/lib/calculator/taxConstants.ts
Step 6.3 — Magic strings 集中管理
新增: src/lib/constants/caseConstants.ts（status、priority、source_type 等業務字串）
注意: DB query string 必須與實際儲存值完全一致
成功標準: 無硬編碼年份陣列；業務字串常數化集中管理

橫切關注點
Supabase Client 統一: 全面改用 src/lib/supabase/client.ts，廢棄 src/lib/supabaseClient.ts
alert() 移除: Phase 3/4 重構期間，把 alert() 改為 Toast 通知系統
測試策略: Phase 2 新增服務的 mock 單元測試，Phase 4 新增元件快照測試
