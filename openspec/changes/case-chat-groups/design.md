## Context

代書使用 LINE、WhatsApp 等通訊軟體與客戶溝通，每個案件可能在多個 app 建立不同名稱的群組。現行系統無此欄位，代書只能把群組名稱塞進 `notes` 或 `pending_tasks`，導致搜尋困難。

## Goals / Non-Goals

**Goals:**
- `cases` 表新增 `chat_groups` JSONB 欄位，可儲存任意 app 的群組名稱
- 備忘錄卡片可直接編輯，auto-save
- 全站搜尋可用群組名稱找到案件

**Non-Goals:**
- 不做 app 清單管理（不需要 admin 介面設定 app 種類）
- 不做跳轉到對應 app 的 deep link

## Decisions

**JSONB vs 獨立表**
選 JSONB。群組名稱是案件的附屬屬性，不需要跨案件查詢或關聯，JSONB 避免多一張表的 JOIN 開銷，且支援未來新增任意 app 不需改 schema。

**預設 app 固定為 LINE / WhatsApp，加「其他」自由欄**
兩個是台灣最常見的通訊軟體；「其他」欄位讓代書記錄 Telegram 或公司系統等非主流情況。結構：
```json
{ "line": "...", "whatsapp": "...", "other": "..." }
```

**搜尋整合用 `notes.ilike` 同樣的 pattern**
在現有 `.or()` 查詢加入 `chat_groups->>line.ilike.%q%` 等條件，不引入全文搜尋。

**UI 元件：獨立的 ChatGroupsEditor**
不複用 `EditableNote`（EditableNote 是單一 textarea），ChatGroups 需要 3 個獨立輸入欄，各自 auto-save。抽成獨立 Client Component，控制在 150 行內。

## Risks / Trade-offs

- [JSONB 搜尋較慢] → 案件數量有限（百件級），不需加 GIN index；未來量大時可補
- [加密] → `chat_groups` 屬於業務輔助資訊，不含金融敏感資料，不需 E2EE

## Migration Plan

1. 新增 migration SQL（`ALTER TABLE cases ADD COLUMN chat_groups jsonb DEFAULT '{}'`）
2. 更新 TypeScript 型別
3. 實作 UI + Server Action
4. 搜尋查詢加入條件

Rollback：`ALTER TABLE cases DROP COLUMN chat_groups`（資料遺失，但欄位為輔助資訊，可接受）
