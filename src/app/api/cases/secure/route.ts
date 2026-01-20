/**
 * 範例：加密案件建立 API
 * 
 * 示範如何使用 E2EE 加密處理敏感案件資料
 */

import { NextRequest } from 'next/server';
import { SecureApi } from '@/lib/crypto/secureApi';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface CreateCaseRequest {
    title: string;
    clientName: string;
    description?: string;
    userId: string;
}

interface CreateCaseResponse {
    success: boolean;
    caseId: string;
    message: string;
}

/**
 * POST /api/cases/secure
 * 
 * 接收加密的案件資料，解密後儲存到資料庫
 * 
 * @example
 * ```typescript
 * // 客戶端使用
 * import { SecureApi } from '@/lib/crypto/secureApi';
 * 
 * const result = await SecureApi.post<CreateCaseResponse>(
 *   '/api/cases/secure',
 *   {
 *     title: '高敏感案件',
 *     clientName: '王小明',
 *     description: '機密內容...',
 *     userId: 'xxx'
 *   }
 * );
 * console.log(result.caseId);
 * ```
 */
export async function POST(request: NextRequest) {
    try {
        // 1. 解密請求資料
        const decryptedData = await SecureApi.decryptRequest<CreateCaseRequest>(request);

        // 2. 驗證必填欄位
        if (!decryptedData.title || !decryptedData.clientName || !decryptedData.userId) {
            return new Response(
                JSON.stringify({ error: '缺少必填欄位' }),
                { status: 400 }
            );
        }

        // 3. 儲存到資料庫
        const { data: newCase, error } = await supabase
            .from('cases')
            .insert({
                title: decryptedData.title,
                client_name: decryptedData.clientName,
                description: decryptedData.description || null,
                user_id: decryptedData.userId,
                created_at: new Date().toISOString(),
            })
            .select('id')
            .single();

        if (error || !newCase) {
            throw new Error(`資料庫錯誤: ${error?.message || '未知錯誤'}`);
        }

        // 4. 加密回應
        const responseData: CreateCaseResponse = {
            success: true,
            caseId: newCase.id,
            message: '案件建立成功',
        };

        return await SecureApi.encryptResponse(responseData);
    } catch (error) {
        console.error('案件建立失敗:', error);

        // 錯誤回應也加密
        return await SecureApi.encryptResponse({
            success: false,
            error: error instanceof Error ? error.message : '未知錯誤',
        });
    }
}

/**
 * GET /api/cases/secure?data=<encrypted>
 * 
 * 查詢加密的案件列表
 */
export async function GET(request: NextRequest) {
    try {
        // 解析加密的查詢參數
        const url = new URL(request.url);
        const encryptedParams = url.searchParams.get('data');

        if (!encryptedParams) {
            return new Response(
                JSON.stringify({ error: '缺少查詢參數' }),
                { status: 400 }
            );
        }

        const { E2EEEncryption } = await import('@/lib/crypto/encryption');
        const { KeyVault } = await import('@/lib/crypto/keyManagement');

        const encryptionKey = await KeyVault.getActiveKey();
        const params = await E2EEEncryption.decrypt<{ userId: string }>(
            JSON.parse(decodeURIComponent(encryptedParams)),
            encryptionKey
        );

        // 查詢資料庫
        const { data: cases, error } = await supabase
            .from('cases')
            .select('*')
            .eq('user_id', params.userId)
            .order('created_at', { ascending: false });

        if (error) {
            throw new Error(`資料庫錯誤: ${error.message}`);
        }

        // 加密回應
        return await SecureApi.encryptResponse({ cases: cases || [] });
    } catch (error) {
        console.error('查詢失敗:', error);
        return await SecureApi.encryptResponse({
            error: error instanceof Error ? error.message : '未知錯誤',
        });
    }
}
