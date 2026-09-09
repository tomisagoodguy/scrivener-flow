## Why

盤點 `src/lib/ai/` 與三個 AI Server Action（`briefingAction.ts`、`optimizationAction.ts`、`generateInvestmentPromptAction.ts`）後確認：目前的「9 模型 fallback 鏈」（`MODELS_TO_TRY`，定義於 `geminiConfig.ts`）在三個檔案中各自複製同一段 for-loop 邏輯，且對所有例外一律 `catch` 後 warn+continue 換下一個模型，不區分「429 限流」「timeout」「其他錯誤」，也沒有任何退避延遲。這造成兩個具體問題：(1) 違反本專案「單一事實來源」原則——未來若要調整 fallback 策略（例如換模型順序、加重試次數）需要同步改三處；(2) 429 限流錯誤與其他永久性錯誤（例如模型名稱失效）被無差別處理，皆是「立刻換下一個」，若整條鏈全因單一帳號的 429 限流而非模型本身有問題全數失敗，使用者會看到完全相同的「AI 無回應」結果，難以事後判斷根因。

此問題參考自對開源專案 stockcatcher 的架構評估：其 `bibi_agent.py` 用單一 `_build_config` 函式依模型能力動態組裝呼叫參數，避免重複實作，此設計模式值得對照參考。

## What Changes

- 新增共用函式 `callGeminiWithFallback()`（置於 `src/lib/ai/geminiConfig.ts` 或新檔 `src/lib/ai/geminiFallback.ts`），封裝「依序嘗試 `MODELS_TO_TRY`、捕捉例外、判斷是否為 429 限流錯誤、換下一個模型」的邏輯，取代三個 action 檔案中各自複製的 for-loop。
- 錯誤類型區分：對 429（`error.status === 429` 或訊息包含 rate limit 關鍵字）錯誤額外記錄為「限流跳過」，對其他例外記錄為「模型錯誤跳過」，兩者皆繼續嘗試下一個模型，但記錄的錯誤原因不同，最終若全部模型失敗，回傳的錯誤訊息 SHALL 反映「最後一次嘗試的實際錯誤類型」而非一律回傳空結果或通用錯誤。
- `briefingAction.ts`、`optimizationAction.ts`、`generateInvestmentPromptAction.ts` 三處改為呼叫共用函式，移除各自的 for-loop 複製實作。
- 不新增「意圖路由兩段式呼叫」設計：盤點確認三個現有 AI 功能（簡報、文字優化、投資分析）的呼叫端本身已明確指定任務類型（`optimizationAction` 甚至有明確的 `type` 參數：grammar/expand/summarize/structure），不存在「需要先用輕量模型判斷使用者意圖屬於哪一類」的情境，此設計模式在 stockcatcher 的聊天機器人場景（需解析自由文字使用者輸入）適用，但不適用於本專案目前的呼叫模式，故不納入本次範圍（見 Non-Goals）。

## Non-Goals

- 不新增「意圖分類 + 兩段式呼叫」設計，理由如上——現有三個 AI 功能呼叫端已明確指定任務類型，無自由文字意圖判斷需求。若未來新增「使用者可自由輸入問題」類型的 AI 功能（例如聊天式互動），才需要重新評估此設計。
- 不變更 `ALLOWED_EMAIL` 閘門的「靜默返回空結果」行為，該行為在 `rules/ai.md` 已有明確記載且非本次要解決的問題。
- 不變更 `MODELS_TO_TRY` 的模型清單順序或數量。
- 不新增重試退避延遲（exponential backoff）於單一模型內部重試；本次僅處理「換下一個模型」層級的邏輯整併與錯誤分類，不新增同一模型的多次重試。

## Capabilities

### New Capabilities

- `ai-fallback-shared-helper`: 共用的 Gemini fallback 鏈函式，含錯誤類型分類（429 限流 vs 其他）與統一錯誤回報。

### Modified Capabilities

(none)

## Impact

- Affected specs: `ai-fallback-shared-helper`（新增）
- Affected code:
  - New: `src/lib/ai/geminiFallback.ts`
  - Modified: `src/lib/ai/geminiConfig.ts`
  - Modified: `src/app/actions/ai/briefingAction.ts`
  - Modified: `src/app/actions/ai/optimizationAction.ts`
  - Modified: `src/app/actions/ai/generateInvestmentPromptAction.ts`
  - Modified: `.claude/rules/ai.md`（補充共用函式說明）
