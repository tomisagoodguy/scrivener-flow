/**
 * Tests for callGeminiWithFallback() shared Gemini fallback helper.
 *
 * 涵蓋 spec `ai-fallback-shared-helper` 情境：
 *  1. 第一個模型成功 → 直接回傳，不嘗試後續模型
 *  2. 第一個模型失敗、第二個成功 → 回傳第二個模型結果，不嘗試剩餘模型
 *  3. 全部模型失敗且皆為 429 → 拋出的錯誤標示為限流耗盡
 *  4. 全部模型失敗但最後一個非 429 → 拋出的錯誤標示為一般模型錯誤（即使前面幾個是 429）
 */

const mockGetGenerativeModel = jest.fn();

jest.mock('../geminiConfig', () => ({
    genAI: { getGenerativeModel: (...args: unknown[]) => mockGetGenerativeModel(...args) },
    MODELS_TO_TRY: ['model-a', 'model-b', 'model-c'],
}));

import { callGeminiWithFallback, GeminiFallbackError } from '../geminiFallback';

describe('callGeminiWithFallback', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('回傳第一個模型的成功結果，不嘗試後續模型', async () => {
        const callModel = jest.fn().mockResolvedValue('first-model-response');
        mockGetGenerativeModel.mockReturnValue({ name: 'model-a' });

        const result = await callGeminiWithFallback(callModel);

        expect(result.data).toBe('first-model-response');
        expect(result.modelName).toBe('model-a');
        expect(mockGetGenerativeModel).toHaveBeenCalledTimes(1);
        expect(callModel).toHaveBeenCalledTimes(1);
    });

    it('第一個模型失敗、第二個成功 → 回傳第二個模型結果，不嘗試第三個模型', async () => {
        const callModel = jest
            .fn()
            .mockRejectedValueOnce(new Error('model-a 掛了'))
            .mockResolvedValueOnce('second-model-response');
        mockGetGenerativeModel.mockImplementation((opts: { model: string }) => ({ name: opts.model }));

        const result = await callGeminiWithFallback(callModel);

        expect(result.data).toBe('second-model-response');
        expect(result.modelName).toBe('model-b');
        expect(callModel).toHaveBeenCalledTimes(2);
        expect(mockGetGenerativeModel).toHaveBeenCalledTimes(2);
    });

    it('全部模型皆因 429 失敗 → 拋出的錯誤標示為限流耗盡', async () => {
        const rateLimitError = Object.assign(new Error('quota exceeded'), { status: 429 });
        const callModel = jest.fn().mockRejectedValue(rateLimitError);
        mockGetGenerativeModel.mockImplementation((opts: { model: string }) => ({ name: opts.model }));

        await expect(callGeminiWithFallback(callModel)).rejects.toThrow(GeminiFallbackError);

        try {
            await callGeminiWithFallback(callModel);
            throw new Error('should have thrown');
        } catch (e) {
            expect(e).toBeInstanceOf(GeminiFallbackError);
            const err = e as GeminiFallbackError;
            expect(err.rateLimited).toBe(true);
        }
        expect(callModel).toHaveBeenCalledTimes(6); // 2 次呼叫 x 3 個模型
    });

    it('最後一個模型是一般錯誤（即使前面是 429）→ 拋出的錯誤標示為一般模型錯誤', async () => {
        const rateLimitError = Object.assign(new Error('rate limit hit'), { status: 429 });
        const invalidModelError = new Error('model not found (404)');
        const callModel = jest
            .fn()
            .mockRejectedValueOnce(rateLimitError)
            .mockRejectedValueOnce(rateLimitError)
            .mockRejectedValueOnce(invalidModelError);
        mockGetGenerativeModel.mockImplementation((opts: { model: string }) => ({ name: opts.model }));

        try {
            await callGeminiWithFallback(callModel);
            throw new Error('should have thrown');
        } catch (e) {
            expect(e).toBeInstanceOf(GeminiFallbackError);
            const err = e as GeminiFallbackError;
            expect(err.rateLimited).toBe(false);
        }
        expect(callModel).toHaveBeenCalledTimes(3);
    });

    it('錯誤物件沒有 .status 欄位也不會 crash，且以訊息關鍵字判斷限流', async () => {
        const weirdShapeError = { toString: () => 'weird', message: 'Error: 429 Too Many Requests - rate limit' };
        const callModel = jest.fn().mockRejectedValue(weirdShapeError);
        mockGetGenerativeModel.mockImplementation((opts: { model: string }) => ({ name: opts.model }));

        try {
            await callGeminiWithFallback(callModel);
            throw new Error('should have thrown');
        } catch (e) {
            expect(e).toBeInstanceOf(GeminiFallbackError);
            const err = e as GeminiFallbackError;
            expect(err.rateLimited).toBe(true);
        }
    });
});
