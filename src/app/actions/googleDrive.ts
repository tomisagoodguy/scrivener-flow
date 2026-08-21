'use server';

import { createClient } from '@/lib/supabase/server';

interface DriveActionResponse {
    success: boolean;
    data?: any;
    error?: string;
}

/**
 * 取得當前使用者的 Google Access Token
 * 具備自動刷新機制 (Refresh Token Rotation)
 */
export async function getAccessToken() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        throw new Error('請先登入系統');
    }

    const { data: { session } } = await supabase.auth.getSession();
    const userId = user.id;

    // 1. 優先查看 Session (最快，但每小時會過期)
    let token = session?.provider_token;

    // 2. 從資料庫讀取備份與 Refresh Token
    const { data: settings } = await supabase
        .from('user_settings')
        .select('*')
        .eq('user_id', userId)
        .single();

    // 如果 Session 沒有，或是我們有更好的持久化 Token
    if (!token) {
        token = settings?.google_access_token;
    }

    // 3. 檢查 Token 是否確實可用 (或是嘗試刷新)
    // 如果沒有 refresh_token，我們也沒轍，只能叫使用者重登
    const refreshToken = settings?.google_refresh_token;

    if (!refreshToken) {
        return token || null;
    }

    // 這裡我們實作一個主動預判：如果最後更新時間超過 55 分鐘就刷新
    const lastUpdate = settings?.last_token_update ? new Date(settings.last_token_update).getTime() : 0;
    const now = Date.now();
    const refreshThreshold = 55 * 60 * 1000;

    if (!token || (now - lastUpdate > refreshThreshold)) {
        console.log('[GoogleAuth] Token 可能已過期，正在執行自動刷新...');
        try {
            const response = await fetch('https://oauth2.googleapis.com/token', {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: new URLSearchParams({
                    client_id: process.env.GOOGLE_CLIENT_ID!,
                    client_secret: process.env.GOOGLE_CLIENT_SECRET!,
                    refresh_token: refreshToken,
                    grant_type: 'refresh_token',
                }),
            });

            if (!response.ok) {
                const errorText = await response.text();
                console.error('[GoogleAuth] 刷新請求失敗:', response.status, errorText);
                return token || null;
            }

            const data = await response.json();

            if (data.access_token) {
                console.log('[GoogleAuth] Token 刷新成功');
                const updatedToken = data.access_token;
                await supabase.from('user_settings').update({
                    google_access_token: updatedToken,
                    last_token_update: new Date().toISOString(),
                }).eq('user_id', userId);

                return updatedToken;
            } else {
                console.error('[GoogleAuth] 刷新失敗:', data);
            }
        } catch (e) {
            console.error('[GoogleAuth] 刷新過程發生致命錯誤:', e);
        }
    }

    return token || null;
}

/**
 * 在 Google Drive 搜尋或建立資料夾 (伺服器端執行)
 */
export async function getOrCreateDriveFolder(folderName: string, parentId?: string): Promise<DriveActionResponse> {
    try {
        const token = await getAccessToken();
        if (!token) return { success: false, error: '未取得 Google 授權，請重新登入' };

        let query = `name='${folderName}' and mimeType='application/vnd.google-apps.folder' and trashed=false`;
        if (parentId) {
            query += ` and '${parentId}' in parents`;
        }

        const url = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}`;

        const res = await fetch(url, {
            headers: { Authorization: `Bearer ${token}` }
        });
        const data = await res.json();

        if (data.files && data.files.length > 0) {
            return { success: true, data: data.files[0].id };
        }

        // 建立資料夾
        const body: any = {
            name: folderName,
            mimeType: 'application/vnd.google-apps.folder',
        };
        if (parentId) {
            body.parents = [parentId];
        }

        const createRes = await fetch('https://www.googleapis.com/drive/v3/files', {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(body),
        });
        const createData = await createRes.json();
        return { success: true, data: createData.id };
    } catch (error: any) {
        console.error('Drive Folder Error:', error);
        return { success: false, error: error.message };
    }
}

/**
 * 初始化續傳上傳 (伺服器端執行)
 */
export async function initResumableUpload(
    fileName: string,
    fileType: string,
    fileSize: number,
    folderId?: string
): Promise<DriveActionResponse> {
    try {
        const token = await getAccessToken();
        if (!token) return { success: false, error: '未取得 Google 授權' };

        const metadata = {
            name: fileName,
            parents: folderId ? [folderId] : [],
        };

        const res = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
                'X-Upload-Content-Type': fileType,
                'X-Upload-Content-Length': fileSize.toString(),
            },
            body: JSON.stringify(metadata),
        });

        if (!res.ok) {
            const err = await res.json();
            return { success: false, error: err.error?.message || '初始化失敗' };
        }

        const uploadUrl = res.headers.get('Location');
        return { success: true, data: uploadUrl };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

/**
 * 全伺服器中繼上傳：由伺服器代理將檔案傳送到 Google Drive
 */
export async function uploadFileToServerAction(
    formData: FormData,
    caseId?: string,
    caseNumber?: string
): Promise<DriveActionResponse> {
    try {
        const file = formData.get('file') as File;
        if (!file) return { success: false, error: '未接收到檔案' };

        const token = await getAccessToken();
        if (!token) return { success: false, error: '未取得授權' };

        // 1. 決定資料夾結構
        const parentFolderName = 'ScrivenerFlow_Attachments';
        const targetFolderName = (caseId && caseNumber)
            ? `${caseNumber}_${caseId}`
            : 'Unsorted';

        // 確保父資料夾存在 (此時會固定返回 1pC9...dki)
        const parentRes = await getOrCreateDriveFolder(parentFolderName);
        if (!parentRes.success) return parentRes;
        const parentId = parentRes.data;

        // 確保目標資料夾存在於父資料夾內
        const targetRes = await getOrCreateDriveFolder(targetFolderName, parentId);
        if (!targetRes.success) return targetRes;
        const targetFolderId = targetRes.data;

        // 2. 進行簡單上傳 (Multipart)
        const metadata = {
            name: file.name,
            parents: [targetFolderId],
        };

        const form = new FormData();
        form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
        form.append('file', file);

        const uploadRes = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
            },
            body: form,
        });

        if (!uploadRes.ok) {
            const err = await uploadRes.json();
            return { success: false, error: err.error?.message || '上傳失敗' };
        }

        const uploadData = await uploadRes.json();

        // 3. 取得完整詳細資訊
        return await getDriveFileDetails(uploadData.id);

    } catch (error: any) {
        console.error('Full Proxy Upload Error:', error);
        return { success: false, error: error.message };
    }
}

/**
 * 取得檔案詳細資訊 (伺服器端執行)
 */
export async function getDriveFileDetails(fileId: string): Promise<DriveActionResponse> {
    try {
        const token = await getAccessToken();
        if (!token) return { success: false, error: '未取得授權' };

        const res = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?fields=id,name,webViewLink,iconLink`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        const data = await res.json();
        return { success: true, data };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

/**
 * 方便前端呼叫的快捷函式
 */
export async function uploadToDrive(file: File, folderName: string = 'ScrivenerFlow_Attachments'): Promise<DriveActionResponse> {
    const formData = new FormData();
    formData.append('file', file);
    return uploadFileToServerAction(formData);
}
