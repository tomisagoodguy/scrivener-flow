# 模組索引

快速查找各模組對應的檔案。主要架構請見 CLAUDE.md。

---

## App Router 路由

| 路由 | 說明 |
| :--- | :--- |
| `/cases` | 案件列表（里程碑排序）+ `/cases/[id]` 案件詳情 |
| `/investment` | 投資儀表板入口 |
| `/investment/buying-patterns` | ETF 買進模式前瞻報酬分析（折線圖 / 熱力圖 / 勝率圖） |
| `/investment/strategy` | 策略選股中心（`strategy_signals` 資料表，5 種量化策略訊號） |
| `/investment/frontrunning` | ETF 持股公告前後成交量異常偵測 |
| `/investment/sectors` | 族群強弱分析（全市場資金流向，含成分股展開） |
| `/investment/dashboard/[code]` | 個股儀表板（動態路由，整合法人 + 基本面 + K 線） |
| `/banks` | 代償銀行管理 |
| `/calculator` | 稅費試算工具 |
| `/clauses` | 契約條款範本管理 |
| `/notes` | 備忘錄板（支援 `view=list` 緊湊模式） |
| `/redemptions` | 代償案件管理 |
| `/guidelines` | 不動產法規指引（條文搜尋，全員共用） |
| `/knowledge` | 知識庫（Tiptap 富文字，全員共用，不做 user_id 隔離） |
| `/admin` | 管理員功能（import、用戶管理） |
| `/identify` | 文件辨識（DOCX 解析） |
| `/login` | 登入頁（Google OAuth + 密碼 + MFA TOTP） |

---

## Services（`src/services/`）

| 檔案 | 職責 |
| :--- | :--- |
| `caseService.ts` | 案件 CRUD、里程碑更新、自動任務生成（3–5天前） |
| `todoService.ts` | 待辦事項新增/完成/刪除，含 `source_key` 去重 |
| `noteService.ts` | 備忘錄 CRUD + E2EE 加密備註 |
| `dashboardNotesService.ts` | 首頁備忘錄摘要（跨案件） |
| `revenueLabService.ts` | 營收分析資料查詢 |

## Repositories（`src/repositories/`）— 僅投資模組使用

| 檔案 | 職責 |
| :--- | :--- |
| `priceRepo.ts` | 個股每日收盤價查詢 |
| `revenueRepo.ts` | 月營收資料查詢 |
| `stockRepo.ts` | 個股基本資料、法人持股 |

Repository Pattern 僅限投資模組，案件模組使用 Service 層直接呼叫 Supabase。

---

## Hooks（`src/hooks/`）

### 投資分析（`src/hooks/investment/`）

| 檔案 | 職責 |
| :--- | :--- |
| `useHoldingsFilter.ts` | ETF 持股篩選、排序、搜尋狀態 |
| `useStockDashboard.ts` | 個股儀表板整合資料（價格 + 法人 + 基本面） |
| `useStockDetailData.ts` | 個股詳情頁資料聚合 |
| `usePriceData.ts` | 股價歷史資料查詢（含 K 線） |
| `useRevenueData.ts` | 月營收趨勢資料 |
| `useChipsData.ts` | 籌碼面（法人買賣超）資料 |
| `useBrokerData.ts` | 券商分點進出資料 |
| `useStockPickerHub.ts` | 選股中心資料聚合（跨 ETF 持股比較） |

### 通用 App Hooks

| 檔案 | 職責 |
| :--- | :--- |
| `useAuthUser.ts` | 取得當前登入用戶（包裝 Supabase session） |
| `useCaseTodos.ts` | 案件待辦事項清單（含自動任務） |
| `useSupabaseQuery.ts` | 通用 Supabase 資料查詢 wrapper（含 loading/error 狀態） |
| `useFormSubmit.ts` | 表單提交狀態管理（loading / error / success） |
| `useCrudDelete.ts` | 通用刪除確認流程 |
| `useNotification.ts` | Toast / 通知訊息管理 |
| `useLoginFlow.ts` | 登入表單狀態與流程控制 |
| `useNoteDetail.ts` | 備忘錄詳情頁編輯狀態 |
| `useWeather.ts` | 天氣資料查詢（首頁 widget） |
| `useIdentifyUpload.ts` | DOCX 文件上傳與辨識流程 |
| `useWordExport.ts` | Word 文件匯出邏輯 |
| `useAccessibility.ts` | 無障礙設定讀取 |

---

## 工具庫（`src/lib/`）

| 路徑 | 說明 |
| :--- | :--- |
| `calculator/` | 稅費計算：`taxConstants.ts`（稅率）、`landTaxUtils.ts`、`houseTaxUtils.ts`、`feeUtils.ts`、`calculatorUtils.ts` |
| `docx-parser/` | DOCX 文件解析：extractors 拆分 basicInfo、payments、personnel、redemptions |
| `crypto/` | E2EE：`encryption.ts`（AES-256-GCM）、`keyManagement.ts`（90 天輪替）、`secureApi.ts`（防流量分析） |
| `auth/` | `client.ts`（Client 端 session）、`server.ts`（Server 端 session） |
| `google/drive.ts` | Google Drive 整合（文件上傳/存取） |
| `emailService.ts` | Email 通知 |
| `lineService.ts` | LINE Messaging API（通知、Flex Message） |
| `constants/` | `caseConstants.ts`（案件狀態）、`milestoneConstants.ts` |
