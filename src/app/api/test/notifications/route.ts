/**
 * 通知測試 API - 用於功能測試
 * 路徑: /api/test/notifications
 */

import { NextResponse } from 'next/server';
import { sendCaseReminder } from '@/lib/emailService';
import { sendCaseDeadlineAlert } from '@/lib/lineService';

export async function POST(request: Request) {
    try {
        const { type, ...params } = await request.json();

        switch (type) {
            case 'email':
                await sendCaseReminder(
                    params.email,
                    params.caseNumber,
                    params.dueDate
                );
                return NextResponse.json({
                    success: true,
                    message: 'Email 已發送'
                });

            case 'line':
                await sendCaseDeadlineAlert(
                    params.caseNumber,
                    params.dueDate,
                    params.daysRemaining
                );
                return NextResponse.json({
                    success: true,
                    message: 'LINE 訊息已發送'
                });

            default:
                return NextResponse.json(
                    { error: '不支援的通知類型' },
                    { status: 400 }
                );
        }
    } catch (error) {
        console.error('通知發送失敗:', error);
        return NextResponse.json(
            { error: '通知發送失敗', details: String(error) },
            { status: 500 }
        );
    }
}
