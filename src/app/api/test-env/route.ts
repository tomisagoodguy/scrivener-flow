import { NextResponse } from 'next/server';

export async function GET() {
    const hasToken = !!process.env.LINE_CHANNEL_ACCESS_TOKEN;
    const hasUserId = !!process.env.LINE_USER_ID;

    return NextResponse.json({
        status: 'Environment Check',
        LINE_CHANNEL_ACCESS_TOKEN: {
            exists: hasToken,
            length: process.env.LINE_CHANNEL_ACCESS_TOKEN?.length || 0,
            first10: hasToken ? process.env.LINE_CHANNEL_ACCESS_TOKEN?.substring(0, 10) : 'missing'
        },
        LINE_USER_ID: {
            exists: hasUserId,
            length: process.env.LINE_USER_ID?.length || 0,
            value: hasUserId ? process.env.LINE_USER_ID : 'missing'
        },
        allLineEnvKeys: Object.keys(process.env).filter(k => k.includes('LINE'))
    });
}
