## 1. 資料庫 Migration

- [x] 1.1 新增 `supabase/migrations/<timestamp>_add_chat_groups_to_cases.sql`，ALTER TABLE cases ADD COLUMN chat_groups jsonb DEFAULT '{}'

## 2. TypeScript 型別

- [x] 2.1 `src/types/index.ts` 的 `DemoCase` 介面新增 `chat_groups?: { line?: string; whatsapp?: string; other?: string }`

## 3. Service 層

- [x] 3.1 `src/services/caseService.ts` 新增 `updateChatGroups(supabase, caseId, chatGroups)` 方法

## 4. UI 元件

- [x] 4.1 新建 `src/components/features/cases/ChatGroupsEditor.tsx`（Client Component，含 LINE / WhatsApp / 其他三欄，auto-save，≤150 行）
- [x] 4.2 `CaseMemoCard.tsx` 引入 `ChatGroupsEditor`，在 `view === 'all'` 時渲染於私密備註下方

## 5. 搜尋整合

- [x] 5.1 `src/app/cases/page.tsx` 的 `.or()` 查詢新增 `chat_groups->>line.ilike.%q%,chat_groups->>whatsapp.ilike.%q%,chat_groups->>other.ilike.%q%`
