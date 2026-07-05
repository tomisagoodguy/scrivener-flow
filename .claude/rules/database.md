---
paths:
  - "src/**/*.{ts,tsx}"
  - "supabase/**"
---

# 資料庫規則

## 多租戶隔離

Supabase **Row Level Security (RLS)** 在資料庫層強制 `user_id` 隔離，每位用戶只看到自己的案件、待辦、財務資料。  
**例外**：知識庫（`team_notes`）為全體成員共用，不做 user_id 隔離。

## 核心領域概念：里程碑 vs 任務

| 概念 | 定義 | 行為 |
|------|------|------|
| **里程碑（Milestone）** | 合約事實（簽約日、完稅日） | 唯讀，不可刪除 |
| **任務（Task）** | 可執行的待辦 | 系統在里程碑前 3–5 天自動生成 |

修改里程碑邏輯時，必須同步確認 `caseService.ts` 中的自動任務生成邏輯。

## E2EE 敏感資料

`src/lib/crypto/` 實作 AES-256-GCM（PBKDF2 100k iterations），私密備註在寫入 DB 前已加密。

- **Key 來源優先序**：`ENCRYPTION_MASTER_KEY`（環境變數）→ DB `encryption_keys` 表 → Fallback
- **Key 輪替**：90 天週期，保留最近 3 個歷史 key 供舊資料解密
- `SecureApi` wrapper 加入隨機 padding（512–1536 bytes）與延遲（50–300ms）防流量分析
- 解密失敗常見原因：key 版本不符，確認 `encryption_keys` 表有對應版本

## Todo 同步架構

`src/components/todo/hooks/useTodoSync.ts` 採**雙軌同步**，修改待辦邏輯時兩軌都必須考慮：

1. **Supabase Realtime**：訂閱 `todos`、`milestones`、`financials` 的 `postgres_changes`，跨裝置即時更新
2. **Window 自訂事件**：`window.dispatchEvent(new Event('todo-updated'))` 用於同頁面跨元件通知

系統自動任務（案件里程碑前 3–5 天）透過 `source_key`（`case_id + milestone_type`）去重，**防止重複產生**。  
新增系統自動任務時，必須以 `source_key` 為複合唯一鍵去重；發現舊資料缺鍵時需清理 DB，不能只從 UI 過濾。

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
