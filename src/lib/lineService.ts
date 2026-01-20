/**
 * LINE 訊息服務模組 - 標準 LINE Messaging API 實現
 * 用途：發送案件通知到 LINE
 */

interface LineMessageOptions {
    message: string;
}

/**
 * 發送 LINE 訊息（符合 API 速率限制）
 * 環境變數需求：
 * - LINE_CHANNEL_ACCESS_TOKEN: LINE Channel Access Token
 * - LINE_USER_ID: 接收者的 LINE User ID
 */
export async function sendLineMessage(options: LineMessageOptions): Promise<void> {
    const LINE_API_URL = 'https://api.line.me/v2/bot/message/push';

    const response = await fetch(LINE_API_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.LINE_CHANNEL_ACCESS_TOKEN}`,
        },
        body: JSON.stringify({
            to: process.env.LINE_USER_ID,
            messages: [
                {
                    type: 'text',
                    text: options.message,
                },
            ],
        }),
    });

    if (!response.ok) {
        const error = await response.text();
        throw new Error(`LINE API 錯誤: ${error}`);
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
