# 判斷力 rubric 與 checklist（交付 D）

> **always-on**：每 session 自動載入。這是把「強模型才擅長的判斷」寫成弱模型可照做的判準。
> 每條都有一個**正例**（該這樣）和一個**反例**（別這樣）。照判準走，不要靠感覺。
> 搭配 `model-dispatch.md`（怎麼派）。誠實：rubric 補得了「該不該升級/停下」，補不了「品味好不好」——品味題一律升 opus 或問使用者。

---

## A. 何時該升級模型（往 opus 升）

升，如果**任一**成立：
- 同一子任務**連錯兩次**（見 model-dispatch §4）。
- 任務要求**取捨判斷**（架構、命名慣例、資料模型），不是照抄照做。
- 錯了**代價高**且**難回復**（改 DB schema、刪檔、動 migration、外發訊息）。
- 需求**本身模糊**，怎麼做取決於「使用者到底要什麼」。

**正例**：要決定「投資模組新表該不該做 RLS 隔離」——牽涉多租戶安全、難回復 → 升 opus 或問使用者。
**反例**：把 20 個檔案的 `text-green-600` 改成 `text-emerald-600`——純機械、可回復 → 留 haiku/sonnet，別浪費 opus。

---

## B. 何時算「真的完成」（宣告完成前的門檻）

**全部**打勾才算完成，缺一條都是「還沒完成」：
- [ ] 驗收條件**逐條**對過（不是「大概做了」）。
- [ ] 有**客觀證據**：測試通過的輸出、build 成功、實跑截圖/日誌、fresh agent 的 read-back。**不接受「看起來對」**。
- [ ] 改動的**反向情境**想過（空值、權限、RLS、里程碑陣列、台股紅漲綠跌等本專案 trap）。
- [ ] 沒有留下「靜默失敗」（空 try/catch、假裝成功）。

**正例**：「改完 `getHoldings` 補價邏輯 → `yarn test --testPathPatterns useHoldings` 綠燈 + 派 agent 實跑頁面確認數字」→ 可宣告完成。
**反例**：「我改好了，應該可以了」——沒有任何證據 → 不可宣告完成。詳細清單見 skill `verification-before-completion`。

---

## C. 何時該停下來問使用者（別自己猜）

停下來問，如果**任一**成立：
- 決策是**使用者的、你無法從程式碼或合理預設推出**（要不要上線、刪不刪資料、選哪個外部服務）。
- 動作**難回復或外發**：DELETE/DROP、`git push --force`、寄信、發 LINE、改 production 設定。
- 需求有**兩種以上合理解讀**，選錯會白做一大段。
- 動作**超出授權範圍**：本次沒被授權的破壞性操作、動別人的檔、關全域連接器（見 harness-diagnosis 一.3，那是使用者帳號層級操作）。

**但不要為「有合理預設」的事問**：慣例選擇（用哪個既有工具、遵循現有 code style）→ 直接選最明顯的、說一句、往下做。**過度發問等於沒有自主性。**

**正例**：「要不要把 296 條 permission 精簡（會刪掉現有 allow 條目，難回復）」→ 動前問。
**反例**：「這個 util 該放 `src/lib/` 還是 `src/utils/`」——repo 已有慣例（`src/lib/`）→ 別問，照慣例做。

一次最多問一批（≤5 題），問完就往下做，不要每步都停。

---

## D. 什麼訊號代表「方向錯了」，該換路而非重試

出現**任一**，停止重試，退一步重新想路徑：
- 同一個錯**第三次**出現（重試兩輪的鐵律，見 model-dispatch §4）。
- 修 A 壞了 B、修 B 又壞回 A（在原地打轉）。
- 為了讓某方法成立，你開始**加特例、繞過型別、砍測試、`--force`**。
- 解法愈來愈複雜、要碰的檔愈來愈多，但離「綠燈」沒有更近。
- 你發現自己在**對抗框架**（跟 Next.js/Supabase/RLS 的預設行為硬扛）。

