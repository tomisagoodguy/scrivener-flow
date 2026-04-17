# 資料庫規則

## Schema 修改流程

```
❌ 禁止：Prisma migrate、Supabase UI 手動操作
✅ 正確：新增 .sql 到 supabase/migrations/
```

命名格式：`supabase/migrations/<timestamp>_<描述>.sql`  
時間戳格式：`YYYYMMDDHHmmss`（例：`20260418120000_add_xxx.sql`）

`prisma/schema.prisma` 只有 generator + datasource，**不定義 model**，不要在裡面加表格。

## 多表寫入（原子性）

優先用 Supabase RPC（PL/pgSQL Transaction）。  
若在 Server Action，必須 `try/catch` + 補償機制清除失敗的髒資料。

## RLS 規則

- 所有表格預設 `user_id` 隔離（RLS Policy）
- 需要繞過 RLS 的管理員操作：使用 `src/lib/supabase/service.ts`（只能 Server 端）
- 知識庫（`team_notes`）例外，不做 user_id 隔離

## 軟刪除

待辦事項（`todos`）使用軟刪除（`is_deleted: true`）。  
查詢時**必須**加 `is_deleted = false` 過濾條件。

## JOIN 回傳型別

Supabase JOIN 回傳**陣列**，即使是 1:1 關係：

```ts
// ❌ 錯
const name = caseData.milestone.contract_date

// ✅ 正確
const name = caseData.milestone?.[0]?.contract_date
// 型別定義：milestone: Milestone[]
```
