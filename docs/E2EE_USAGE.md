# E2EE 端到端加密系統使用指南

## 📋 概述

此系統提供完整的端到端加密 (End-to-End Encryption) 功能，確保 API 傳輸資料的隱蔽性與安全性。

## 🔐 核心特性

### 加密技術

- **AES-256-GCM** 對稱加密
- **PBKDF2** 金鑰衍生 (100,000 迭代)
- **RSA-OAEP-256** 非對稱金鑰交換 (可選)
- **SHA-256** 資料完整性驗證

### 安全增強

- ✅ 每次加密使用隨機 IV 與 Salt
- ✅ 流量混淆 (隨機延遲 50-300ms)
- ✅ 封包填充 (512-1536 bytes 隨機資料)
- ✅ 自動重試機制 (最多 3 次)
- ✅ 金鑰自動輪換 (每 90 天)
- ✅ 多版本金鑰管理 (保留最近 3 個版本)

---

## 🚀 快速開始

### 1. 環境設定

在 `.env.local` 中新增加密主金鑰：

```bash
# 生成加密金鑰
openssl rand -hex 32

# 將結果新增到 .env.local
ENCRYPTION_MASTER_KEY=<生成的金鑰>
```

### 2. 資料庫初始化

手動在 Supabase SQL Editor 中執行以下 SQL：

```sql
-- 複製 supabase/migrations/create_encryption_keys.sql 的內容並執行
```

或使用 Supabase CLI：

```bash
npx supabase db push
```

### 3. 初始化金鑰系統

在 Next.js 啟動時執行 (僅需一次)：

```typescript
// src/app/api/init/route.ts
import { KeyVault } from '@/lib/crypto/keyManagement';

export async function POST() {
  await KeyVault.initialize();
  return Response.json({ success: true });
}
```

---

## 💻 使用方式

### 客戶端發送加密請求

```typescript
import { SecureApi } from '@/lib/crypto/secureApi';

// POST 請求
const result = await SecureApi.post<{ caseId: string }>(
  '/api/cases/secure',
  {
    title: '敏感案件',
    clientName: '王小明',
    description: '機密內容...',
  }
);

// GET 請求
const cases = await SecureApi.get<{ cases: CaseData[] }>(
  '/api/cases/secure',
  { userId: 'user-id' }
);
```

### 伺服器端處理加密請求

```typescript
// src/app/api/cases/secure/route.ts
import { SecureApi } from '@/lib/crypto/secureApi';

export async function POST(request: Request) {
  // 解密請求
  const data = await SecureApi.decryptRequest<{ title: string }>(request);
  
  // 處理業務邏輯
  const result = { caseId: '123', success: true };
  
  // 加密回應
  return await SecureApi.encryptResponse(result);
}
```

### 低階 API (直接使用加密模組)

```typescript
import { E2EEEncryption } from '@/lib/crypto/encryption';
import { KeyVault } from '@/lib/crypto/keyManagement';

// 加密資料
const key = await KeyVault.getActiveKey();
const encrypted = await E2EEEncryption.encrypt(
  { sensitive: 'data' },
  key
);

// 解密資料
const decrypted = await E2EEEncryption.decrypt<{ sensitive: string }>(
  encrypted,
  key
);
```

---

## 🔧 進階功能

### 金鑰輪換

```typescript
import { KeyVault } from '@/lib/crypto/keyManagement';

// 檢查是否需要輪換
const shouldRotate = await KeyVault.shouldRotateKey();

if (shouldRotate) {
  // 執行金鑰輪換
  const { newKeyId } = await KeyVault.rotateKey();
  console.log(`新金鑰已啟用: ${newKeyId}`);
}
```

### 定期清理過期金鑰

```typescript
// 建立 Cron Job (例如每週執行)
import { KeyVault } from '@/lib/crypto/keyManagement';

export async function GET() {
  const deletedCount = await KeyVault.cleanupExpiredKeys();
  return Response.json({ deletedCount });
}
```

### 自訂加密選項

```typescript
import { SecureApi } from '@/lib/crypto/secureApi';

// 停用流量混淆 (提升效能)
const result = await SecureApi.post('/api/endpoint', data, {
  obfuscate: false,
});

// 增加重試次數
const result = await SecureApi.post('/api/endpoint', data, {
  maxRetries: 5,
  retryDelay: 2000, // 2 秒
});
```

---

## 🧪 測試

### 存取測試頁面

開發伺服器啟動後，前往：

```
http://localhost:3000/test-e2ee
```

### 手動測試加密

