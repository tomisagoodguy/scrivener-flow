# 模型調度守則（交付 C）

> **always-on**：此檔每 session 自動載入。刻意保持精簡；完整範本在 `.claude/governance/delegation-templates.md`（用時才 Read）。
> 依據：`.claude/governance/harness-diagnosis.md` 二.2、三.1。
> 讀者是較弱模型 → 每條都有判準與範例，不要只給抽象要求。

---

## 0. 本環境的真實工具事實（不要憑印象）

- 派 subagent 用 **`Agent`** 工具。`subagent_type` 常用值：`general-purpose`（多步驟/查找）、`Explore`（唯讀廣搜，只回結論）、`Plan`（規劃）、`architect`、`code-reviewer`、`security-reviewer`、`build-error-resolver`、`refactor-cleaner`。
- **`model` 參數 enum 只有 4 個短名**：`sonnet | opus | haiku | fable`。**不要**傳 `claude-sonnet-4-6` 這種完整 ID（會失敗）。省略則繼承父對話模型。
- **本 harness 沒有「per-subagent effort」參數**。你能調的只有：`model` 短名 + `subagent_type` + 把任務切多小。想「更高 effort」＝派更強的 `model`（opus）或把任務拆更細，**不是**去找不存在的 effort 旗標。（session 層級的 `/fast` 只切主對話 Opus 快速輸出，不影響 subagent。）誠實：**effort 補不了模糊題與品味題**，那類見 `judgment-rubrics.md`。
- 續用已派出的 agent（保留其 context）：用 `SendMessage` 帶 agent id/name。**重開 `Agent` 是冷啟動**，會重讀一切、重推導你已知的事——能續就別重開。
- 背景執行：`run_in_background: true`；隔離 git：`isolation: "worktree"`。

---

## 1. 指揮官不下場（最重要）

主對話（你）是指揮官。**下列動作一律派 subagent，主對話只進「結論」，不進原始資料**：

| 該派出去 | 為什麼 |
|---------|--------|
| 掃 repo / 跨多檔搜尋（結果可能很多） | 原始檔案倒進主 context 會塞爆、失焦 |
| 讀 3 個以上大檔只為找一個結論 | 用 `Explore`，它只回結論不回檔案內容 |
| 查網頁 / 抓文件 / 研究 | 網頁原文很長，讓 subagent 消化後只回摘要 |
| 批次改多檔的機械性修改 | 派 subagent 或 worktree，主對話只審 diff |

**正例**：要找「哪些檔案用到 `getAllHoldings`」→ 派 `Explore`（"medium"），只回檔案清單 + 一句用途。
**反例**：主對話自己連續 `Grep` + `Read` 8 個檔案、貼出每個檔全文，然後才開始想 → 主 context 已被原始碼淹沒。

**例外（主對話自己做，別派）**：單一已知檔案的精準 Read/Edit；1–2 次工具就能完成的事；需要你這一級判斷力的核心推理（設計決策、寫這種治理檔）。派工有固定成本（冷啟動 + 來回），**別為省 2 次工具呼叫而派**。

---

## 2. 派工三件套（每次派 subagent 都必須寫齊）

缺任何一件，subagent 就會亂做或回一堆你不要的東西。

1. **目標與動機**：要什麼結果 + 為什麼要（讓它能自己權衡取捨）。
2. **驗收條件**：怎樣算完成（可檢查的判準，不是「做好」）。
3. **回報格式**：要它回什麼、多長、什麼結構。

**正例**：
> 目標：找出 investment 模組所有直接 `import` `service.ts`（bypass RLS）的 Client Component，因為那是安全風險。
> 驗收：列出每個違規檔的路徑+行號，並確認該檔確實是 Client Component（有 `'use client'`）。
> 回報：markdown 表格 `檔案:行號 | 是否 'use client' | 一句說明`，≤20 行。找不到就回「無違規」。

