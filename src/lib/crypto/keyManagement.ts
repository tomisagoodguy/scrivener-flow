/**
 * 金鑰管理與輪換系統
 * 
 * 提供：
 * - 自動金鑰輪換
 * - 多版本金鑰管理
 * - 環境變數安全存取
 * - Supabase 金鑰儲存
 * 
 * @module keyManagement
 */

import { createClient } from '@supabase/supabase-js';


/**
 * 金鑰資訊
 */
export interface EncryptionKey {
    keyId: string;
    keyValue: string;
    isActive: boolean;
    createdAt: string;
    expiresAt: string | null;
}

/**
 * 金鑰管理服務
 */
export class KeyVault {
    // 移除靜態初始化，改為延遲初始化
    private static supabaseInstance: ReturnType<typeof createClient> | null = null;
    private static readonly KEY_ROTATION_DAYS = 90; // 金鑰每 90 天輪換一次

    /**
     * 取得 Supabase 實例 (僅限 Server Side)
     */
    private static getSupabase() {
        if (typeof window !== 'undefined') {
            throw new Error('Supabase Service Role Client cannot be used on the client side');
        }

        if (!this.supabaseInstance) {
            // 這裡不使用 process.env.SUPABASE_SERVICE_ROLE_KEY! 以避免 Client 端編譯時報錯
            // 雖然我們已經check window，但部分 bundler 行為可能不同
            const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
            const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

            if (!url || !key) {
                throw new Error('Missing Supabase credentials for KeyVault');
            }
            this.supabaseInstance = createClient(url, key);
        }
        return this.supabaseInstance;
    }

    /**
     * 取得當前啟用的加密金鑰
     * 
     * @returns Promise<string> - 金鑰值
     * @throws Error 若無啟用金鑰
     */
    static async getActiveKey(): Promise<string> {
        // 1. Client Side: 直接回傳 NEXT_PUBLIC 金鑰
        if (typeof window !== 'undefined') {
            const clientKey = process.env.NEXT_PUBLIC_ENCRYPTION_KEY;
            if (!clientKey) {
                throw new Error('NEXT_PUBLIC_ENCRYPTION_KEY 未設定，前端無法進行加密');
            }
            return clientKey;
        }

        // 2. Server Side: 優先使用環境變數中的金鑰 (效能最佳)
        if (process.env.ENCRYPTION_MASTER_KEY) {
            return process.env.ENCRYPTION_MASTER_KEY;
        }

        // 3. Server Side (Database)
        const supabase = this.getSupabase();
        const { data, error } = await supabase
            .from('encryption_keys')
            .select('key_value')
            .eq('is_active', true)
            .order('created_at', { ascending: false })
            .limit(1)
            .single<{ key_value: string }>();

        if (error || !data) {
            // Fallback
            if (process.env.NEXT_PUBLIC_ENCRYPTION_KEY) {
                return process.env.NEXT_PUBLIC_ENCRYPTION_KEY;
            }
            throw new Error('無法取得加密金鑰，請確認環境變數或資料庫設定');
        }

        return data.key_value;
    }

    /**
     * 根據 keyId 取得特定金鑰 (用於解密舊資料)
     * 
     * @param keyId - 金鑰識別碼
     * @returns Promise<string | null>
     */
    static async getKeyById(keyId: string): Promise<string | null> {
        if (typeof window !== 'undefined') return null; // Client side 不支援存取歷史金鑰

        const supabase = this.getSupabase();
        const { data, error } = await supabase
            .from('encryption_keys')
            .select('key_value')
            .eq('key_id', keyId)
            .single<{ key_value: string }>();

        if (error || !data) {
            return null;
        }

        return data.key_value;
    }

