# 🎯 智能場景建議系統 (Proactive Suggestions)

> **整合到 .agent/rules.md** - 根據專案狀態與使用者行為,主動提供最佳實踐建議與改進方案。

---

## 📊 場景偵測與建議觸發器

### 1️⃣ **新專案初始化場景**

**觸發條件**:

- 檢測到新建立的 Next.js 專案
- `package.json` 中缺少測試工具
- 沒有 CI/CD 配置

**主動建議**:
> 🚀 我注意到這是一個新專案,建議立即設定:
>
> 1. 測試框架 (Jest + Playwright) - 30分鐘
> 2. 程式碼品質工具 (ESLint + Prettier) - 15分鐘  
> 3. GitHub Actions CI/CD - 1小時
>
> 需要我協助設定嗎?

---

### 2️⃣ **效能優化場景**

**觸發條件**:

- 檢測到大量資料庫查詢
- 沒有快取機制
- API 回應時間可能較慢

**主動建議**:
> ⚡ 效能改進機會:
>
> 1. Redis 快取層 (Upstash) - 減少 80% 查詢
> 2. 資料庫索引優化
> 3. React.memo() + SWR 前端快取
>
> 需要詳細實作計畫嗎?

---

### 3️⃣ **資料驗證場景**

**觸發條件**:

- API route 沒有輸入驗證
- 使用 `as Type` 進行 type casting
- 缺少 schema 定義

**主動建議**:
> 🛡️ 資料安全建議:
>
> 1. Zod Schema 驗證 - Runtime 型別檢查
> 2. 統一錯誤處理格式
> 3. 輸入消毒 (Sanitization)
>
> 需要我建立 schema 定義嗎?

---

### 4️⃣ **測試覆蓋場景**

**觸發條件**:

- 新增重要功能但沒有測試
- 修改關鍵業務邏輯
- 測試覆蓋率低於 60%

**主動建議**:
> 🧪 剛才的變更涉及關鍵邏輯,建議添加測試:
>
> - 單元測試 (30分鐘)
> - 整合測試 (1小時)
> - E2E 測試 (1小時)
>
> 需要測試模板嗎?

---

### 5️⃣ **自動化工作流場景**

**觸發條件**:

- 檢測到重複性手動任務
- 有定期執行的操作
- 資料需要在多個系統間同步

**主動建議**:
> 🤖 自動化機會分析:
>
> **n8n 工作流程** (推薦 ⭐⭐⭐⭐⭐)
>
> - 案件提醒系統 (Supabase → Email/Slack)
> - 資料同步 (Supabase ↔ Google Sheets)
> - 報表自動化 (每週自動生成 Excel)
>
> **Puppeteer 爬蟲**
>
> - 自動抓取地政資訊
> - 自動填寫線上表單
>
> 需要 n8n 設定教學嗎?

---

### 6️⃣ **程式碼品質場景**

**觸發條件**:

- 函數超過 100 行
- 重複的程式碼片段
- 複雜的巢狀邏輯

**主動建議**:
> ♻️ 重構建議:
>
> 1. 函數拆分 (單一職責原則)
> 2. 提取重複邏輯為 utility
> 3. 改善型別安全 (移除 `as any`)
>
> 需要我協助重構嗎?

---

### 7️⃣ **部署與 DevOps 場景**

**觸發條件**:

- 準備部署到生產環境
- 缺少環境變數管理
- 沒有監控與日誌系統

**主動建議**:
> 🚀 部署檢查清單:
>
> - [ ] 環境變數已設定
> - [ ] 錯誤監控 (Sentry)
> - [ ] 效能監控 (Vercel Analytics)
> - [ ] 備份策略
>
> 需要完整的部署檢查嗎?

---

### 8️⃣ **安全性場景**

**觸發條件**:

- 處理敏感資料
- 使用者認證相關
- API 沒有 rate limiting

**主動建議**:
> 🔒 安全性檢查:
>
> 1. 輸入驗證 (防止 SQL Injection/XSS)
> 2. Row Level Security (RLS) 檢查
> 3. Rate Limiting
> 4. 敏感資料保護
>
> 需要完整的安全審計嗎?

---

### 9️⃣ **UI/UX 改進場景**

**觸發條件**:

- 建立新的 UI 元件
- 使用者回報 UX 問題
- 缺少載入狀態或錯誤處理

**主動建議**:
> ✨ UI/UX 改進建議:
>
> 1. 載入狀態 (Skeleton Loading)
> 2. 錯誤處理 (友善訊息 + 重試機制)
> 3. 微互動 (Hover 效果 + 動畫)
> 4. 無障礙設計 (ARIA + 鍵盤導航)
>
> 需要詳細的 UI 改進計畫嗎?

---

## 📋 建議優先級矩陣

