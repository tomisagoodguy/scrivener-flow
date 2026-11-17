## Why

`/clauses` 常用條文庫目前只按「基本特約／增補特約」分兩段，增補特約一段就有 200 多條；側欄靠標籤篩選，但標籤約 190 個、170 多個只用過一次，實際上被當成備註使用，找條文只能靠記標題或全文搜尋。2026-11-17 已完成資料整理（刪除 19 條重複、224 條改為「主題－情境」標題、個資去識別化），並產出每條對應的主題對照表，現在補上「主題」這一層，讓同主題的條文排在一起、重複一眼可見。

2026-11-17 上線後使用者追加：基本特約是每次簽約都要用的條文，「全部顯示」時要集中在最上方，不能分散到各主題段；離線 HTML 匯出也要跟頁面採相同的主題版面。

## What Changes

- `contract_clauses` 資料表新增 `topic`（主題，限 12 個固定值）與 `note`（備註，選填）兩個欄位，並依 2026-11-17 對照表回填現有 224 條的主題。
- 新增 12 個固定主題常數（價金付款、貸款代償、交屋騰空、租賃、車位、屋況瑕疵、增建違建、土地產權、稅費、當事人特殊、預售屋都更、解約違約），作為主題的唯一來源。
- `/clauses` 條文列表改為依主題分段顯示（固定主題順序，未設定主題者排在最後的「未分類」段），每條仍顯示基本特約／增補特約標記。
- 未選主題（「全部顯示」）時，列表最上方固定一段「基本特約」收錄所有基本特約，其下各主題段只放增補特約；選了某主題時只看該主題，段內基本特約在前。
- 側欄改為列出 12 個主題與各主題條數，點選即只看該主題；取代原本「分類→標籤」的側欄。
- 新增／編輯條文時必須選擇主題，並可填寫備註；條文卡片在標題下方顯示備註。
- 搜尋範圍擴大為標題、內容、備註、標籤。
- 離線 HTML 匯出改為與頁面「全部顯示」相同的版面：基本特約段置頂、12 主題依序、最後未分類；匯出檔側欄列出這些段落並可點選篩選，搜尋涵蓋四個欄位，卡片顯示備註。

## Non-Goals

（寫在 design.md 的 Goals / Non-Goals。）

## Capabilities

### New Capabilities

- `contract-clause-library`: 常用條文庫的主題分類、依主題分組瀏覽（含全部顯示時基本特約置頂）、側欄主題篩選、備註欄位、搜尋範圍與離線 HTML 匯出版面。

### Modified Capabilities

（無）

## Impact

- supabase/migrations/20261117120000_add_topic_note_to_contract_clauses.sql（新增：topic、note 欄位、主題值檢查、回填 224 條）
- src/lib/constants/clauseTopics.ts（新增：12 個主題常數、型別防護、分組與分段函式）
- src/lib/constants/clauseTopics.test.ts（新增：分組、分段與篩選的單元測試）
- src/components/features/clauses/useClauses.ts（Clause 型別加 topic、note；主題篩選與搜尋範圍；輸出分段結果）
- src/app/clauses/page.tsx（側欄改主題、列表改用主題分段元件）
- src/components/features/clauses/ClauseTopicList.tsx（新增：依段落渲染條文）
- src/components/features/clauses/ClauseItem.tsx（顯示備註與分類標記）
- src/components/features/clauses/ClauseEditModal.tsx（主題下拉必填、備註輸入）
- src/components/features/clauses/ClauseTagField.tsx（新增：自編輯視窗抽出的標籤輸入區，控制元件行數）
- src/components/features/clauses/exportClausesToHTML.ts（匯出版面改為基本特約置頂加主題分段、側欄段落篩選、備註顯示與搜尋）
- src/components/features/clauses/exportClausesToHTML.test.ts（匯出版面與既有保護的測試）
