## Context

現有 `TodoContainer` 的新增事件採 inline form，每次輸入一筆後自動關閉，需重新點擊「新增事件」才能繼續輸入。代書作業情境常需連續批次輸入多筆雜事，原流程摩擦高。

目前使用原生 `datetime-local` / `date` input，在中文作業系統上操作繁瑣，且無法接受民國曆格式。

## Goals / Non-Goals

**Goals:**
- 進入輸入模式後，Enter 儲存並立即清空，維持焦點在輸入框（零額外點擊）
- 單行文字同時包含標題與時間碼，parser 自動分離
- 支援民國曆年份（115 = 2026）
- 本次 session 輸入的記錄即時顯示在輸入框下方
- Esc 關閉輸入模式

**Non-Goals:**
- 不修改已儲存事件的編輯 UI
- 不修改 `useTodoSync.addManualTodo()` 介面
- 不解析中文自然語言（「明天下午」等）
- 不支援 end_date 快速輸入（end_date 維持 null）

## Decisions

**D1：單一文字欄位 vs 分離欄位**
選擇單一文字欄位。代書在快速輸入時不希望 Tab 切換欄位，一行打完 Enter 效率最高。Parser 從字串尾端掃描 token，第一個符合的時間 token 切出來，剩餘部分為標題。

**D2：時間 token 掃描方向**
從右到左掃描，取最後一個符合的數字 token 作為時間碼。這符合直覺輸入習慣：先寫標題，後接日期（「郭育汝簽約 0504 1000」）。若時間碼在最前面也能正確辨識。

**D3：解析優先序（4–11 碼）**
1. 11碼 `YYYMMDDHHMM`（民國含時間）
2. 8碼 `MMDDHHMM`（日期+時間，最常用）
3. 7碼 `YYYMMDD`（民國全天）
4. 4碼 `MMDD` 優先（日期），MM 01-12 且 DD 01-31 才成立；否則試 HHMM（今天幾點）

**D4：元件放置**
新建 `RapidEventInput.tsx`，`TodoContainer` 的「新增事件」按鈕改為開啟此元件。不破壞現有 `handleAddTodo` 路徑（保留向後兼容）。

**D5：session 記錄**
`useState` 在 `RapidEventInput` 本地管理，關閉後清空。不持久化、不進 DB，純 UX 確認用。

## Risks / Trade-offs

- **[模糊性] `0900` 既是 9/0（無效日期）也是 09:00** → 以日期優先：DD=00 無效時 fallback 到時間解析，結果為今天 09:00，符合直覺
- **[模糊性] `1200` = 12月00日（無效）→ 今天 12:00** → 同上規則，fallback 後正確
- **[民國年範圍]** 僅支援 ROC 100–129（西元 2011–2040），超出範圍視為無效
- **[無日期]** 輸入純標題不含時間碼時，`due_date` 存 null，事件仍可儲存為無日期待辦

## Migration Plan

無資料遷移。純前端 UI 替換，TodoContainer 改用新元件，現有 `addManualTodo` 介面不變。
