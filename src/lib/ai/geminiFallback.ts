import type { GenerativeModel } from '@google/generative-ai';
import { genAI, MODELS_TO_TRY } from './geminiConfig';

/**
 * 呼叫 Gemini 模型並執行既定邏輯（generateContent / chat 皆可），回傳解析後的結果。
 * 由呼叫端（各 AI Server Action）自行決定要對 model 做什麼呼叫。
 */
export type GeminiModelCaller<T> = (model: GenerativeModel) => Promise<T>;

export interface GeminiFallbackResult<T> {
    data: T;
    modelName: string;
}

/**
 * `callGeminiWithFallback()` 拋出的錯誤。
 * `rateLimited` 反映「最後一次嘗試」的錯誤分類（429 限流 vs 一般模型錯誤），
 * 而非「是否曾經遇過」429——即使前面的模型是限流失敗，只要最後一個模型是一般錯誤，
 * 此旗標仍為 false，訊息也會反映一般錯誤，符合 spec 的 Example 表格。
 */
export class GeminiFallbackError extends Error {
    readonly rateLimited: boolean;

    constructor(message: string, rateLimited: boolean) {
        super(message);
        this.name = 'GeminiFallbackError';
        this.rateLimited = rateLimited;
    }
}

/**
 * 防禦性判斷是否為 429 限流錯誤。
 * 不同版本的 Gemini SDK 拋出的錯誤物件形狀不一定相同（有的有 `.status`，
 * 有的只把狀態碼寫進 `.message`），因此不能假設 `.status` 一定存在，
 * 一律先做型別檢查再存取欄位，避免誤判或 crash。
 */
function isRateLimitError(error: unknown): boolean {
    if (error === null || error === undefined) return false;

    if (typeof error === 'object') {
        const maybeStatus = (error as { status?: unknown }).status;
        if (typeof maybeStatus === 'number' && maybeStatus === 429) return true;

        const maybeMessage = (error as { message?: unknown }).message;
        if (typeof maybeMessage === 'string' && /429|rate[\s-]?limit|quota/i.test(maybeMessage)) {
            return true;
        }
    }

    if (error instanceof Error && /429|rate[\s-]?limit|quota/i.test(error.message)) {
        return true;
    }

    return false;
}

function toErrorMessage(error: unknown): string {
    if (error instanceof Error) return error.message;
    if (typeof error === 'string') return error;
    try {
        return JSON.stringify(error);
    } catch {
        return String(error);
    }
}

/**
 * 共用的 Gemini fallback 鏈：依序嘗試 `MODELS_TO_TRY`（或呼叫端傳入的模型清單），
 * 呼叫第一個成功的模型即回傳；失敗時區分「429 限流」與「一般模型錯誤」並繼續下一個模型。
 * 若全部模型皆失敗，拋出 `GeminiFallbackError`，其 `rateLimited` 與訊息反映
 * 「最後一次嘗試」的實際錯誤類型。
 */
export async function callGeminiWithFallback<T>(
    callModel: GeminiModelCaller<T>,
    models: readonly string[] = MODELS_TO_TRY
): Promise<GeminiFallbackResult<T>> {
    if (!genAI) {
        throw new Error('系統設定錯誤：尚未設定 API Key。');
    }

    let lastError: unknown = null;
    let lastWasRateLimit = false;

    for (const modelName of models) {
        try {
            const model = genAI.getGenerativeModel({ model: modelName });
            const data = await callModel(model);
            return { data, modelName };
        } catch (e: unknown) {
            lastError = e;
            lastWasRateLimit = isRateLimitError(e);
            const reason = lastWasRateLimit ? '限流跳過' : '模型錯誤跳過';
            console.warn(`⚠️ 模型 ${modelName} 呼叫失敗 (${reason}): ${toErrorMessage(e)}`);
        }
    }

    const lastMessage = toErrorMessage(lastError);
    const finalMessage = lastWasRateLimit
        ? `所有 AI 模型皆已達速率限制（429），最後錯誤：${lastMessage}`
        : `所有 AI 模型呼叫失敗，最後錯誤：${lastMessage}`;

    throw new GeminiFallbackError(finalMessage, lastWasRateLimit);
}
