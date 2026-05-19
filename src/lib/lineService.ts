/**
 * LINE 訊息服務模組 - 標準 LINE Messaging API 實現
 * 用途：發送案件通知到 LINE
 */
import crypto from 'crypto';

const LINE_BOT_BASE = 'https://api.line.me/v2/bot';
const LINE_PUSH_URL = `${LINE_BOT_BASE}/message/push`;

interface LineMessageOptions {
    message: string;
}

export async function sendLineMessage(options: LineMessageOptions): Promise<void> {
    await sendLineMessageToUser(process.env.LINE_USER_ID!, options.message);
}

/** 發送 LINE 訊息給指定 User ID；accessToken 不傳則使用 LINE_CHANNEL_ACCESS_TOKEN */
export async function sendLineMessageToUser(userId: string, text: string, accessToken?: string): Promise<void> {
    const token = accessToken ?? process.env.LINE_CHANNEL_ACCESS_TOKEN;
    const response = await fetch(LINE_PUSH_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
            to: userId,
            messages: [{ type: 'text', text }],
        }),
    });

    if (!response.ok) {
        const error = await response.text();
        throw new Error(`LINE API 錯誤: ${error}`);
    }
}

/** 驗證 LINE Webhook 簽章（HMAC-SHA256） */
export function verifyLineSignature(body: string, signature: string): boolean {
    const secret = process.env.LINE_CHANNEL_SECRET;
    if (!secret) return false;

    const digest = crypto
        .createHmac('sha256', secret)
        .update(body)
        .digest('base64');
    return digest === signature;
}

/** 取得 LINE 用戶顯示名稱，失敗時回傳 null；accessToken 不傳則使用 LINE_CHANNEL_ACCESS_TOKEN */
export async function getLineUserProfile(userId: string, accessToken?: string): Promise<{ displayName: string } | null> {
    const token = accessToken ?? process.env.LINE_CHANNEL_ACCESS_TOKEN;
    try {
        const response = await fetch(`${LINE_BOT_BASE}/profile/${userId}`, {
            headers: { 'Authorization': `Bearer ${token}` },
        });
        if (!response.ok) return null;
        const data = await response.json() as { displayName: string };
        return { displayName: data.displayName };
    } catch {
        return null;
    }
}

/**
 * 發送案件截止提醒到 LINE
 */
export async function sendCaseDeadlineAlert(
    caseNumber: string,
    dueDate: string,
    daysRemaining: number
): Promise<void> {
    const message = `
⚠️ 案件截止提醒

案件編號：${caseNumber}
截止日期：${dueDate}
剩餘天數：${daysRemaining} 天

請盡快處理！
  `.trim();

    await sendLineMessage({ message });
}
