建立一個新的 Supabase migration SQL 檔案。

步驟：
1. 用 `date +%Y%m%d%H%M%S` 取得當前時間戳
2. 檔名格式：`supabase/migrations/<timestamp>_<簡短描述>.sql`
3. 描述從使用者訊息提取，用底線連接，全英文小寫（例：`add_bank_contacts_index`）
4. 建立檔案，加入標準 header 註解：
   ```sql
   -- Migration: <描述>
   -- Created: <timestamp>
   -- Description: <使用者說明>
   ```
5. 提示使用者填寫 SQL 內容

注意：
- 禁止使用 Prisma migrate
- 禁止在 Supabase UI 手動操作
- 所有 Schema 變更必須走此流程