**反例**：「幫我看一下 investment 模組有沒有安全問題」——沒動機、沒驗收、沒格式 → 回一大篇沒法用。

完整可套用範本（搜尋/實作/重構/研究/審查）見 `.claude/governance/delegation-templates.md`。

---

## 3. 模型選擇預設（省略 model 則繼承父對話）

| 任務型態 | 預設 model | 理由 |
|---------|-----------|------|
| 唯讀廣搜、機械式列舉、跑指令看輸出 | `haiku` | 便宜快，錯了再升 |
| 一般實作、重構、寫測試、審查 | `sonnet` | 主力，性價比最好 |
| 架構決策、深度推理、模糊需求拆解、對抗審查 | `opus` | 需要判斷力時才用 |

**判準**：不確定就先用 `sonnet`；只有「明顯機械、量大」才降 `haiku`；只有「錯了代價高、要判斷力」才升 `opus`。

---

## 4. 升降級路徑（同一件事最多重試兩輪，別鬼打牆）

- **小模型（haiku）錯一次 → 直接升 sonnet**，不在 haiku 上重試。
- **中階（sonnet）同一子任務連錯兩次 → 升 opus**，且**帶完整失敗軌跡**（前兩次做了什麼、錯在哪、報錯原文）給 opus，別讓它從零開始。
- **opus 解出的模式 → 降回 sonnet/haiku 批次套用**到其餘同類 case（別用 opus 做重複勞動）。
- **同一件事最多重試兩輪**。兩輪還不行 → 停，這通常是「方向錯」或「題目模糊」，不是模型不夠力。轉去看 `judgment-rubrics.md`「什麼訊號代表方向錯了」與「何時停下來問使用者」。

**正例**：haiku 跑批次改名失敗一次 → 立刻改派 sonnet，附上 haiku 的報錯。
**反例**：sonnet 同一個型別錯誤修了三、四、五次還在試 → 早該在第二次失敗時升 opus 並附軌跡。

---

## 5. 回報合約（subagent 回什麼、怎麼回）

- subagent 的**最後一則訊息**才會回到主對話；過程訊息你看不到 → 要它把結論放最後、講清楚。
- **只回結論 + `檔案:行號`**，不要回大段原始碼／網頁原文。
- **長產物落檔再傳路徑**：要它把長輸出寫到 `.claude/governance/` 或 scratchpad 的檔案，回報只給「已寫到 `<path>`，重點是 X、Y」。主對話再視需要 Read。
- 明確要求「若失敗，回報卡在哪 + 報錯原文」，不要它假裝成功（見誠實條款）。

**正例**：「把完整清單寫到 `scratchpad/holdings-usages.md`，回報只給路徑 + 總數 + 最可疑的 3 筆。」
**反例**：subagent 把 500 行搜尋結果整包貼回主對話。

---

## 6. 驗證不自驗（產出者不當自己的驗收員）

自己寫的東西自己驗，會系統性看不到自己的盲點。**驗收一律派 fresh-context agent**（沒參與產出、context 乾淨）：

- **檔案是否落地／完整** → 派 agent 做 **read-back**（實際 Read 該檔，回報行數、關鍵段落是否在、有無截斷）。
- **程式碼是否正確** → **跑測試或實跑**（`yarn test`、`yarn build`、實際執行），不看「看起來對不對」。
- **高風險判斷 / 品味題** → 加**第二意見**（另派一個 opus 獨立判斷）或**多答案評審**（產 2–3 版，派一個 agent 評審選優）。

**正例**：改完 CLAUDE.md → 派 fresh agent Read 全檔，回報「規則有無互相打架、路徑/工具名有無錯、弱模型會誤讀處」。
**反例**：自己讀一遍自己剛寫的檔說「沒問題」——這不是驗證。

> 誠實：多樣本 + 評審能補**執行品質**（漏看、手滑、覆蓋率）；補不了**品味與模糊題**。遇到真正的模糊/品味判斷，升 opus 或問使用者，別用「多跑幾次」假裝解決。
