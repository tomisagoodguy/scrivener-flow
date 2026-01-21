'use server';

import { createClient } from '@/lib/supabase/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { sendLineMessage } from './lineNotify';

// Initialize Gemini
// Note: This requires GOOGLE_GEMINI_API_KEY to be set in .env.local
const apiKey = process.env.GOOGLE_GEMINI_API_KEY;
const genAI = apiKey ? new GoogleGenerativeAI(apiKey) : null;

// The allowed email for this feature
const ALLOWED_EMAIL = 'tom890108159@gmail.com';  // Updated to match the specific user request

/**
 * Generate a daily briefing or answer specific questions based on user context
 */
export async function generateAIBriefing(userMessage?: string) {
    if (!genAI) {
        return {
            success: false,
            message: '系統設定錯誤：尚未設定 Google Gemini API Key。請聯繫管理員。'
        };
    }

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user || user.email?.toLowerCase() !== ALLOWED_EMAIL.toLowerCase()) {
        return {
            success: false,
            message: '權限不足：此 AI 特助功能僅限特定帳戶使用。'
        };
    }

    // 1. Gather Context
    // 1. Gather Context
    // Pending Tasks (To-Do)
    const { data: pendingTodos } = await supabase
        .from('todos')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_completed', false)
        .order('due_date', { ascending: true })
        .limit(10);

    // Completed Tasks (Recently Done)
    const { data: completedTodos } = await supabase
        .from('todos')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_completed', true)
        .order('updated_at', { ascending: false })
        .limit(5);

    // Standard Checklist Items (Hardcoded to match UI in EditCaseForm.tsx)
    const STANDARD_CHECKLIST_ITEMS = [
        // 簽約與用印階段
        '買方蓋印章', '賣方蓋印章', '用印款', '完稅款', '權狀印鑑', '授權',
        '解約排除', '規費', '設定', '稅單', '差額', '整過戶',
        // 過戶與交屋階段
        '整交屋', '實登', '打單', '履保', '水電', '稅費分算',
        '保單', '代償', '塗銷', '二撥'
    ];

    // Active Cases (In Progress) target all specific details user sees in the form
    const { data: activeCases } = await supabase
        .from('cases')
        .select(`
            case_number, buyer_name, seller_name, city, district, status, 
            todos, pending_tasks, private_notes, tax_type, cancellation_type,
            milestones (*),
            financials (*)
        `)
        .eq('user_id', user.id)
        .neq('status', 'Closed')
        .order('updated_at', { ascending: false }) // Prioritize recently updated
        .limit(30);

    // Closed Cases (Finished)
    const { data: closedCases } = await supabase
        .from('cases')
        .select('case_number, buyer_name, city, district, status, updated_at')
        .eq('user_id', user.id)
        .eq('status', 'Closed')
        .order('updated_at', { ascending: false })
        .limit(5);

    // Recent Notes (Scratchpad)
    const { data: scratchpad } = await supabase
        .from('user_settings')
        .select('scratchpad_content')
        .eq('user_id', user.id)
        .maybeSingle();

    // 2. Construct Prompt
    const today = new Date().toISOString().split('T')[0];
    const contextData = {
        今天是: today,
        目前進度: {
            待辦事項_Todos: pendingTodos?.map(t => `${t.content} (期限: ${t.due_date})`),
            進行中案件_ActiveCases: activeCases?.map(c => {
                // Parse Todos (Checklist)
                const todos = c.todos as Record<string, boolean> || {};

                // Identify Completed (Green)
                const completedItems = Object.entries(todos)
                    .filter(([_, isDone]) => isDone)
                    .map(([item]) => item);

                // Identify Pending (Red) - Based on Standard List
                const pendingItems = STANDARD_CHECKLIST_ITEMS.filter(item => !completedItems.includes(item));

                const m = c.milestones?.[0] || {};
                const f = c.financials?.[0] || {};

                return {
                    案件編號: c.case_number,
                    案名_買方_賣方: `${c.buyer_name} 案 (買方:${c.buyer_name} / 賣方:${c.seller_name})`,
                    地區: `${c.city}${c.district}`,
                    狀態: c.status,
                    辦事清單狀態: {
                        已完成_綠燈: completedItems,
                        未完成_紅燈: pendingItems
                    },
                    關鍵里程碑日期: {
                        簽約日: m.contract_date,
                        用印日: m.seal_date,
                        完稅日: m.tax_payment_date,
                        交屋日: m.handover_date,
                        代償日: m.redemption_date
                    },
                    財務與銀行: {
                        成交價: f.total_price,
                        預收規費: f.pre_collected_fee,
                        買方銀行: f.buyer_bank,
                        賣方銀行: f.seller_bank,
                        尾款: m.balance_amount
                    },
                    詳細備註: {
                        私密備註_Notes: c.private_notes || '無',
                        代辦事項_PendingTasks: c.pending_tasks || '無',
                        移轉備註: m.transfer_note || '無'
                    }
                };
            }),
        },
        已完成成就: {
            最近完成事項: completedTodos?.map(t => `${t.content}`),
            已結案案件: closedCases?.map(c => `${c.buyer_name}案 (${c.case_number}) - 於 ${new Date(c.updated_at).toLocaleDateString()} 結案`)
        },
        隨手筆記: scratchpad?.scratchpad_content?.substring(0, 500) || ''
    };

    const systemPrompt = `
    你是專屬的 AI 行政特助。你的服務對象是 Tom (tom890108159)。
    你現在擁有使用者的「全域視野」，資料非常詳盡。
    
    【重要指令】：
    1. **讀取完整資訊**：當使用者詢問特定案件（如「AB1253703」）時，請務必查閱資料中的「案件編號」。
    2. **分辨紅綠燈**：
       - 資料中標示為 **[未完成_紅燈]** 的項目，代表 UI 上顯示為「紅色/未打勾」的項目。
       - 資料中標示為 **[已完成_綠燈]** 的項目，代表 UI 上顯示為「綠色/已打勾」的項目。
       - 使用者可能會問「還有什麼沒做？」，請依據 [未完成_紅燈] 回答。
    3. **進度判斷**：
       - 若某個案件 [未完成_紅燈] 項目很多，且日期已近，請提醒進度落後。
    4. **語氣**：專業、精準。給予數據和具體項目，不要模糊帶過。
    5. **撰寫訊息**：若使用者要求「寫訊息」、「修飾文字」或「寄Line」，請將你建議的 **最終發送內容** (不含其他解釋文字) 放在 \`:::LINE_DRAFT_START:::\` 與 \`:::LINE_DRAFT_END:::\` 之間。即便只有一句話也要包起來，方便系統辨識。

    【目前全域資料】：
    ${JSON.stringify(contextData, null, 2)}
    
    ${userMessage ? `【使用者特別指令】：${userMessage}` : '【指令】：請提供今天的「每日簡報 (Daily Briefing)」，並包含我的整體進度概況。'}
    `;

    // Models to try in order of preference (Fastest/Best -> Fallback)
    const modelsToTry = [
        'gemini-2.0-flash',     // Latest stable 2.0
        'gemini-1.5-flash',     // Very stable 1.5
        'gemini-1.5-pro'        // Powerful fallback
    ];

    // Tool definition for Gemini
    const tools = [
        {
            functionDeclarations: [
                {
                    name: 'sendLineMessage',
                    description: '將修飾好的訊息內容發送到使用者的 LINE 帳號。僅在使用者明確表示「好」、「可以」、「寄出」或「發送」時執行。',
                    parameters: {
                        type: 'object',
                        properties: {
                            text: {
                                type: 'string',
                                description: '要發送到 LINE 的訊息內容。'
                            }
                        },
                        required: ['text']
                    }
                }
            ]
        }
    ];

    try {
        for (const modelName of modelsToTry) {
            try {
                const model = genAI.getGenerativeModel({
                    model: modelName,
                    tools: tools
                });

                // Start chat to handle potential tool calls (even if stateless, we simulate a single turn with history if needed)
                const chat = model.startChat();
                const result = await chat.sendMessage(systemPrompt);
                const response = result.response;

                // Handle tool calls
                const call = response.functionCalls()?.[0];
                if (call && call.name === 'sendLineMessage') {
                    const { text } = call.args as { text: string };
                    const lineRes = await sendLineMessage(text);

                    // Send tool result back to model so it can confirm to user
                    const toolResult = {
                        functionResponse: {
                            name: 'sendLineMessage',
                            response: { success: lineRes.success, error: lineRes.error }
                        }
                    };

                    const finalResult = await chat.sendMessage([toolResult]);
                    return { success: true, message: finalResult.response.text() };
                }

                return { success: true, message: response.text() };
            } catch (error: any) {
                console.warn(`Model ${modelName} failed/unavailable, trying next... Error: ${error.message}`);
                if (modelName === modelsToTry[modelsToTry.length - 1]) throw error;
            }
        }
        return { success: false, message: '所有 AI 模型目前均無法連線，請稍後再試。' };
    } catch (error: any) {
        console.error('Gemini API Error:', error);
        return { success: false, message: `串接錯誤: ${error.message || '未知原因'}` };
    }
}

