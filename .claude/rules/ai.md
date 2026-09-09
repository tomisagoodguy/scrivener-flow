---
paths:
  - "src/lib/ai/**"
  - "src/app/actions/**"
---

# AI 功能規則

## Gemini 架構

AI 功能（每日簡報、文字優化、投資分析）的模型清單與 API Key 由 `src/lib/ai/geminiConfig.ts` 統一管理（`MODELS_TO_TRY`、`genAI`、`ALLOWED_EMAIL`）。

- **功能閘門**：`ALLOWED_EMAIL` 硬編碼限制，AI Server Actions 執行前會驗證 session email，不符合者**靜默返回空結果**，不拋出錯誤
- **模型 Fallback 鏈**：依序嘗試 `gemini-2.5-flash` → `gemini-3-flash` → ... 共 9 個模型，解釋 AI 回應有時較慢的原因
- API Key：環境變數 `GOOGLE_GEMINI_API_KEY`

## Fallback 鏈共用函式：`callGeminiWithFallback()`

`src/lib/ai/geminiFallback.ts` 匯出 `callGeminiWithFallback()`，是呼叫 Gemini `MODELS_TO_TRY` 鏈的**唯一入口**。
`briefingAction.ts`、`optimizationAction.ts`、`generateInvestmentPromptAction.ts` 三個 Server Action 皆呼叫此函式，**禁止**再各自實作 `for (const modelName of MODELS_TO_TRY)` loop。

用法：傳入一個 `(model: GenerativeModel) => Promise<T>` callback，函式依序嘗試模型、回傳第一個成功結果：

```ts
const { data, modelName } = await callGeminiWithFallback(async (model) => {
    const result = await model.generateContent(prompt);
    return result.response.text();
});
```

- **錯誤分類**：每次呼叫失敗時，用 `error.status === 429` 或錯誤訊息關鍵字（`429` / `rate limit` / `quota`）防禦性判斷是否為限流錯誤（不假設 `.status` 欄位一定存在，因不同 SDK 版本的錯誤物件形狀不同），繼續嘗試下一個模型
- **全部模型失敗**時拋出 `GeminiFallbackError`（`instanceof Error`），其 `.rateLimited: boolean` 與錯誤訊息反映**最後一次嘗試**的實際錯誤類型（限流 vs 一般模型錯誤），而非「是否曾經遇過 429」
- 需要多輪對話（如 `briefingAction.ts` 的 function calling）時，把 `tools` 傳給 callback 裡的 `model.startChat({ tools })`，而不是傳給 `getGenerativeModel()`（模型物件由共用函式統一建立）
- 單元測試：`src/lib/ai/__tests__/geminiFallback.test.ts`

## 除錯陷阱

| ❌ 現象 | ✅ 原因與解法 |
|---------|--------------|
| AI 功能無回應、無錯誤訊息 | 先確認 session email 是否在 `ALLOWED_EMAIL` 清單內，這是最常見原因 |
| AI 回應很慢 | Fallback 鏈在試多個模型，屬正常行為 |
| 全部模型失敗但看不出是不是限流 | 看拋出的 `GeminiFallbackError.rateLimited`（或訊息文字），該值反映最後一次嘗試的錯誤類型 |

## 使用規則

- AI Server Action 只在 Server 端呼叫，不得在 Client Component 直接調用
- 新增 AI 功能時，模型清單設定在 `geminiConfig.ts`，但**呼叫模型一律經由 `callGeminiWithFallback()`**，不要自行寫 for-loop 或散落各處
