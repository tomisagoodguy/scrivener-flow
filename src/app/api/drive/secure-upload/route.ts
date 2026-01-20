
import { NextRequest } from 'next/server';
import { SecureApi } from '@/lib/crypto/secureApi';
import { getAccessToken, getOrCreateDriveFolder, getDriveFileDetails } from '@/app/actions/googleDrive';

// 定義加密的請求結構
interface SecureUploadRequest {
    fileName: string;
    fileType: string;
    fileContentBase64: string;
    caseId?: string;
    caseNumber?: string;
}

export const maxDuration = 60; // 延長執行時間限制 (如果部署在 Vercel)

export async function POST(request: NextRequest) {
    try {
        // 1. 解密 E2EE 請求
        // 這一步會將 Client 傳來的亂碼解密回 JSON 物件
        const payload = await SecureApi.decryptRequest<SecureUploadRequest>(request);
        const { fileName, fileType, fileContentBase64, caseId, caseNumber } = payload;

        if (!fileName || !fileContentBase64) {
            return await SecureApi.encryptResponse({ success: false, error: 'Missing file data' });
        }

        // 2. 驗證 Google 權限
        const token = await getAccessToken();
        if (!token) {
            return await SecureApi.encryptResponse({ success: false, error: '未取得授權，請重新登入 Google' });
        }

        // 3. 準備資料夾結構
        const parentFolderName = 'ScrivenerFlow_Attachments';
        const targetFolderName = (caseId && caseNumber)
            ? `${caseNumber}_${caseId}`
            : '公司資料';

        // 取得/建立父資料夾
        const parentRes = await getOrCreateDriveFolder(parentFolderName);
        if (!parentRes.success) return await SecureApi.encryptResponse(parentRes);
        const parentId = parentRes.data;

        // 取得/建立目標資料夾
        const targetRes = await getOrCreateDriveFolder(targetFolderName, parentId);
        if (!targetRes.success) return await SecureApi.encryptResponse(targetRes);
        const targetFolderId = targetRes.data;

        // 4. 還原檔案並上傳
        // 將 Base64 還原為 Buffer/Blob
        const buffer = Buffer.from(fileContentBase64, 'base64');
        const blob = new Blob([buffer], { type: fileType });

        const metadata = {
            name: fileName,
            parents: [targetFolderId],
        };

        const form = new FormData();
        form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
        form.append('file', blob);

        // 呼叫 Google Drive API (Server -> Google via HTTPS)
        const uploadRes = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
            },
            body: form,
        });

        if (!uploadRes.ok) {
            const err = await uploadRes.json();
            return await SecureApi.encryptResponse({
                success: false,
                error: err.error?.message || 'Google Drive 上傳失敗'
            });
        }

        const uploadData = await uploadRes.json();

        // 5. 取得詳細資訊並加密回傳
        const details = await getDriveFileDetails(uploadData.id);
        return await SecureApi.encryptResponse(details);

    } catch (error) {
        console.error('Secure Upload Error:', error);
        return await SecureApi.encryptResponse({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
}
