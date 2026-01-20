/**
 * 安全 API 請求封裝
 * 
 * 提供端到端加密的 API 通訊層，包含：
 * - 自動加密請求 Payload
 * - 自動解密回應資料
 * - 流量混淆 (隨機延遲 + 封包填充)
 * - 錯誤處理與重試機制
 * 
 * @module secureApi
 */

import { E2EEEncryption, type EncryptedData } from './encryption';
import { KeyVault } from './keyManagement';

/**
 * API 請求選項
 */
export interface SecureApiOptions extends Omit<RequestInit, 'body'> {
    /** 是否啟用流量混淆 (預設: true) */
    obfuscate?: boolean;
    /** 最大重試次數 (預設: 3) */
    maxRetries?: number;
    /** 重試延遲 (ms, 預設: 1000) */
    retryDelay?: number;
}

/**
 * 加密後的請求結構
 */
interface EncryptedRequest {
    payload: EncryptedData;
    _padding?: string; // 隨機填充
    _timestamp: number;
    _requestId: string;
}

/**
 * 隨機延遲 (防止流量分析)
 * 
 * @param min - 最小延遲 (ms)
 * @param max - 最大延遲 (ms)
 */
async function randomDelay(min = 50, max = 300): Promise<void> {
    const delay = Math.floor(Math.random() * (max - min + 1)) + min;
    await new Promise((resolve) => setTimeout(resolve, delay));
}

/**
 * 添加隨機填充 (防止封包大小分析)
 * 
 * @param data - 原始資料
 * @returns 包含隨機填充的資料
 */
function addRandomPadding<T>(data: T): T & { _padding: string } {
    const randomSize = Math.floor(Math.random() * 1024) + 512; // 512-1536 bytes
    const padding = Buffer.from(
        Array.from({ length: randomSize }, () => Math.floor(Math.random() * 256))
    ).toString('base64');

    return {
        ...data,
        _padding: padding,
    } as T & { _padding: string };
}

/**
 * 安全 API 請求類別
 */
export class SecureApi {
    /**
     * 發送加密的 POST 請求
     * 
     * @param endpoint - API 端點
     * @param data - 要發送的資料
     * @param options - 請求選項
     * @returns Promise<T> - 解密後的回應資料
     * 
     * @example
     * ```typescript
     * const result = await SecureApi.post<{ caseId: string }>(
     *   '/api/cases',
     *   { title: '敏感案件', clientName: '王小明' }
     * );
     * console.log(result.caseId);
     * ```
     */
    static async post<T = unknown>(
        endpoint: string,
        data: unknown,
        options: SecureApiOptions = {}
    ): Promise<T> {
        const {
            obfuscate = true,
            maxRetries = 3,
            retryDelay = 1000,
            ...fetchOptions
        } = options;

        let lastError: Error | null = null;

        for (let attempt = 0; attempt < maxRetries; attempt++) {
            try {
                // 1. 取得加密金鑰
                const encryptionKey = await KeyVault.getActiveKey();

                // 2. 加密 Payload
                const encryptedPayload = await E2EEEncryption.encrypt(data, encryptionKey);

                // 3. 建立請求結構
                let requestBody: EncryptedRequest = {
                    payload: encryptedPayload,
                    _timestamp: Date.now(),
                    _requestId: crypto.randomUUID(),
                };

                // 4. 流量混淆
                if (obfuscate) {
                    await randomDelay();
                    requestBody = addRandomPadding(requestBody);
                }

                // 5. 發送請求
                const response = await fetch(endpoint, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-Request-ID': requestBody._requestId,
                        'X-Encrypted': 'true',
                        ...fetchOptions.headers,
                    },
                    ...fetchOptions,
                    body: JSON.stringify(requestBody),
                });

                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }

                // 6. 解析回應
                const encryptedResponse = await response.json();

                // 7. 解密回應
                if (E2EEEncryption.validateEncryptedData(encryptedResponse)) {
                    return await E2EEEncryption.decrypt<T>(encryptedResponse, encryptionKey);
                } else {
                    // 回應未加密，直接返回
                    return encryptedResponse as T;
                }
            } catch (error) {
                lastError = error instanceof Error ? error : new Error(String(error));

                if (attempt < maxRetries - 1) {
                    console.warn(`請求失敗 (嘗試 ${attempt + 1}/${maxRetries}), 重試中...`, lastError.message);
                    await new Promise((resolve) => setTimeout(resolve, retryDelay * (attempt + 1)));
                }
            }
        }

        throw new Error(
            `API 請求失敗 (已重試 ${maxRetries} 次): ${lastError?.message || '未知錯誤'}`
        );
    }

    /**
     * 發送加密的 GET 請求 (參數加密)
     * 
     * @param endpoint - API 端點
     * @param params - 查詢參數
     * @param options - 請求選項
     * @returns Promise<T>
     */
    static async get<T = unknown>(
        endpoint: string,
        params?: Record<string, unknown>,
        options: SecureApiOptions = {}
    ): Promise<T> {
        const { obfuscate = true, ...fetchOptions } = options;

        // 1. 加密查詢參數
        let url = endpoint;
        if (params) {
            const encryptionKey = await KeyVault.getActiveKey();
            const encryptedParams = await E2EEEncryption.encrypt(params, encryptionKey);
            url += `?data=${encodeURIComponent(JSON.stringify(encryptedParams))}`;
        }

        // 2. 流量混淆
        if (obfuscate) {
            await randomDelay();
        }

        // 3. 發送請求
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'X-Encrypted': params ? 'true' : 'false',
                ...fetchOptions.headers,
            },
            ...fetchOptions,
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        // 4. 解析與解密回應
        const encryptedResponse = await response.json();
        const encryptionKey = await KeyVault.getActiveKey();

        if (E2EEEncryption.validateEncryptedData(encryptedResponse)) {
            return await E2EEEncryption.decrypt<T>(encryptedResponse, encryptionKey);
        } else {
            return encryptedResponse as T;
        }
    }

    /**
     * 解密 API 請求 (伺服器端使用)
     * 
     * @param request - Next.js Request 物件
     * @returns Promise<T> - 解密後的資料
     * 
     * @example
     * ```typescript
     * // app/api/cases/route.ts
     * export async function POST(req: Request) {
     *   const decrypted = await SecureApi.decryptRequest<{ title: string }>(req);
     *   console.log(decrypted.title);
     * }
     * ```
     */
    static async decryptRequest<T = unknown>(request: Request): Promise<T> {
        const isEncrypted = request.headers.get('X-Encrypted') === 'true';

        if (!isEncrypted) {
            // 未加密請求，直接解析
            return await request.json();
        }

        const body: EncryptedRequest = await request.json();
        const encryptionKey = await KeyVault.getActiveKey();

        // 解密 Payload
        return await E2EEEncryption.decrypt<T>(body.payload, encryptionKey);
    }

    /**
     * 加密 API 回應 (伺服器端使用)
     * 
     * @param data - 要回傳的資料
     * @returns Promise<Response>
     * 
     * @example
     * ```typescript
     * // app/api/cases/route.ts
     * export async function POST(req: Request) {
     *   const result = { caseId: '123', success: true };
     *   return SecureApi.encryptResponse(result);
     * }
     * ```
     */
    static async encryptResponse(data: unknown): Promise<Response> {
        const encryptionKey = await KeyVault.getActiveKey();
        const encrypted = await E2EEEncryption.encrypt(data, encryptionKey);

        return new Response(JSON.stringify(encrypted), {
            status: 200,
            headers: {
                'Content-Type': 'application/json',
                'X-Encrypted': 'true',
            },
        });
    }
}
