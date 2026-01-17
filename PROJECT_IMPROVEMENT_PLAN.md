# 🚀 專案改進計畫 - My Case Tracker

> **目標**: 提升程式碼品質、開發效率、系統穩定性與自動化程度

---

## ✅ 已完成項目

- [x] **ESLint** - 已安裝 (eslint.config.mjs)
- [x] **Prettier** - 已安裝 (.prettierrc)
- [x] **TypeScript** - 已配置
- [x] **Supabase** - 資料庫已設置
- [x] **Vercel 部署** - CI/CD 基礎已建立

---

## 📋 待實施改進項目

### 🎯 優先級 1: 程式碼品質與除錯 (立即實施)

#### 1.1 Console.log 除錯工具

**目的**: 理解程式流程、追蹤資料變化

```typescript
// 建立統一的 logger 工具
// src/lib/logger.ts
export const logger = {
  debug: (message: string, data?: any) => {
    if (process.env.NODE_ENV === 'development') {
      console.log(`[DEBUG] ${message}`, data || '');
    }
  },
  info: (message: string, data?: any) => {
    console.log(`[INFO] ${message}`, data || '');
  },
  error: (message: string, error?: any) => {
    console.error(`[ERROR] ${message}`, error || '');
  },
  trace: (functionName: string, params?: any) => {
    if (process.env.NODE_ENV === 'development') {
      console.trace(`[TRACE] ${functionName}`, params || '');
    }
  }
};
```

**實施步驟**:

1. 建立 `src/lib/logger.ts`
2. 在關鍵函數中添加 logger
3. 設定環境變數控制 log 層級

---

#### 1.2 JSON Schema 驗證

**目的**: 確保資料正確性、API 回應驗證

**推薦工具**: Zod (已安裝 v4.3.5)

```typescript
// src/schemas/case.schema.ts
import { z } from 'zod';

export const CaseSchema = z.object({
  id: z.string().uuid(),
  case_number: z.string().min(1),
  buyer_name: z.string().min(1),
  seller_name: z.string().min(1),
  status: z.enum(['Processing', 'Closed', 'Cancelled']),
  created_at: z.string().datetime(),
  // ... 其他欄位
});

export type Case = z.infer<typeof CaseSchema>;

// 使用範例
const validateCase = (data: unknown) => {
  try {
    return CaseSchema.parse(data);
  } catch (error) {
    logger.error('Case validation failed', error);
    throw error;
  }
};
```

**實施步驟**:

1. 為所有資料模型建立 Zod schema
2. 在 API route 中驗證輸入
3. 在資料庫查詢後驗證輸出

---

### 🎯 優先級 2: 測試框架 (本週實施)

#### 2.1 Jest 單元測試

**安裝**:

```bash
yarn add -D jest @testing-library/react @testing-library/jest-dom jest-environment-jsdom
```

**配置**: `jest.config.js`

```javascript
const nextJest = require('next/jest');

const createJestConfig = nextJest({
  dir: './',
});

const customJestConfig = {
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  testEnvironment: 'jest-environment-jsdom',
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  collectCoverageFrom: [
    'src/**/*.{js,jsx,ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/*.stories.{js,jsx,ts,tsx}',
  ],
};

module.exports = createJestConfig(customJestConfig);
```

**測試範例**:

```typescript
// src/lib/__tests__/logger.test.ts
import { logger } from '../logger';

describe('Logger', () => {
  it('should log debug messages in development', () => {
    const consoleSpy = jest.spyOn(console, 'log');
    logger.debug('Test message', { data: 'test' });
    expect(consoleSpy).toHaveBeenCalled();
  });
});
```

---

#### 2.2 Playwright E2E 測試

**安裝**:

```bash
yarn add -D @playwright/test
npx playwright install
```

**配置**: `playwright.config.ts`

```typescript
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  use: {
    baseURL: 'http://localhost:3000',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  webServer: {
    command: 'yarn dev',
    port: 3000,
    reuseExistingServer: !process.env.CI,
  },
});
```

**測試範例**:

