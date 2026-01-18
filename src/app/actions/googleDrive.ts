'use server';

import { createClient } from '@/lib/supabase/server';

interface DriveActionResponse {
    success: boolean;
    data?: any;
    error?: string;
}

/**
 * 取得當前使用者的 Google Access Token (從伺服器端取得)
 */
async function getAccessToken() {
    const supabase = await createClient();
    const { data: { session } } = await supabase.auth.getSession();

    // 檢查是否為管理員
    if (session?.user?.email !== 'tom890108159@gmail.com') {
        throw new Error('存取受限：僅限管理員執行');
    }

    return session?.provider_token || null;
}

/**
 * 在 Google Drive 搜尋或建立資料夾 (伺服器端執行)
 */
export async function getOrCreateDriveFolder(folderName: string, parentId?: string): Promise<DriveActionResponse> {
    try {
        const token = await getAccessToken();
        if (!token) return { success: false, error: '未取得 Google 授權，請重新登入' };

        // 如果是主資料夾，直接使用使用者提供的固定 ID
        if (folderName === 'ScrivenerFlow_Attachments') {
            return { success: true, data: '1pC9YvdIIVLMPD6TFje0Lvuo2RnWMUdki' };
        }

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
            : '公司資料';

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
