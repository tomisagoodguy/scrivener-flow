'use server';

import { generateAIBriefing as _generateAIBriefing } from './ai/briefingAction';
import { optimizeTextContent as _optimizeTextContent } from './ai/optimizationAction';
import { sendLineMessage as _sendLineMessage } from './lineNotify';

/**
 * AI 特助相關 Actions 入口
 * 修復 Next.js Build Error：明確定義為非同步函式導出
 */

export async function generateAIBriefing(userMessage?: string) {
    return _generateAIBriefing(userMessage);
}

export async function optimizeTextContent(content: string, type: 'grammar' | 'expand' | 'summarize' | 'structure' = 'grammar') {
    return _optimizeTextContent(content, type);
}

export async function sendLineMessage(text: string) {
    return _sendLineMessage(text);
}