```typescript
// e2e/cases.spec.ts
import { test, expect } from '@playwright/test';

test('should export Excel file', async ({ page }) => {
  await page.goto('/cases');
  
  const downloadPromise = page.waitForEvent('download');
  await page.click('text=📊 匯出 Excel');
  const download = await downloadPromise;
  
  expect(download.suggestedFilename()).toMatch(/案件清單_\d+_\d+\.xlsx/);
});
```

---

### 🎯 優先級 3: CI/CD 自動化 (本週實施)

#### 3.1 GitHub Actions 工作流程

**檔案**: `.github/workflows/ci.yml`

```yaml
name: CI/CD Pipeline

on:
  push:
    branches: [master, develop]
  pull_request:
    branches: [master]

jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'yarn'
      
      - name: Install dependencies
        run: yarn install --frozen-lockfile
      
      - name: Run ESLint
        run: yarn lint
      
      - name: Run Prettier check
        run: yarn prettier --check .

  test:
    runs-on: ubuntu-latest
    needs: lint
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'yarn'
      
      - name: Install dependencies
        run: yarn install --frozen-lockfile
      
      - name: Run unit tests
        run: yarn test
      
      - name: Upload coverage
        uses: codecov/codecov-action@v3

  e2e:
    runs-on: ubuntu-latest
    needs: test
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'yarn'
      
      - name: Install dependencies
        run: yarn install --frozen-lockfile
      
      - name: Install Playwright
        run: npx playwright install --with-deps
      
      - name: Run E2E tests
        run: yarn test:e2e
      
      - name: Upload test results
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: playwright-report
          path: playwright-report/

  build:
    runs-on: ubuntu-latest
    needs: [lint, test]
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'yarn'
      
      - name: Install dependencies
        run: yarn install --frozen-lockfile
      
      - name: Build application
        run: yarn build
      
      - name: Check build size
        run: du -sh .next
```

**package.json scripts 更新**:

```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "eslint . --ext .ts,.tsx",
    "lint:fix": "eslint . --ext .ts,.tsx --fix",
    "format": "prettier --write .",
    "format:check": "prettier --check .",
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage",
    "test:e2e": "playwright test",
    "test:e2e:ui": "playwright test --ui"
  }
}
```

---

### 🎯 優先級 4: 效能優化 (下週實施)

#### 4.1 Redis 快取層

**目的**: 減少資料庫查詢、提升回應速度

**推薦方案**: Upstash Redis (Serverless, 與 Vercel 整合良好)

```typescript
// src/lib/redis.ts
import { Redis } from '@upstash/redis';

export const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

// 快取輔助函數
export async function getCachedData<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttl: number = 3600 // 1 hour
): Promise<T> {
  // 嘗試從快取取得
  const cached = await redis.get<T>(key);
  if (cached) {
    logger.debug(`Cache hit: ${key}`);
    return cached;
  }

  // 快取未命中,執行查詢
  logger.debug(`Cache miss: ${key}`);
  const data = await fetcher();
  
  // 儲存到快取
  await redis.setex(key, ttl, JSON.stringify(data));
  
  return data;
}

// 使用範例
export async function getCases(userId: string) {
  return getCachedData(
    `cases:${userId}`,
    async () => {
      const { data } = await supabase
        .from('cases')
        .select('*')
        .eq('user_id', userId);
      return data;
    },
    300 // 5 minutes
  );
}
```

**實施步驟**:

1. 註冊 Upstash 帳號
2. 安裝 `@upstash/redis`
3. 在關鍵查詢處添加快取
4. 實作快取失效策略

---

### 🎯 優先級 5: 爬蟲與自動化 (按需實施)

#### 5.1 Puppeteer 爬蟲

**使用場景**:

- 自動抓取地政資訊
- 自動填寫線上表單
- 生成 PDF 報表

```typescript
// src/lib/scraper.ts
import puppeteer from 'puppeteer';

export async function scrapeLandInfo(address: string) {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  
  try {
    await page.goto('https://example-land-registry.gov.tw');
    await page.type('#address', address);
    await page.click('#search');
    await page.waitForSelector('.result');
    
    const data = await page.evaluate(() => {
      return {
        owner: document.querySelector('.owner')?.textContent,
        area: document.querySelector('.area')?.textContent,
        // ... 其他資訊
      };
    });
    
    return data;
  } finally {
    await browser.close();
  }
}
```