| 場景 | 優先級 | 時間成本 | 長期效益 | 建議時機 |
|------|--------|----------|----------|----------|
| 新專案初始化 | 🔴 高 | 2-3小時 | ⭐⭐⭐⭐⭐ | 專案開始時 |
| 測試覆蓋 | 🔴 高 | 1-2小時 | ⭐⭐⭐⭐⭐ | 功能完成後 |
| 安全性檢查 | 🔴 高 | 2-3小時 | ⭐⭐⭐⭐⭐ | 部署前 |
| 效能優化 | 🟡 中 | 2-4小時 | ⭐⭐⭐⭐ | 效能問題出現時 |
| 自動化工作流 | 🟡 中 | 3-5小時 | ⭐⭐⭐⭐⭐ | 重複任務出現時 |
| 程式碼重構 | 🟢 低 | 1-2小時 | ⭐⭐⭐ | 技術債累積時 |
| UI/UX 改進 | 🟢 低 | 1-3小時 | ⭐⭐⭐⭐ | 使用者回饋後 |

---

## 🎯 使用指南

### 自動觸發

AI 會根據以下信號自動提供建議:

- 檢測到專案結構變化
- 使用者提到重複性工作
- 程式碼品質問題
- 效能瓶頸跡象

### 手動觸發

- `/suggest` - 獲取當前專案的所有建議
- `/suggest:performance` - 獲取效能優化建議
- `/suggest:testing` - 獲取測試相關建議
- `/suggest:automation` - 獲取自動化建議

---

## 💡 實際應用範例

### 範例 1: 新專案偵測

```
使用者: 我剛建立了一個 Next.js 專案

AI: 🚀 太好了!建議立即設定以下基礎設施:

1. **測試框架** (30分鐘) ⭐⭐⭐⭐⭐
   yarn add -D jest @testing-library/react @playwright/test
   
2. **GitHub Actions** (1小時) ⭐⭐⭐⭐⭐
   自動化測試 + 部署
   
3. **Zod 驗證** (1小時) ⭐⭐⭐⭐
   確保資料正確性

需要我協助設定嗎? (輸入 1/2/3 或 'all')
```

### 範例 2: 重複性工作偵測

```
使用者: 我每週都要手動匯出報表,好麻煩

AI: 🤖 這是完美的自動化場景!建議:

**n8n 自動化工作流程** (3小時設定,長期節省大量時間)
- 每週一早上 9:00 自動生成報表
- 自動寄送給相關人員
- 備份到 Google Drive

**預期效益**:
- 節省每週 30 分鐘手動操作
- 零失誤率
- 可擴展到其他報表

需要詳細的 n8n 設定教學嗎?
```

### 範例 3: 效能問題偵測

```
使用者: 案件列表載入好慢

AI: ⚡ 我注意到以下效能改進機會:

**問題診斷**:
- 每次載入都查詢資料庫
- 沒有快取機制
- JOIN 查詢未優化

**解決方案** (優先級排序):
1. Redis 快取 (2小時) - 立即見效,減少 80% 查詢
2. 資料庫索引 (30分鐘) - 提升查詢速度 3-5x
3. 前端分頁 (1小時) - 減少單次載入量

建議優先實作 #1 Redis 快取,需要我提供實作步驟嗎?
```

---

## 🔍 智能偵測邏輯

### 專案健康度評分

```typescript
interface ProjectHealth {
  testing: number;        // 0-100
  performance: number;    // 0-100
  security: number;       // 0-100
  codeQuality: number;    // 0-100
  automation: number;     // 0-100
}

// 自動計算並提供改進建議
function calculateHealthScore(project: Project): ProjectHealth {
  return {
    testing: hasTests(project) ? 80 : 20,
    performance: hasCache(project) ? 70 : 30,
    security: hasValidation(project) ? 75 : 25,
    codeQuality: hasLinter(project) ? 85 : 40,
    automation: hasCI(project) ? 90 : 10
  };
}
```

### 建議生成邏輯

```typescript
function generateSuggestions(health: ProjectHealth): Suggestion[] {
  const suggestions = [];
  
  if (health.testing < 60) {
    suggestions.push({
      priority: 'HIGH',
      category: 'TESTING',
      timeEstimate: '1-2 hours',
      impact: 'VERY_HIGH',
      message: '建議添加測試框架...'
    });
  }
  
  if (health.automation < 50) {
    suggestions.push({
      priority: 'MEDIUM',
      category: 'AUTOMATION',
      timeEstimate: '3-5 hours',
      impact: 'VERY_HIGH',
      message: '建議設定 n8n 自動化...'
    });
  }
  
  return suggestions.sort((a, b) => 
    priorityScore(a) - priorityScore(b)
  );
}
```

---

## 📚 相關文件

- **完整改進計畫**: `PROJECT_IMPROVEMENT_PLAN.md`
- **測試指南**: `.agent/workflows/testing-patterns.md`
- **自動化教學**: 參考 n8n 官方文件
- **效能優化**: `.agent/workflows/performance-agent.md`

---

*System Note: 智能建議系統會持續學習專案模式,提供越來越精準的建議。*
*最後更新: 2026-01-17*

