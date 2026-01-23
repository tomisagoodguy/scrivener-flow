'use server';

import { createClient } from '@/lib/supabase/server';
import { genAI, ALLOWED_EMAIL, MODELS_TO_TRY } from '@/lib/ai/geminiConfig';

export async function optimizeTextContent(content: string, type: 'grammar' | 'expand' | 'summarize' | 'structure' = 'grammar') {
    if (!genAI) return { success: false, message: 'API Key missing' };

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || user.email?.toLowerCase() !== ALLOWED_EMAIL.toLowerCase()) {
        return { success: false, message: 'Access Denied' };
    }

    let prompt = '';
    if (type === 'grammar') prompt = '潤飾文字並修正錯字運法，保持 HTML 結構：\n\n';
    else if (type === 'expand') prompt = '擴充內容並增加專業細節，保持 HTML 結構：\n\n';
    else if (type === 'summarize') prompt = '總結重點並條列化，保持表格結構：\n\n';
    else if (type === 'structure') prompt = '將文字轉換為高度有序、美觀且具視覺層次的 HTML 文檔，僅輸出 HTML 片段：\n\n';

    for (const modelName of MODELS_TO_TRY) {
        try {
            const model = genAI.getGenerativeModel({ model: modelName });
            const result = await model.generateContent(prompt + content);
            return { success: true, data: result.response.text() };
        } catch (e: any) {
            console.warn(`Model ${modelName} failed: ${e.message}`);
        }
    }
    return { success: false, message: '優化失敗。' };
}
