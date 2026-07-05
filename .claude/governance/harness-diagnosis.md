# Harness 快速診斷（交付 A）

> 產生日期：2026-07-05。此檔是**一次性診斷報告 + 後續所有治理檔的依據**。
> 位置：`.claude/governance/`（**on-demand**，不自動載入；需要時才 `Read`）。
> 讀者：未來在此環境工作的模型（含 Sonnet/Haiku 等較弱模型）。
> 這份的每一條「修法」都對應到某個治理檔或 CLAUDE.md 的具體改動，已標註。

本環境是 Windows 11 上的 Claude Code（VSCode 擴充），主對話目前跑 Opus 4.8。
下面數字是 2026-07-05 實測，不是估計。若你要重測，指令附在各節末。

---

## 一、最漏 token 的前三名

### 1. CLAUDE.md 與 `.claude/rules/*.md` 內容重複（每 session 都付雙倍）
**證據**：`.claude/rules/*.md` **每個 session 自動載入**（CLAUDE.md 沒有 `@import`，但 7 個 rules 檔全在 context 裡，標記為 "project instructions"）。固定 markdown 稅：
- 專案 CLAUDE.md：17,120 bytes（≈4.3K tokens）
- rules 檔：30,085 bytes（≈7.5K tokens）※此為診斷當下的 7 檔數字；本次交付新增 model-dispatch.md、judgment-rubrics.md 後為 9 檔，always-on 稅已上升——正說明「一.2 分層」的必要
- global CLAUDE.md：7,086 bytes（≈1.8K tokens）
- 合計 ≈ **13.5K tokens／session，還沒開始做事就付掉了**。

其中同一事實在 CLAUDE.md 與 rules 檔各講一次（雙倍付費）的至少 4 處：
- 三種 Supabase client → 主 CLAUDE.md +『components.md』
- 台股紅漲綠跌 → 主 CLAUDE.md +『components.md』
- `diff_shares` 單位 → 主 CLAUDE.md +『etf-pipeline.md』
- Supabase JOIN 回傳陣列 → 主 CLAUDE.md +『database.md』

**修法**：主 CLAUDE.md 只留「一句話結論 + 指向 rules 檔」，完整說明留在 rules 檔（單一事實來源）。→ **已由交付 B 執行（保守去重，不刪 trap）**。
**重測**：`wc -c CLAUDE.md .claude/rules/*.md`

### 2. always-on 稅會無限膨脹（每新增一個 rules 檔就永久多付）
**證據**：`.claude/rules/` 是自動載入資料夾。過去每學到一個 trap 就往 rules 檔塞，檔案只增不減 → 每 session 成本單調上升。
**修法**：**分兩層**。
- **always-on**（`.claude/rules/`）：只放「每 session 都可能用到」的操作規則與高頻 trap。
- **on-demand**（`.claude/governance/`）：放「特定情境才需要」的長內容（範本、信、維護協議、本診斷）。需要時才 `Read`，平時 0 token。
- 判準：**「這條規則，一個新 session 平均每 3 次會用到 1 次以上嗎？」** 是 → rules/；否 → governance/。
→ 本次所有治理檔按此分層。model-dispatch / judgment-rubrics 進 `.claude/rules/`（操作時常用）；templates / letter / maintenance / 本診斷進 `.claude/governance/`。

### 3. 全域 MCP 連接器 + skills 的「名稱列舉」
**證據**：專案 `.mcp.json` 只有 `etfedge` 一個 server，但 context 裡列舉了 Gmail/Calendar/Drive/Supabase(×40)/github(×40)/google-map(×20)/playwright(×30)/puppeteer/slack/tavily/firecrawl/exa 等**數百個工具名稱**，來自 **global / claude.ai 連接器**。加上數百個 skill 的名稱+描述列舉。這些名稱本身就是 tokens，且大多在寫 scrivener 程式時用不到。
**修法（需使用者決定，屬帳號層級）**：在 claude.ai 或 global 設定停用「寫程式 session 用不到的連接器」（Gmail/Calendar/Drive/Maps/Slack 等）。**這條主對話動不了，屬使用者操作**，見交付 D「何時停下來問使用者」。schema 本身走 ToolSearch 延遲載入是好的，成本只在名稱列舉。
**重測**：看本 session system prompt 的 deferred tools 區塊長度。

> ⚠️ 誠實標註：#3 是最大的「原始」token 來源，但主對話**無法**自行關閉全域連接器；能自主改善的是 #1、#2。不要假裝能修 #3。

---

## 二、最容易失焦的前三名

### 1. CLAUDE.md 把「每次都要遵守的原則」和「罕見領域瑣事」混在一起
約 340 行的主 CLAUDE.md 裡，`diff_shares` 單位換算、買進模式 7 種判定規則這類**只有碰特定檔案才需要**的細節，和「資料優先／單一事實來源」這種**每次都要遵守**的原則平鋪並列。弱模型讀時注意力被稀釋，抓不到重點。
**修法**：CLAUDE.md 開頭先給「三大原則 + 硬性禁令」，領域瑣事下沉到 rules/ 對應檔，主檔只留指標。→ 交付 B。

