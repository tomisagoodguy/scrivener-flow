'use server';

interface LineMessageResponse {
    success: boolean;
    error?: string;
}

export async function sendLineMessage(text: string): Promise<LineMessageResponse> {
    const CHANNEL_ACCESS_TOKEN = process.env.LINE_CHANNEL_ACCESS_TOKEN;
    const USER_ID = process.env.LINE_USER_ID;

    if (!CHANNEL_ACCESS_TOKEN || !USER_ID) {
        return {
            success: false,
            error: 'Server configuration missing: LINE_CHANNEL_ACCESS_TOKEN or LINE_USER_ID'
        };
    }

    try {
        const response = await fetch('https://api.line.me/v2/bot/message/push', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${CHANNEL_ACCESS_TOKEN}`,
            },
            body: JSON.stringify({
                to: USER_ID,
                messages: [
                    {
                        type: 'text',
                        text: text,
                    },
                ],
            }),
        });

        if (!response.ok) {
            const errorData = await response.json();
            console.error('Line API Error:', errorData);
            return {
                success: false,
                error: `Line API Error: ${errorData.message || response.statusText}`
            };
        }

        return { success: true };
    } catch (error: any) {
        console.error('Send Line Message Error:', error);
        return {
            success: false,
            error: error.message || 'Unknown error occurred'
        };
    }
}
