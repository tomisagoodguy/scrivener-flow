import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getAccessToken, getOrCreateDriveFolder } from '@/app/actions/googleDrive';

export async function POST(req: NextRequest) {
    const supabase = await createClient();
    const { data: { session } } = await supabase.auth.getSession();

    if (!session?.user) {
        return NextResponse.json({ error: '請先登入' }, { status: 401 });
    }

    const { caseId, caseNumber, fileName, mimeType, fileSize } = await req.json();

    const token = await getAccessToken();
    if (!token) {
        return NextResponse.json({ error: '未取得 Google 授權，請重新登入' }, { status: 401 });
    }

    // 建立資料夾結構
    const parentFolderName = 'ScrivenerFlow_Attachments';
    const targetFolderName = (caseId && caseNumber) ? `${caseNumber}_${caseId}` : 'Unsorted';

    const parentRes = await getOrCreateDriveFolder(parentFolderName);
    if (!parentRes.success) {
        return NextResponse.json({ error: parentRes.error }, { status: 500 });
    }

    const targetRes = await getOrCreateDriveFolder(targetFolderName, parentRes.data);
    if (!targetRes.success) {
        return NextResponse.json({ error: targetRes.error }, { status: 500 });
    }

    const folderId = targetRes.data;

    // 向 Google 申請 Resumable Upload Session
    const metadata = { name: fileName, parents: [folderId] };

    const initRes = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
            'X-Upload-Content-Type': mimeType,
            'X-Upload-Content-Length': fileSize.toString(),
        },
        body: JSON.stringify(metadata),
    });

    if (!initRes.ok) {
        const err = await initRes.json().catch(() => ({}));
        return NextResponse.json({ error: err.error?.message || 'Google 初始化失敗' }, { status: 500 });
    }

    const uploadUrl = initRes.headers.get('Location');
    if (!uploadUrl) {
        return NextResponse.json({ error: 'Google 未回傳上傳 URL' }, { status: 500 });
    }

    // 將 session 存入 DB（TTL 24h）
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    const { data: sessionRow, error: dbError } = await supabase
        .from('drive_upload_sessions')
        .insert({
            user_id: session.user.id,
            upload_url: uploadUrl,
            file_name: fileName,
            expires_at: expiresAt,
        })
        .select('id')
        .single();

    if (dbError) {
        return NextResponse.json({ error: '無法儲存上傳 session' }, { status: 500 });
    }

    return NextResponse.json({ sessionId: sessionRow.id });
}
