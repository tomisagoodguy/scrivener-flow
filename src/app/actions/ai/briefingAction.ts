'use server';

import { createClient } from '@/lib/supabase/server';
import { SchemaType, Tool } from '@google/generative-ai';
import { genAI, ALLOWED_EMAIL, MODELS_TO_TRY } from '@/lib/ai/geminiConfig';
import { sendLineMessage } from '../lineNotify';

const STANDARD_CHECKLIST_ITEMS = [
    '買方蓋印章', '賣方蓋印章', '用印款', '完稅款', '權狀印鑑', '授權',
    '解約排除', '規費', '設定', '稅單', '差額', '整過戶',
    '整交屋', '實登', '打單', '履保', '水電', '稅費分算',
    '保單', '代償', '塗銷', '二撥'
];

export async function generateAIBriefing(userMessage?: string) {
    if (!genAI) return { success: false, message: '系統設定錯誤：尚未設定 API Key。' };

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || user.email?.toLowerCase() !== ALLOWED_EMAIL.toLowerCase()) {
        return { success: false, message: '權限不足。' };
    }

    const { data: pendingTodos } = await supabase.from('todos').select('*').eq('user_id', user.id).eq('is_completed', false).order('due_date', { ascending: true }).limit(10);
    const { data: activeCases } = await supabase.from('cases').select('*, milestones(*), financials(*)').eq('user_id', user.id).neq('status', 'Closed').order('updated_at', { ascending: false }).limit(30);
    const { data: scratchpad } = await supabase.from('user_settings').select('scratchpad_content').eq('user_id', user.id).maybeSingle();

    const contextData = {
        今天是: new Date().toISOString().split('T')[0],
        待辦事項: pendingTodos?.map(t => `${t.content} (${t.due_date})`),
        進行中案件: activeCases?.map(c => ({
            案名: c.buyer_name,
            狀態: c.status,
            辦事清單: {
                已完成: Object.entries(c.todos || {}).filter(([_, v]) => v).map(([k]) => k),
                未完成: STANDARD_CHECKLIST_ITEMS.filter(i => !(c.todos || {})[i])
            },
            備註: c.private_notes || '無'
        })),
        隨手筆記: scratchpad?.scratchpad_content?.substring(0, 500) || ''
    };

    const systemPrompt = `你是 Tom 的 AI 特助。請提供每日簡報。資料如下：\n${JSON.stringify(contextData, null, 2)}\n${userMessage || '請開始簡報。'}`;

    const tools: Tool[] = [{
        functionDeclarations: [{
            name: 'sendLineMessage',
            description: '發送訊息到 LINE。',
            parameters: {
                type: SchemaType.OBJECT,
                properties: { text: { type: SchemaType.STRING } },
                required: ['text']
            }
        }]
    }];

    for (const modelName of MODELS_TO_TRY) {
        try {
            const model = genAI.getGenerativeModel({ model: modelName, tools });
            const chat = model.startChat();
            const result = await chat.sendMessage(systemPrompt);
            const response = result.response;
            const call = response.functionCalls()?.[0];

            if (call?.name === 'sendLineMessage') {
                const { text } = call.args as { text: string };
                const lineRes = await sendLineMessage(text);
                const final = await chat.sendMessage([{ functionResponse: { name: 'sendLineMessage', response: lineRes } }]);
                return { success: true, message: final.response.text() };
            }
            return { success: true, message: response.text() };
        } catch (e: any) {
            console.warn(`Model ${modelName} failed: ${e.message}`);
        }
    }
    return { success: false, message: 'AI 目前無法連線。' };
}
