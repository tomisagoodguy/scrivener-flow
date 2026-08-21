import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getDriveFileDetails } from '@/app/actions/googleDrive';

export async function PUT(req: NextRequest) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return NextResponse.json({ error: '請先登入' }, { status: 401 });
    }

    const { sessionId, chunkBase64, rangeStart, rangeEnd, totalSize } = await req.json();

    // 查詢 session
    const { data: uploadSession, error } = await supabase
        .from('drive_upload_sessions')
        .select('*')
        .eq('id', sessionId)
        .single();

    if (error || !uploadSession) {
        return NextResponse.json({ error: 'session_expired', message: '找不到上傳 session，請重新上傳' }, { status: 404 });
    }

    if (uploadSession.user_id !== user.id) {
        return NextResponse.json({ error: '無權限' }, { status: 403 });
    }

    if (new Date(uploadSession.expires_at) < new Date()) {
        return NextResponse.json({ error: 'session_expired', message: 'Session 已過期，請重新上傳' }, { status: 404 });
    }

    // 解碼 chunk 並轉發至 Google Resumable Upload URL
    const chunkBuffer = Buffer.from(chunkBase64, 'base64');

    const googleRes = await fetch(uploadSession.upload_url, {
        method: 'PUT',
        headers: {
            'Content-Range': `bytes ${rangeStart}-${rangeEnd}/${totalSize}`,
            'Content-Type': 'application/octet-stream',
        },
        body: chunkBuffer,
    });

    // 308 Resume Incomplete = 中間塊已收到
    if (googleRes.status === 308) {
        const range = googleRes.headers.get('Range');
        const receivedBytes = range ? parseInt(range.split('-')[1]) + 1 : rangeEnd + 1;
        return NextResponse.json({ status: 'incomplete', receivedBytes });
    }

    // 200 / 201 = 上傳完成
    if (googleRes.status === 200 || googleRes.status === 201) {
        const fileData = await googleRes.json();

        // 清除 session
        await supabase.from('drive_upload_sessions').delete().eq('id', sessionId);

        // 取得完整檔案資訊
        const details = await getDriveFileDetails(fileData.id);
        if (details.success) {
            return NextResponse.json({ status: 'complete', ...details.data });
        }
        return NextResponse.json({
            status: 'complete',
            fileId: fileData.id,
            webViewLink: fileData.webViewLink,
            name: uploadSession.file_name,
        });
    }

    const errBody = await googleRes.text();
    return NextResponse.json({ error: `Google 上傳失敗 (${googleRes.status}): ${errBody}` }, { status: 500 });
}
