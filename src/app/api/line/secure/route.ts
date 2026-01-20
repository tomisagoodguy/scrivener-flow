
import { NextRequest } from 'next/server';
import { SecureApi } from '@/lib/crypto/secureApi';

interface LineMessageRequest {
    text: string;
}

export async function POST(request: NextRequest) {
    try {
        // 1. 解密請求 (Client 端傳來的是加密的亂碼)
        const { text } = await SecureApi.decryptRequest<LineMessageRequest>(request);

        if (!text) {
            return await SecureApi.encryptResponse({ success: false, error: 'Message text is required' });
        }

        const CHANNEL_ACCESS_TOKEN = process.env.LINE_CHANNEL_ACCESS_TOKEN;
        const USER_ID = process.env.LINE_USER_ID;

        if (!CHANNEL_ACCESS_TOKEN || !USER_ID) {
            console.error('LINE Config Missing');
            return await SecureApi.encryptResponse({
                success: false,
                error: 'Server configuration missing'
            });
        }

        // 2. 呼叫 LINE API (Server -> LINE，這段走 HTTPS 已足夠安全)
        const response = await fetch('https://api.line.me/v2/bot/message/push', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${CHANNEL_ACCESS_TOKEN}`,
            },
            body: JSON.stringify({
                to: USER_ID,
                messages: [{ type: 'text', text: text }],
            }),
        });

        if (!response.ok) {
            const errorData = await response.json();
            console.error('Line API Error:', errorData);  // Server Log 確實會記錄錯誤，但這是在後端
            return await SecureApi.encryptResponse({
                success: false,
                error: `Line API Error: ${errorData.message}`
            });
        }

        // 3. 加密回應 (回傳給 Client)
        return await SecureApi.encryptResponse({ success: true });

    } catch (error) {
        console.error('Secure LINE API Error:', error);
        return await SecureApi.encryptResponse({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
}