    /**
     * 生成新的加密金鑰
     * 
     * @returns string - 256-bit hex 金鑰
     */
    static generateKey(): string {
        let cryptoApi: Crypto;
        if (typeof window !== 'undefined' && window.crypto) {
            cryptoApi = window.crypto;
        } else if (typeof globalThis !== 'undefined' && globalThis.crypto) {
            cryptoApi = globalThis.crypto as Crypto;
        } else {
            // eslint-disable-next-line @typescript-eslint/no-var-requires
            cryptoApi = require('node:crypto').webcrypto as Crypto;
        }

        const keyBytes = cryptoApi.getRandomValues(new Uint8Array(32)); // 256 bits
        return Buffer.from(keyBytes).toString('hex');
    }

    /**
     * 金鑰輪換 (將當前金鑰標記為過期，並生成新金鑰)
     * 
     * @returns Promise<{ newKeyId: string; newKey: string }>
     * 
     * @example
     * ```typescript
     * // 在 Cron Job 或管理介面中執行
     * const { newKeyId } = await KeyVault.rotateKey();
     * console.log(`新金鑰已啟用: ${newKeyId}`);
     * ```
     */
    static async rotateKey(): Promise<{ newKeyId: string; newKey: string }> {
        let cryptoApi: Crypto;
        if (typeof window !== 'undefined' && window.crypto) {
            cryptoApi = window.crypto;
        } else if (typeof globalThis !== 'undefined' && globalThis.crypto) {
            cryptoApi = globalThis.crypto as Crypto;
        } else {
            // eslint-disable-next-line @typescript-eslint/no-var-requires
            cryptoApi = require('node:crypto').webcrypto as Crypto;
        }

        const supabase = this.getSupabase();
        const newKeyId = cryptoApi.randomUUID();
        const newKey = this.generateKey();
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + this.KEY_ROTATION_DAYS);

        // 1. 停用所有現有金鑰
        await (supabase.from('encryption_keys') as any)
            .update({ is_active: false })
            .eq('is_active', true);

        // 2. 插入新金鑰
        const { error } = await (supabase.from('encryption_keys') as any)
            .insert({
                key_id: newKeyId,
                key_value: newKey,
                is_active: true,
                created_at: new Date().toISOString(),
                expires_at: expiresAt.toISOString(),
            });

        if (error) {
            throw new Error(`金鑰輪換失敗: ${error.message}`);
        }

        return { newKeyId, newKey };
    }

    /**
     * 清理過期金鑰 (保留最近 3 個版本)
     * 
     * @returns Promise<number> - 刪除的金鑰數量
     */
    static async cleanupExpiredKeys(): Promise<number> {
        const supabase = this.getSupabase();
        const { data: recentKeys } = await (supabase.from('encryption_keys') as any)
            .select('key_id, created_at')
            .order('created_at', { ascending: false })
            .limit(3);

        if (!recentKeys || recentKeys.length === 0) {
            return 0;
        }

        const recentKeyIds = recentKeys.map((k: any) => k.key_id);

        const { count } = await (supabase.from('encryption_keys') as any)
            .delete({ count: 'exact' })
            .not('key_id', 'in', `(${recentKeyIds.join(',')})`);

        return count || 0;
    }

    /**
     * 初始化金鑰系統 (首次部署時呼叫)
     * 
     * @returns Promise<void>
     */
    static async initialize(): Promise<void> {
        const supabase = this.getSupabase();
        const { data: existingKeys } = await (supabase.from('encryption_keys') as any)
            .select('key_id')
            .limit(1);

        if (existingKeys && existingKeys.length > 0) {
            console.log('金鑰系統已初始化');
            return;
        }

        console.log('初始化金鑰系統...');
        await this.rotateKey();
        console.log('金鑰系統初始化完成');
    }

    /**
     * 檢查金鑰是否即將過期 (距離過期少於 7 天)
     * 
     * @returns Promise<boolean>
     */
    static async shouldRotateKey(): Promise<boolean> {
        const supabase = this.getSupabase();
        const { data } = await (supabase.from('encryption_keys') as any)
            .select('expires_at')
            .eq('is_active', true)
            .single();

        if (!data || !data.expires_at) {
            return true; // 無過期時間，建議輪換
        }

        const expiresAt = new Date(data.expires_at);
        const now = new Date();
        const daysUntilExpiry = (expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);

        return daysUntilExpiry <= 7;
    }
}
