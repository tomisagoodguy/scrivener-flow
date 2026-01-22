'use server';

interface LineMessageResponse {
    success: boolean;
    error?: string;
}

export async function sendLineMessage(text: string): Promise<LineMessageResponse> {
    let CHANNEL_ACCESS_TOKEN = process.env.LINE_CHANNEL_ACCESS_TOKEN?.replace(/^["']|["']$/g, '');
    let USER_ID = process.env.LINE_USER_ID?.replace(/^["']|["']$/g, '');

    if (!CHANNEL_ACCESS_TOKEN || !USER_ID) {
        console.error('LINE Configuration missing: TOKEN exists?', !!CHANNEL_ACCESS_TOKEN, 'USER_ID exists?', !!USER_ID);
        return {
            success: false,
            error: 'Server configuration missing: LINE_CHANNEL_ACCESS_TOKEN or LINE_USER_ID'
        };
    }

    console.log('Sending LINE message to:', USER_ID.substring(0, 6) + '...');

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
            console.error('Line API Error Detail:', JSON.stringify(errorData));
            return {
                success: false,
                error: `Line API Error (${response.status}): ${errorData.message || response.statusText}`
            };
        }

        console.log('LINE Message sent successfully');

        return { success: true };
    } catch (error: any) {
        console.error('Send Line Message Error:', error);
        return {
            success: false,
            error: error.message || 'Unknown error occurred'
        };
    }
}
