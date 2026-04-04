## Context

現有代償資料分散在兩處：
- `milestones.redemption_date`：代償日期（單一欄位）
- `financials.seller_redemption_amount`：代償金額
- `src/app/redemptions/`：銀行代償聯絡資訊管理（`bank_redemptions` 表），與案件無關聯

代償步驟進度目前完全不存在於系統中，代書只能靠記憶或外部筆記追蹤 7 個步驟。

## Goals / Non-Goals

**Goals:**
- 每個案件的代償流程可獨立追蹤 7 個固定步驟
- 每步驟支援勾選完成狀態與記錄完成日期
- 勾選即觸發即時儲存（無需額外「儲存」按鈕）
- RLS 隔離確保各用戶只看到自己的案件步驟

**Non-Goals:**
- 自訂步驟順序或名稱（步驟固定）
- 步驟間的依賴關係強制驗證（可自由勾選任意步驟）
- 推播通知或提醒（現有 Todo 系統負責）
- 與 `bank_redemptions` 表整合（兩者為獨立模組）

## Decisions

### D1：使用獨立資料表 `redemption_steps`，而非 JSONB 欄位

**選擇**：新增 `redemption_steps` 資料表，每筆記錄代表一個步驟。

**理由**：
- 每步驟需要獨立的 `is_done` 和 `done_date`，關聯式結構更適合查詢與更新
- JSONB 方式需要整列更新，並發衝突風險較高
- 未來若要加入步驟備註欄位，獨立表擴充更容易

**放棄的替代方案**：在 `milestones` 表新增 7 個步驟欄位（schema 污染，且與里程碑語意不符）

### D2：Server Action 處理 upsert，不使用 API Route

**選擇**：使用 Server Action（`updateRedemptionStep`）。

**理由**：CLAUDE.md 規定「資料突變優先使用 Server Actions」，步驟更新屬於 mutation，無 webhook 需求。

### D3：前端初始化：7 筆資料在案件建立時預先寫入，而非 on-demand

**選擇**：當使用者首次開啟步驟追蹤元件時，若 DB 中無此案件的步驟記錄，Server Action 自動批次 INSERT 7 筆初始記錄（`is_done: false`）。

**理由**：
- 避免 UI 需要區分「步驟存在但未完成」vs「步驟不存在」兩種狀態
- 簡化 upsert 邏輯（後續都是 UPDATE）
- 初始化為幕後操作，使用者感知不到

**放棄的替代方案**：懶載入（勾選時才建立記錄）—增加前端條件判斷複雜度

### D4：步驟定義用常數管理，不放在 DB

**選擇**：在 `src/lib/constants/caseConstants.ts` 新增 `REDEMPTION_STEPS` 常數陣列（含 `step_number` 和 `label`）。

**理由**：步驟名稱與順序為業務規則，不需 DB 動態設定，保持單一事實來源。

## Risks / Trade-offs

- **[Risk] 使用者在案件刪除後仍有孤兒步驟記錄** → Migration：`redemption_steps.case_id` 設 `ON DELETE CASCADE`
- **[Risk] 並發更新同一步驟** → Mitigation：每步驟獨立一列，`UPDATE WHERE id = ?` 不會衝突
- **[Risk] 初始化 7 筆記錄的時機（race condition）** → Mitigation：使用 `INSERT ... ON CONFLICT DO NOTHING`，確保冪等
