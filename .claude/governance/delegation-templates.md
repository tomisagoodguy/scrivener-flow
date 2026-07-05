# 派工 prompt 範本（交付 E）

> **on-demand**：要派 subagent 時才 Read。搭配 `.claude/rules/model-dispatch.md`（三件套 + 回報合約的規則在那）。
> 用法：複製對應範本，填 `〔 〕` 空格，貼進 `Agent` 工具的 `prompt`。每個範本已內建**目標與動機／驗收條件／回報格式**三件套。
> 選 `subagent_type` 與 `model` 見每個範本頂部建議；`model` 只能是 `sonnet|opus|haiku|fable`。

---

## 1. 搜尋 / 定位（Explore）

`subagent_type: Explore`　`model: haiku`（量大或簡單）或 `sonnet`（需理解語意）

```
目標與動機：我要〔找什麼〕，因為〔為什麼需要 / 接下來要拿它做什麼〕。
搜尋範圍：〔目錄或 glob，如 src/app/investment/**〕；廣度〔medium / very thorough〕。
驗收條件：
- 涵蓋〔要考慮的命名變體，如 getAllHoldings / buildUnionHoldings〕。
- 每個命中都確認〔判準，如「確實是呼叫而非定義」/「確實是 Client Component」〕。
回報格式（≤〔20〕行，只回結論不要貼原始碼）：
- markdown 表格：`檔案:行號 | 〔欄位〕 | 一句用途`。
- 最後一行給總數；找不到就明說「無命中」。
- 若清單超過 30 筆，寫到 `scratchpad/〔名稱〕.md`，回報只給路徑 + 總數 + 最相關 3 筆。
```

---

## 2. 實作（general-purpose）

`subagent_type: general-purpose`　`model: sonnet`（預設）或 `opus`（涉及設計取捨）

```
目標與動機：實作〔功能〕，因為〔使用者要解決的問題〕。
背景（必讀）：先讀 CLAUDE.md 與相關 rules 檔〔如 .claude/rules/database.md〕，遵守其中的 trap。
範圍邊界：只動〔哪些檔/模組〕；**不要**〔明確禁區，如「不要改 schema」「不要引入新套件」〕。
驗收條件（逐條可檢查）：
- 〔行為 1，如「未登入使用者看到唯讀畫面」〕。
- 型別：`yarn tsc --noEmit` 無新錯。
- 測試：〔yarn test --testPathPatterns xxx〕綠燈；若無測試，說明為何。
- 遵守本專案慣例：〔如台股紅漲綠跌、Supabase client 選對、JOIN 當陣列取〕。
回報格式：
- 改了哪些檔（`檔案:行號` + 一句「改了什麼」），≤〔15〕行。
- 貼上驗證指令的實際輸出（tsc/test 結尾幾行），不要只說「通過」。
- 卡住就回「卡在〔哪〕，報錯原文〔貼〕」，不要假裝完成。
```

---

## 3. 重構（general-purpose 或 refactor-cleaner）

`subagent_type: general-purpose`（有明確目標）或 `refactor-cleaner`（清死碼）　`model: sonnet`

```
目標與動機：重構〔對象〕，動機是〔如「元件 320 行超過 150 行上限，抽 hook」〕。
不可改變的行為（迴歸基準）：〔如「排序邏輯、UI 外觀、API 回傳形狀不變」〕。
驗收條件：
- 行為等價：重構前後〔yarn test xxx〕結果一致（先跑一次記錄基準，改完再跑比對）。
- 型別無新錯：`yarn tsc --noEmit`。
- 沒有留 `_v2`/`.bak`/大段註解碼（本專案禁止）。
- 單檔 ≤〔800〕行、元件 ≤〔150〕行。
回報格式：
- 抽出/移動了什麼（舊路徑 → 新路徑）。
- 基準測試「改前/改後」兩次輸出對比，證明行為等價。
- ≤〔15〕行。
```

---

## 4. 研究（general-purpose，含網頁）

`subagent_type: general-purpose`　`model: sonnet`

```
目標與動機：搞清楚〔問題〕，因為〔要拿來做什麼決策〕。
來源要求：〔如「優先官方文件；台股量化用 finlab/finlab-crawler skill；標註來源」〕。
必答的具體問題：
1. 〔問題 1〕
2. 〔問題 2〕
驗收條件：
- 每個結論附來源（URL 或 skill 檔名），不確定的明說「查不到」，**不要編**。
- 分辨「事實」與「你的推論」。
回報格式（消化後的結論，不要貼網頁原文）：
- 每題一段結論 + 來源。
- 若有長證據，寫到 `scratchpad/research-〔題〕.md`，回報只給路徑 + 3 條要點。
- ≤〔25〕行。
```

---

## 5. 審查（code-reviewer / security-reviewer，fresh context）

`subagent_type: code-reviewer`（一般）或 `security-reviewer`（碰 auth/輸入/RLS/密鑰）　`model: sonnet` 或 `opus`（高風險）

```
目標與動機：審查〔改動範圍，如「本次 diff」/「.claude 治理檔」〕，抓〔什麼類別的問題〕。
審查重點（依序）：
- 規則互相打架 / 前後矛盾。
- 路徑、工具名、指令是否真實存在且正確。
- 弱模型會誤讀的模糊語句。
- 〔程式碼加：安全（RLS/密鑰/注入）、本專案 trap 違反、靜默失敗〕。
驗收條件：
- 逐條給「問題 + 檔案:行號 + 具體修法」，不要泛泛而談「品質可以更好」。
- 沒問題就明說「無」，不要硬湊。
回報格式：
- 依嚴重度排序的清單：`[嚴重度] 檔案:行號 — 問題 — 修法`。
- 最後一行：整體結論（可放行 / 需修 N 處）。
```

---

## 通用提醒（所有範本共用）

- subagent **只有最後一則訊息**回到主對話 → 一定要它把結論放最後、講清楚。
- 長產物**落檔傳路徑**，別讓它整包貼回主對話。
- 要它**誠實回報失敗**：卡住就講卡在哪 + 報錯原文，禁止假裝成功。
- 續談用 `SendMessage`（保留 context），別重開 `Agent`（冷啟動）。
