## Why

`/clauses` 常用條文庫目前只按「基本特約／增補特約」分兩段，增補特約一段就有 200 多條；側欄靠標籤篩選，但標籤約 190 個、170 多個只用過一次，實際上被當成備註使用，找條文只能靠記標題或全文搜尋。2026-11-17 已完成資料整理（刪除 19 條重複、224 條改為「主題－情境」標題、個資去識別化），並產出每條對應的主題對照表，現在補上「主題」這一層，讓同主題的條文排在一起、重複一眼可見。

## What Changes

- `contract_clauses` 資料表新增 `topic`（主題，限 12 個固定值）與 `note`（備註，選填）兩個欄位，並依 2026-11-17 對照表回填現有 224 條的主題。
- 新增 12 個固定主題常數（價金付款、貸款代償、交屋騰空、租賃、車位、屋況瑕疵、增建違建、土地產權、稅費、當事人特殊、預售屋都更、解約違約），作為主題的唯一來源。
- `/clauses` 條文列表改為依主題分段顯示（固定主題順序，未設定主題者排在最後的「未分類」段），每條仍顯示基本特約／增補特約標記。
- 側欄改為列出 12 個主題與各主題條數，點選即只看該主題；取代原本「分類→標籤」的側欄。
- 新增／編輯條文時必須選擇主題，並可填寫備註；條文卡片在標題下方顯示備註。
- 搜尋範圍擴大為標題、內容、備註、標籤。

## Non-Goals

（寫在 design.md 的 Goals / Non-Goals。）

## Capabilities

### New Capabilities

- `contract-clause-library`: 常用條文庫的主題分類、依主題分組瀏覽、側欄主題篩選、備註欄位與搜尋範圍。

### Modified Capabilities

（無）

## Impact

- supabase/migrations/20261117120000_add_topic_note_to_contract_clauses.sql（新增：topic、note 欄位、主題值檢查、回填 224 條）
- src/lib/constants/clauseTopics.ts（新增：12 個主題常數、型別防護、分組函式）
- src/lib/constants/clauseTopics.test.ts（新增：分組與篩選的單元測試）
- src/components/features/clauses/useClauses.ts（Clause 型別加 topic、note；主題篩選與搜尋範圍）
- src/app/clauses/page.tsx（側欄改主題、列表改用主題分段元件）
- src/components/features/clauses/ClauseTopicList.tsx（新增：依主題分段渲染條文）
- src/components/features/clauses/ClauseItem.tsx（顯示備註與分類標記）
- src/components/features/clauses/ClauseEditModal.tsx（主題下拉必填、備註輸入）
- src/components/features/clauses/ClauseTagField.tsx（新增：自編輯視窗抽出的標籤輸入區，控制元件行數）