### 2. 沒有「指揮官不下場」的規則 → 模型把大量原始檔案倒進主 context
弱模型傾向自己 `Read` 整個 repo、貼上大段程式碼再思考，主 context 迅速被原始資料塞滿，然後就忘了原本要做什麼。
**修法**：`model-dispatch.md` 明訂「大量讀取／掃 repo／查網頁／批次改檔一律派 subagent，主對話只進結論」。→ 交付 C。

### 3. 工具與 skill 表面過大，且有多套重疊系統
同一件事有多個入口造成選擇癱瘓或選錯：
- SDD 流程：專案已改用 **Spectra**（`/spectra-*`），但 global CLAUDE.md 與 `workflow.md` 仍寫 **openspec** 與「禁用 `/plan`」，兩套並存。
- 瀏覽器自動化：playwright MCP、puppeteer MCP、agent-browser skill、webapp-testing skill 四個重疊。
- 記憶：檔案式 memory（`memory/`）與 `mcp__memory__*` graph 兩套。
**修法**：judgment-rubrics 給「同類工具預設用哪個」；B 對齊 Spectra vs openspec 敘述。→ 交付 C/D + B。

---

## 三、最容易出錯的前三名

### 1. 模型 ID 過時（弱模型會呼叫不存在的模型）
global CLAUDE.md 的模型表寫 `claude-opus-4-6 / claude-sonnet-4-6 / claude-haiku-4-5`。**這些與本環境實際可用的不符**：
- Agent 工具的 `model` 參數 enum 只有 **`sonnet | opus | haiku | fable`**（不吃完整 ID）。
- 目前真實 ID：Opus **4.8** `claude-opus-4-8`、**Sonnet 5** `claude-sonnet-5`、Haiku 4.5 `claude-haiku-4-5-20251001`、**Fable 5** `claude-fable-5`。
弱模型照舊表去指定 `claude-sonnet-4-6` 會失敗或被忽略。
**修法**：`model-dispatch.md` 釘死「派 subagent 用 Agent 工具的 `model` 短名 enum」；B 更新 global 模型表。→ 交付 C + B。

### 2. 兩套 SDD 指令並存（Spectra vs openspec）
專案 CLAUDE.md 頂部要求 `/spectra-*`，但 `.claude/rules/workflow.md` 全篇講 `openspec new change` 且「禁止 `/plan`」。弱模型可能跑到已停用的 openspec 指令，或不知道該用哪套。
**修法**：B 在 workflow.md 標明「本專案現行為 Spectra，openspec 指令為歷史遺留」，或收斂到一處。→ 交付 B。

### 3. Windows 雙 shell + 編碼陷阱
本環境同時有 Bash（POSIX）和 PowerShell 兩個工具，路徑有 `/c/...` 與 `C:\...` 兩種寫法，且**系統預設編碼是 cp950**——本次診斷用 `python3 json.load` 讀 UTF-8 的 settings.json 直接 `UnicodeDecodeError`。弱模型很容易：混用路徑分隔符、在 Bash 用 PowerShell 語法（或反之）、讀中文檔踩編碼錯。
**修法**：`judgment-rubrics.md` 附一節「Windows shell/編碼 checklist」：Python 讀檔一律 `encoding='utf-8'` 或 `PYTHONUTF8=1`；Bash 用 `/c/` 與 `/dev/null`；PowerShell 用 `C:\` 與 `$null`；不確定用哪個 shell 就優先 Bash 跑 POSIX 腳本。→ 交付 D。

---

## 附帶發現（非前三，但值得處理）

- **`settings.json` + `settings.local.json` 共 296 條 allow 條目**，大量是一次性精確字串（完整 commit message、完整 PowerShell 一行指令），未來不會再命中，只讓 settings 檔膨脹到難維護。這**不佔 context token**（設定檔不注入對話），但是維護負債與雜訊。修法：用 `/fewer-permission-prompts` 或手動改成 pattern-based（如 `Bash(bash *smart_commit.sh*)`）。屬低優先，動前先問使用者（見交付 F）。
- **memory 兩套並存**：檔案式 `memory/*.md`（有 MEMORY.md 索引，是使用者慣用的）與 MCP `mcp__memory__*`。預設用檔案式，別把同一事實寫進兩邊（違反單一事實來源）。

---

## 這份診斷如何被後續交付引用

| 診斷條目 | 對應交付 | 落地檔 |
|---------|---------|--------|
| 一.1 去重 | B | `CLAUDE.md`（兩份） |
| 一.2 分層 always-on/on-demand | 架構決策 | `.claude/rules/` vs `.claude/governance/` |
| 一.3 連接器停用 | D（問使用者） | `judgment-rubrics.md` |
| 二.2 指揮官不下場 | C | `model-dispatch.md` |
| 三.1 模型 ID | C + B | `model-dispatch.md`、global CLAUDE.md |
| 三.2 Spectra/openspec | B | `workflow.md` |
| 三.3 Windows shell/編碼 | D | `judgment-rubrics.md` |
