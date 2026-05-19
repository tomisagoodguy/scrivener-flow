import { NextRequest, NextResponse } from 'next/server';
import {
    verifyLineSignature,
    sendLineMessageToUser,
    getLineUserProfile,
} from '@/lib/lineService';
import {
    upsertFollower,
    deactivateFollower,
    findFollowerByDisplayName,
    listActiveFollowers,
} from '@/lib/lineFollowerService';

interface LineTextMessage {
    type: 'text';
    text: string;
}

interface LineMessage {
    type: string;
    text?: string;
}

interface LineSource {
    userId?: string;
}

interface LineEvent {
    type: string;
    replyToken?: string;
    source: LineSource;
    message?: LineMessage;
}

interface LineWebhookBody {
    events: LineEvent[];
}

// ETF 訊號站 Bot 的 token，Webhook 收發訊息均走此 Bot
const BOT_TOKEN = () => process.env.STOCK_LINE_CHANNEL_ACCESS_TOKEN ?? '';

export async function POST(request: NextRequest): Promise<NextResponse> {
    if (!process.env.LINE_CHANNEL_SECRET) {
        return NextResponse.json({ error: 'LINE_CHANNEL_SECRET 未設定' }, { status: 500 });
    }

    const rawBody = await request.text();
    const signature = request.headers.get('x-line-signature') ?? '';

    if (!verifyLineSignature(rawBody, signature)) {
        return NextResponse.json({ error: '無效簽章' }, { status: 400 });
    }

    const body = JSON.parse(rawBody) as LineWebhookBody;
    // ETF 訊號站 Bot 的管理員 User ID（LINE User ID 每個 Bot 不同）
    const adminUserId = process.env.STOCK_LINE_USER_ID ?? '';

    await Promise.all(
        body.events.map((event) => handleEvent(event, adminUserId))
    );

    return NextResponse.json({ ok: true });
}

async function handleEvent(event: LineEvent, adminUserId: string): Promise<void> {
    const senderId = event.source.userId;
    const token = BOT_TOKEN();

    if (event.type === 'follow') {
        if (!senderId) return;
        const profile = await getLineUserProfile(senderId, token);
        await upsertFollower(senderId, profile?.displayName ?? null);
        return;
    }

    if (event.type === 'unfollow') {
        if (!senderId) return;
        await deactivateFollower(senderId);
        return;
    }

    if (event.type === 'message') {
        if (!senderId) return;
        const msg = event.message;
        if (!msg) return;

        const isAdmin = senderId === adminUserId;

        // DEBUG: 暫時回傳 sender ID，確認後刪除
        await sendLineMessageToUser(senderId, `你的 LINE User ID：${senderId}\nadminUserId：${adminUserId}`, token);

        if (isAdmin) {
            await handleAdminMessage(msg, adminUserId, token);
        } else {
            await handleFriendMessage(senderId, msg, adminUserId, token);
        }
    }
}

async function handleAdminMessage(msg: LineMessage, adminUserId: string, token: string): Promise<void> {
    if (msg.type !== 'text' || !msg.text) return;
    const text = msg.text.trim();

    if (text === '/list') {
        const followers = await listActiveFollowers();
        if (followers.length === 0) {
            await sendLineMessageToUser(adminUserId, '目前沒有好友', token);
        } else {
            const lines = followers.map((f, i) => `${i + 1}. ${f.display_name ?? '（無名稱）'}`);
            await sendLineMessageToUser(adminUserId, `好友清單（${followers.length} 人）\n${lines.join('\n')}`, token);
        }
        return;
    }

    if (!text.startsWith('@')) return;

    const spaceIndex = text.indexOf(' ');
    if (spaceIndex === -1) {
        await sendLineMessageToUser(adminUserId, '格式：@暱稱 訊息內容', token);
        return;
    }

    const nickname = text.slice(1, spaceIndex);
    const content = text.slice(spaceIndex + 1).trim();

    const targetUserId = await findFollowerByDisplayName(nickname);
    if (!targetUserId) {
        await sendLineMessageToUser(adminUserId, `找不到好友「${nickname}」，請確認名稱是否正確`, token);
        return;
    }

    await sendLineMessageToUser(targetUserId, content, token);
}

async function handleFriendMessage(
    senderId: string,
    msg: LineMessage,
    adminUserId: string,
    token: string,
): Promise<void> {
    if (msg.type !== 'text') {
        await sendLineMessageToUser(senderId, '目前只支援文字訊息，謝謝！', token);
        return;
    }

    const profile = await getLineUserProfile(senderId, token);
    const displayName = profile?.displayName ?? senderId;
    const text = (msg as LineTextMessage).text;

    const forwarded = `[好友 ${displayName}] ${text}\n\n↩ 回覆：@${displayName} 你的訊息`;
    await sendLineMessageToUser(adminUserId, forwarded, token);
}