// Fixed sendLineMessage in the same file or reference the one in lineNotify.ts
// Let's ensure lineNotify.ts handles quotes correctly.

/**
 * Optimize text content (for Notes)
 */
export async function optimizeTextContent(content: string, type: 'grammar' | 'expand' | 'summarize' | 'structure' = 'grammar') {
    if (!genAI) return { success: false, message: 'API Key missing' };

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user || user.email?.toLowerCase() !== ALLOWED_EMAIL.toLowerCase()) {
        return { success: false, message: 'Access Denied' };
    }

    let prompt = '';
    if (type === 'grammar') prompt = '你是專業的文書編輯。請幫我潤飾以下文字，修正錯字、語法，並使其更通順專業，但不要改變原意：\n\n';
    if (type === 'expand') prompt = '你是創意寫作助手。請幫我擴充以下文字的內容，增加細節與專業深度：\n\n';
    if (type === 'summarize') prompt = '你是重點整理專家。請幫我將以下內容總結為條列式的重點摘要：\n\n';
    if (type === 'structure') {
        prompt = `
You are a world-class structured thinking expert and UI/UX specialist.
Your task is to take the provided "Messy/Unstructured Text" and transform it into a highly organized, visually structured, and easy-to-read document.

**Role & Persona:**
- **Structured Thinker:** You organize chaos into logic.
- **UI/UX Designer:** You care about "readability," "typography," and "visual hierarchy."
- **Productivity Guru:** You highlight action items and key takeaways.

**Formatting Guidelines (Strictly Follow):**
1.  **Use Markdown Heavily:**
    - Use **H2 (##)** for main sections (e.g., "CORE MESSAGE", "ACTION ITEMS", "DETAILS").
    - Use **H3 (###)** for sub-sections.
    - Use **Bold** for keywords and emphasis.
    - Use *Italics* for nuance.
2.  **Visual Elements:**
    - Use Emoji 🎨 intelligently to add visual cues (e.g., ✅ for tasks, 💡 for ideas, 🚀 for goals, ⚠️ for risks).
    - Use **Blockquotes (>)** for important summaries or context.
    - Use **Tables** if data comparison is detected.
    - Use **Bullet Points** and **Numbered Lists** for readability.
    - Use **Code Blocks** for any technical content or scripts.
    - Use **Horizontal Rules (---)** to separate major sections.
3.  **Content Organization:**
    - **Summary First (Executive Summary):** Start with a 1-2 sentence high-level summary.
    - **Core Content:** Group related points together logically.
    - **Actionable Items (Next Steps):** Always extract potential tasks into a checklist (- [ ] task).
    - **Tags/Metadata:** Suggest 3-5 relevant tags at the bottom.

**Tone:**
- Professional, Clean, Efficient, and "Not Boring."
- Traditional Chinese (Taiwan), but keep technical terms in English where appropriate.

**Constraints (CRITICAL):**
1.  **NO HALLUCINATION:** Do NOT add any facts, dates, or details that are not in the source text.
2.  **PRESERVE MEANING:** You are an editor and designer, not a ghostwriter. Keep the user's original intent 100% intact.
3.  **NO FLUFF:** Do not add introductory or concluding pleasantries (e.g., "Here is your structured text..."). Just output the result.

**Instruction:**
Strictly restructure and format the following text based on the guidelines above:

`;
    }

    // Models to try in order of preference
    const modelsToTry = [
        'gemini-2.5-flash',
        'gemini-3-flash',
        'gemini-2.5-flash-lite',
        'gemini-robotics-er-1.5-preview',
        'gemma-3-27b',
        'gemma-3-12b',
        'gemma-3-4b',
        'gemma-3-2b',
        'gemma-3-1b'
    ];

    for (const modelName of modelsToTry) {
        try {
            const model = genAI.getGenerativeModel({ model: modelName });
            const result = await model.generateContent(prompt + content);
            return { success: true, data: result.response.text() };
        } catch (error: any) {
            console.warn(`Optimization Model ${modelName} failed, trying next...`);
            if (modelName === modelsToTry[modelsToTry.length - 1]) return { success: false, message: `Optimization failed: ${error.message}` };
        }
    }

    return { success: false, message: 'All models failed.' };
}