---

#### 5.2 自動化工具整合建議

##### 🔗 **n8n** (推薦 ⭐⭐⭐⭐⭐)

**優點**:

- 開源、可自架
- 視覺化工作流程
- 支援 Webhook、定時任務
- 與 Supabase 整合良好

**使用場景**:

1. **自動化案件提醒**
   - 監聽 Supabase 新案件
   - 發送 Email/Slack 通知
   - 更新 Google Calendar

2. **定期報表生成**
   - 每週自動生成案件統計
   - 匯出 Excel 並寄送
   - 備份資料到 Google Drive

3. **資料同步**
   - Supabase ↔ Google Sheets
   - 自動備份到多個位置

**設定範例**:

```yaml
# n8n workflow: 新案件通知
nodes:
  - type: Supabase Trigger
    table: cases
    event: INSERT
  
  - type: Email
    to: "{{ $env.ADMIN_EMAIL }}"
    subject: "新案件: {{ $json.case_number }}"
    body: "買方: {{ $json.buyer_name }}"
  
  - type: Slack
    channel: "#案件通知"
    message: "新案件建立: {{ $json.case_number }}"
```

---

##### 🔗 **Zapier** (推薦 ⭐⭐⭐)

**優點**:

- 無需架設
- 整合服務最多
- 設定簡單

**缺點**:

- 付費方案較貴
- 無法自訂複雜邏輯

**使用場景**:

- Gmail → Supabase (自動建立案件)
- Supabase → Google Sheets (同步資料)
- 定時任務 → Webhook (觸發報表)

---

##### 🔗 **Make (Integromat)** (推薦 ⭐⭐⭐⭐)

**優點**:

- 視覺化設計
- 價格合理
- 支援複雜邏輯

**使用場景**:

- 多步驟工作流程
- 條件判斷與分支
- 資料轉換與處理

---

### 📊 整合建議優先順序

| 工具 | 優先級 | 成本 | 複雜度 | 推薦場景 |
|------|--------|------|--------|----------|
| **n8n** | ⭐⭐⭐⭐⭐ | 免費(自架) | 中 | 完全控制、複雜工作流程 |
| **Make** | ⭐⭐⭐⭐ | $$ | 低 | 快速實作、視覺化設計 |
| **Zapier** | ⭐⭐⭐ | $$$ | 低 | 簡單整合、快速上手 |

**建議**: 先用 **n8n** 自架版本,免費且功能強大!

---

## 🗓️ 實施時程表

### Week 1 (本週)

- [ ] 建立 logger 工具
- [ ] 設定 Zod schema
- [ ] 安裝 Jest
- [ ] 撰寫 5 個單元測試
- [ ] 設定 GitHub Actions

### Week 2 (下週)

- [ ] 安裝 Playwright
- [ ] 撰寫 3 個 E2E 測試
- [ ] 整合 Upstash Redis
- [ ] 優化關鍵查詢

### Week 3 (第三週)

- [ ] 設定 n8n
- [ ] 建立自動化工作流程
- [ ] 實作 Puppeteer 爬蟲
- [ ] 整合 Google Sheets

---

## 🎯 立即可執行的命令

```bash
# 1. 安裝測試工具
yarn add -D jest @testing-library/react @testing-library/jest-dom jest-environment-jsdom @playwright/test

# 2. 安裝 Redis
yarn add @upstash/redis

# 3. 安裝 Puppeteer
yarn add puppeteer

# 4. 更新 package.json scripts
# (手動編輯 package.json)

# 5. 初始化 Playwright
npx playwright install

# 6. 建立測試資料夾
mkdir -p src/lib/__tests__ e2e .github/workflows
```

---

## 📝 下一步行動

請告訴我您想先實施哪一項:

1. **Logger 與 Zod 驗證** (最快,立即見效)
2. **Jest 單元測試** (提升程式碼品質)
3. **GitHub Actions CI/CD** (自動化部署)
4. **Redis 快取** (效能優化)
5. **n8n 自動化** (工作流程自動化)

我會根據您的選擇提供詳細的實作步驟! 🚀