```typescript
import { E2EEEncryption } from '@/lib/crypto/encryption';

const testData = { message: 'Hello, E2EE!' };
const key = 'test-key-256-bits-long-hexadecimal';

const encrypted = await E2EEEncryption.encrypt(testData, key);
console.log('加密結果:', encrypted);

const decrypted = await E2EEEncryption.decrypt(encrypted, key);
console.log('解密結果:', decrypted); // { message: 'Hello, E2EE!' }
```

---

## 📊 性能考量

### 加密開銷

| 操作 | 平均耗時 | 備註 |
|------|---------|------|
| 加密 (1KB 資料) | ~5-10ms | 包含金鑰衍生 |
| 解密 (1KB 資料) | ~5-10ms | 包含金鑰衍生 |
| 流量混淆 | +50-300ms | 隨機延遲 |
| 封包填充 | +1-3ms | 資料大小 +512-1536 bytes |

### 優化建議

1. **快取加密金鑰**：避免每次請求都從資料庫/環境變數讀取
2. **停用流量混淆**：內部 API 可考慮停用以提升效能
3. **批次處理**：合併多個小請求為單一加密請求

---

## 🛡️ 安全最佳實踐

### 環境變數管理

```bash
# ✅ 正確 - 使用環境變數
ENCRYPTION_MASTER_KEY=<隨機生成的金鑰>

# ❌ 錯誤 - 不要硬編碼在程式碼中
const key = 'hardcoded-key-123';
```

### 金鑰輪換

- 建議每 90 天輪換一次金鑰
- 保留最近 3 個版本的金鑰以解密舊資料
- 使用 Cron Job 自動化金鑰輪換

### 傳輸安全

- 必須使用 HTTPS/TLS 1.3
- 啟用 Cloudflare Proxy 隱藏源 IP
- 設定 HSTS、CSP 等安全標頭

---

## 🔍 故障排除

### 問題: 解密失敗

```
錯誤: 解密失敗: Unsupported state or unable to authenticate data
```

**原因**: 金鑰不匹配或資料損壞

**解決方式**:

1. 確認客戶端與伺服器端使用相同的 `ENCRYPTION_MASTER_KEY`
2. 檢查資料庫中是否有對應的 `key_id`
3. 驗證加密資料格式是否正確

### 問題: 環境變數未載入

```
錯誤: 無法取得加密金鑰，請確認環境變數或資料庫設定
```

**解決方式**:

1. 確認 `.env.local` 檔案存在且包含 `ENCRYPTION_MASTER_KEY`
2. 重啟開發伺服器
3. 檢查 Vercel 環境變數是否已設定 (生產環境)

---

## 📚 API 參考

### `E2EEEncryption`

- `encrypt(data, password, keyId?)` - 加密資料
- `decrypt<T>(encryptedData, password)` - 解密資料
- `generateKeyPair()` - 生成 RSA 金鑰對
- `validateEncryptedData(data)` - 驗證加密資料格式
- `computeHash(data)` - 計算 SHA-256 摘要

### `KeyVault`

- `getActiveKey()` - 取得當前啟用金鑰
- `getKeyById(keyId)` - 取得指定金鑰
- `rotateKey()` - 金鑰輪換
- `cleanupExpiredKeys()` - 清理過期金鑰
- `initialize()` - 初始化金鑰系統

### `SecureApi`

- `post<T>(endpoint, data, options?)` - 加密 POST 請求
- `get<T>(endpoint, params?, options?)` - 加密 GET 請求
- `decryptRequest<T>(request)` - 解密請求 (伺服器端)
- `encryptResponse(data)` - 加密回應 (伺服器端)

---

## 🚨 注意事項

⚠️ **金鑰遺失將無法解密資料**

- 務必備份 `ENCRYPTION_MASTER_KEY`
- 建議使用金鑰管理服務 (如 AWS KMS、Google Secret Manager)

⚠️ **效能影響**

- 加密/解密會增加 API 回應時間 (約 10-300ms)
- 大量請求時考慮使用快取策略

⚠️ **相容性**

- 需要 Node.js 18+ (Web Crypto API)
- 瀏覽器需支援 `crypto.subtle`

---

## 📖 延伸閱讀

- [OWASP 加密最佳實踐](https://cheatsheetseries.owasp.org/cheatsheets/Cryptographic_Storage_Cheat_Sheet.html)
- [NIST 金鑰管理指引](https://csrc.nist.gov/publications/detail/sp/800-57-part-1/rev-5/final)
- [Web Crypto API 規範](https://www.w3.org/TR/WebCryptoAPI/)
