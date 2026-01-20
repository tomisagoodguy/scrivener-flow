/**
 * E2EE 加密核心模組
 * 
 * 提供端到端加密功能，包含：
 * - AES-256-GCM 對稱加密
 * - RSA-OAEP 非對稱金鑰交換
 * - 金鑰衍生與管理
 * - 隨機鹽值與初始向量生成
 * 
 * @module encryption
 */

import * as jose from 'jose';

export interface EncryptedData {
    ciphertext: string;
    iv: string;
    salt: string;
    keyId: string;
    algorithm: 'AES-GCM-256';
    timestamp: number;
}

export interface KeyPair {
    publicKey: string;
    privateKey: string;
    keyId: string;
}

/**
 * E2EE 加密服務類別
 */
export class E2EEEncryption {
    private static readonly ALGORITHM = 'AES-GCM';
    private static readonly KEY_LENGTH = 256;
    private static readonly IV_LENGTH = 12; // GCM 模式建議 12 bytes
    private static readonly SALT_LENGTH = 16;

    private static getCrypto(): Crypto {
        if (typeof window !== 'undefined' && window.crypto) {
            return window.crypto;
        }
        if (typeof globalThis !== 'undefined' && globalThis.crypto) {
            return globalThis.crypto as Crypto;
        }
        try {
            // eslint-disable-next-line @typescript-eslint/no-var-requires
            return require('node:crypto').webcrypto as Crypto;
        } catch {
            throw new Error('Crypto API is not available in this environment');
        }
    }

    /**
     * 生成加密用的 AES 金鑰
     * ...
     */
    private static async deriveKey(
        password: string,
        salt?: Uint8Array
    ): Promise<{ key: CryptoKey; salt: Uint8Array }> {
        const crypto = this.getCrypto();
        const actualSalt = salt || crypto.getRandomValues(new Uint8Array(this.SALT_LENGTH));
        const encoder = new TextEncoder();
        const keyMaterial = await crypto.subtle.importKey(
            'raw',
            encoder.encode(password),
            'PBKDF2',
            false,
            ['deriveBits', 'deriveKey']
        );

        const key = await crypto.subtle.deriveKey(
            {
                name: 'PBKDF2',
                salt: actualSalt as any,
                iterations: 100000,
                hash: 'SHA-256',
            },
            keyMaterial,
            { name: this.ALGORITHM, length: this.KEY_LENGTH },
            true,
            ['encrypt', 'decrypt']
        );

        return { key, salt: actualSalt };
    }

    /**
     * 加密資料
     * ...
     */
    static async encrypt(
        data: unknown,
        password: string,
        keyId: string = 'default'
    ): Promise<EncryptedData> {
        try {
            const crypto = this.getCrypto();
            // 1. 衍生加密金鑰
            const { key, salt } = await this.deriveKey(password);

            // 2. 生成隨機 IV
            const iv = crypto.getRandomValues(new Uint8Array(this.IV_LENGTH));

            // 3. 序列化資料
            const encoder = new TextEncoder();
            const plaintext = encoder.encode(JSON.stringify(data));

            // 4. 執行加密
            const ciphertext = await crypto.subtle.encrypt(
                { name: this.ALGORITHM, iv },
                key,
                plaintext
            );

            // 5. 回傳結構化資料
            return {
                ciphertext: Buffer.from(ciphertext).toString('base64'),
                iv: Buffer.from(iv).toString('base64'),
                salt: Buffer.from(salt).toString('base64'),
                keyId,
                algorithm: 'AES-GCM-256',
                timestamp: Date.now(),
            };
        } catch (error) {
            throw new Error(`加密失敗: ${error instanceof Error ? error.message : String(error)}`);
        }
    }

    /**
     * 解密資料
     * ...
     */
    static async decrypt<T = unknown>(
        encryptedData: EncryptedData,
        password: string
    ): Promise<T> {
        try {
            const crypto = this.getCrypto();
            // 1. 解碼 Base64 資料
            const ciphertext = Buffer.from(encryptedData.ciphertext, 'base64');
            const iv = Buffer.from(encryptedData.iv, 'base64');
            const salt = Buffer.from(encryptedData.salt, 'base64');

            // 2. 使用相同鹽值衍生金鑰
            const { key } = await this.deriveKey(password, new Uint8Array(salt));

            // 3. 執行解密
            const plaintext = await crypto.subtle.decrypt(
                { name: this.ALGORITHM, iv: new Uint8Array(iv) },
                key,
                new Uint8Array(ciphertext)
            );

            // 4. 反序列化資料
            const decoder = new TextDecoder();
            return JSON.parse(decoder.decode(plaintext)) as T;
        } catch (error) {
            throw new Error(`解密失敗: ${error instanceof Error ? error.message : String(error)}`);
        }
    }

    /**
     * 生成 RSA 金鑰對
     * ...
     */
    static async generateKeyPair(): Promise<KeyPair> {
        const crypto = this.getCrypto();
        const { publicKey, privateKey } = await jose.generateKeyPair('RSA-OAEP-256', {
            modulusLength: 2048,
        });

        const publicJWK = await jose.exportJWK(publicKey);
        const privateJWK = await jose.exportJWK(privateKey);

        return {
            publicKey: JSON.stringify(publicJWK),
            privateKey: JSON.stringify(privateJWK),
            keyId: crypto.randomUUID(),
        };
    }

    /**
     * 驗證加密資料完整性 (無異動)
     */
    static validateEncryptedData(encryptedData: unknown): encryptedData is EncryptedData {
        if (typeof encryptedData !== 'object' || encryptedData === null) {
            return false;
        }

        const data = encryptedData as Record<string, unknown>;
        return (
            typeof data.ciphertext === 'string' &&
            typeof data.iv === 'string' &&
            typeof data.salt === 'string' &&
            typeof data.keyId === 'string' &&
            data.algorithm === 'AES-GCM-256' &&
            typeof data.timestamp === 'number'
        );
    }

    /**
     * 計算資料摘要
     */
    static async computeHash(data: unknown): Promise<string> {
        const crypto = this.getCrypto();
        const encoder = new TextEncoder();
        const dataBuffer = encoder.encode(JSON.stringify(data));
        const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
        return Buffer.from(hashBuffer).toString('hex');
    }
}
