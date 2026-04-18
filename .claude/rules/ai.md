# AI 功能規則

## Gemini 架構

AI 功能（每日簡報、文字優化、投資分析）由 `src/lib/ai/geminiConfig.ts` 統一管理。

- **功能閘門**：`ALLOWED_EMAIL` 硬編碼限制，AI Server Actions 執行前會驗證 session email，不符合者**靜默返回空結果**，不拋出錯誤
- **模型 Fallback 鏈**：依序嘗試 `gemini-2.5-flash` → `gemini-3-flash` → ... 共 9 個模型，解釋 AI 回應有時較慢的原因
- API Key：環境變數 `GOOGLE_GEMINI_API_KEY`

## 除錯陷阱

| ❌ 現象 | ✅ 原因與解法 |
|---------|--------------|
| AI 功能無回應、無錯誤訊息 | 先確認 session email 是否在 `ALLOWED_EMAIL` 清單內，這是最常見原因 |
| AI 回應很慢 | Fallback 鏈在試多個模型，屬正常行為 |

## 使用規則

- AI Server Action 只在 Server 端呼叫，不得在 Client Component 直接調用
- 新增 AI 功能時，必須在 `geminiConfig.ts` 統一設定，不要散落各處