**該做的**：停 → 用一句話寫下「我真正要達成的是什麼」→ 問「有沒有不繞過機制的做法」→ 換路，或升 opus 帶完整失敗軌跡，或問使用者。

**正例**：RLS 一直擋查詢，改用 `service.ts`（bypass）前先想「這查詢本來就該在 Server 端嗎」→ 換成 Server Component 用 `server.ts`，順著機制走。
**反例**：RLS 擋 → 到處灑 `service.ts` bypass → 製造安全漏洞。這是對抗框架的典型訊號。

---

## E. 品質底線怎麼驗（不可跳過的最低驗證）

依產出型態，**至少**做對應這格：

| 產出型態 | 最低驗證（不做＝未完成） |
|---------|------------------------|
| 改程式碼 | `yarn tsc --noEmit`（型別）+ 相關 `yarn test`；動 UI 加實跑 |
| 改 Python（ETF） | `uv run ruff check` + `uv run pytest ETF/相關` |
| 改文件/規則檔 | 派 fresh agent **read-back**：檔在不在、完不完整、規則有無互相打架 |
| 高風險判斷/品味 | 第二意見（另一 opus）或多答案評審選優 |
| 動 DB schema | 只走 `supabase/migrations/*.sql`；**禁** Prisma migrate、禁 Supabase UI 手動；動前問使用者 |

**正例**：改 rules 檔 → 派 fresh agent read-back，回報「model-dispatch §4 與 judgment §D 的『重試兩輪』一致，無衝突」。
**反例**：改完 rules 檔自己掃一眼說「應該沒問題」——產出者自驗＝無效驗證（見 model-dispatch §6）。

---

## F. Windows shell / 編碼 checklist（本環境高頻出錯，見 harness-diagnosis 三.3）

- **Python 讀檔一律指定編碼**：`open(path, encoding='utf-8')` 或整段設 `PYTHONUTF8=1`。系統預設 cp950，讀中文/UTF-8 檔會 `UnicodeDecodeError`。
- **選 shell**：不確定就用 **Bash**（POSIX，跨平台穩）。只有真的要 PowerShell cmdlet/物件管線才用 PowerShell。
- **路徑**：Bash 用 `/c/Users/...`、`/dev/null`、`$VAR`；PowerShell 用 `C:\Users\...`、`$null`、`$env:VAR`。**別在 Bash 裡寫 PowerShell 語法，反之亦然**。
- **檔案操作**：優先用 Read/Edit/Write/Glob/Grep 專用工具，不要用 `cat`/`sed`/`find`/`Get-Content`/`Select-String`。

**正例**：`export PYTHONUTF8=1; python3 -c "import json; json.load(open('.claude/settings.json',encoding='utf-8'))"`。
**反例**：`python3 -c "json.load(open('settings.json'))"` → cp950 解碼爆掉（本次診斷實際踩過）。

---

## G. 同類工具選哪個（本環境有重疊系統，避免選錯，見 harness-diagnosis 二.3）

| 想做的事 | 預設用 | 別用（除非有特殊理由） |
|---------|-------|----------------------|
| 功能開發/修改流程 | **Spectra**（`/spectra-*`） | openspec（本專案已遷移，屬歷史遺留）、`/plan`（本專案禁用） |
| 記憶 | 檔案式 `memory/*.md` + `MEMORY.md` 索引 | `mcp__memory__*` graph（別把同事實寫兩邊） |
| 瀏覽器/前端實測 | `playwright-skill` 或 `webapp-testing` skill | 同時起 puppeteer + playwright MCP |
| 跨檔搜尋 | `Grep`/`Glob` 工具，或派 `Explore` agent | Bash `grep`/`find` |
| 台股量化/選股 | `finlab` + `taiwan-strategy` skill | 憑印象臆測 API |

**正例**：使用者說「開個新功能」→ 走 `/spectra-propose`。
**反例**：看到 `workflow.md` 寫 openspec 就跑 `openspec new change` → 那是遺留敘述，B 已標註，實際用 Spectra。
