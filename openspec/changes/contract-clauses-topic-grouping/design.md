## Context

`contract_clauses`（全團隊共用，RLS：已登入可讀寫）欄位為 title、content、category（基本特約／增補特約）、tags、usage_count。`/clauses`（`src/app/clauses/page.tsx`，Client Component，經 `useSupabaseQuery` 讀取）目前把條文切成「基本特約」「增補特約」兩段，側欄由 `useClauses` 的 `tagsByCategory` 組成「分類→標籤」兩層，篩選值是 `分類` 或 `分類::標籤` 字串。

2026-11-17 已在資料庫完成：刪除 19 條重複、224 條改為「主題－情境」標題、31 條個資去識別化。每條的主題記在對照表 `條文整理對照表.csv`（使用者桌面，欄位含 `主題` 與 `id`），尚未有欄位可存。

現況限制：`page.tsx` 230 行、`ClauseEditModal.tsx` 184 行，已超過元件 150 行上限（`.claude/rules/components.md`）；本次改動不得讓它們更長，並順手把新增邏輯放到新元件。

## Goals / Non-Goals

**Goals:**

- 資料庫有 `topic`、`note` 欄位，topic 由 CHECK 限定 12 個值；現有 224 條全部回填主題。
- `/clauses` 依主題分段、側欄依主題篩選、搜尋涵蓋備註與標籤。
- 新增／編輯條文時主題必填、備註選填。
- 主題清單只在 `src/lib/constants/clauseTopics.ts` 定義一次。

**Non-Goals:**

- 不改離線 HTML 匯出（`exportClausesToHTML`）與 Excel 匯出的分組方式；兩者仍依 category，後續另開 change。
- 不自動把現有「被當備註用」的標籤搬到 note；note 由使用者日後手動填。
- 不處理對照表中「合併（待確認）」5 條與「疑似系統範例」29 條的去留。
- 不改 RLS、不改 usage_count 與複製流程。
- 不把主題做成可自訂的資料表（見決策 1）。

## Decisions

### 決策 1：主題用 text 欄位加 CHECK，不另建主題表

`topic text NULL CHECK (topic IN (...12 個值...))`。主題固定 12 個、由程式常數驅動排序與下拉選單；另建 `clause_topics` 表要多一次 JOIN 與管理介面，對 224 條的共用條文庫是過度設計。替代方案 Postgres enum：改值需 `ALTER TYPE`，比改 CHECK 麻煩，不採用。日後要增減主題時，同時改常數檔與新 migration 的 CHECK。

### 決策 2：topic 允許 null，UI 強制必填

資料庫層允許 null（舊資料、未來匯入都不會因缺主題寫入失敗），null 在畫面上歸入「未分類」段；新增與編輯表單則把主題設為必填。如此資料層不會擋住寫入，人為新增的條文仍一定有主題。

### 決策 3：回填直接寫在 migration 的 VALUES 清單

migration 內以 `UPDATE contract_clauses c SET topic = v.topic FROM (VALUES (id, topic), ...) v WHERE c.id = v.id` 回填，224 組 (id, 主題) 由對照表 CSV 以腳本產生後貼入。id 為 UUID、不含個資，可安全進版控。替代方案「標題前綴推主題」不可靠（標題前綴如「二胎」「拆價」不等於主題），不採用。migration 由使用者在 Supabase SQL Editor 執行（本環境以工具執行寫入 SQL 會被權限擋下）。

### 決策 4：分組與篩選寫成純函式

`groupClausesByTopic(clauses)`、`filterClauses(clauses, searchTerm, selectedTopic)`、`normalizeClauseNote(note)` 都放在 `src/lib/constants/clauseTopics.ts`，不依賴 React，可直接用 Jest（`src/lib/constants/clauseTopics.test.ts`）測排序、篩選與空白備註轉 null。`useClauses` 與頁面只呼叫這些函式並負責渲染。

### 決策 5：側欄每個主題一個項目，選取值改為主題名

側欄 `groups` 改為單一群組「主題」，items 為有條文的主題（含「未分類」），`id` 即主題名（未分類用常數 `UNCATEGORIZED = '未分類'`）。`selectedCategory` 狀態更名為 `selectedTopic`，不再解析 `分類::標籤`。原本標籤側欄移除；標籤仍可搜尋。

### 決策 6：抽出元件以守住行數上限

新增 `ClauseTopicList.tsx`（接收分組結果，渲染各主題段落與 `ClauseItem`），取代 `page.tsx` 內兩段重複的渲染；自 `ClauseEditModal.tsx` 抽出標籤輸入區為 `ClauseTagField.tsx`，騰出空間放主題下拉與備註欄。改完後 `page.tsx`、`ClauseEditModal.tsx` 行數不得多於改動前（230、184）。

## Implementation Contract

**行為**：

- 開啟 `/clauses`：條文依 價金付款→貸款代償→交屋騰空→租賃→車位→屋況瑕疵→增建違建→土地產權→稅費→當事人特殊→預售屋都更→解約違約→未分類 分段；空段不顯示；段標題含條數；段內基本特約在前，其餘依標題 zh-TW 排序；卡片保留基本／增補標記。
- 側欄點主題只看該主題；搜尋框有字時跨所有主題搜尋 title、content、note、tags（不分大小寫）。
- 新增／編輯：主題 `<select required>`，選項為 12 主題；備註 `<textarea>` 選填，空白字串存 null。
- 卡片有備註時於標題下顯示（次要文字樣式，支援深色模式）；複製只複製 content。

**資料形狀**：

- DB：`contract_clauses.topic text NULL` + CHECK 12 值；`contract_clauses.note text NULL`。
- TS：`Clause` 介面增加 `topic: ClauseTopic | null`、`note: string | null`；`CLAUSE_TOPICS` 為 `readonly` tuple，`ClauseTopic = typeof CLAUSE_TOPICS[number]`；`isClauseTopic(value: unknown): value is ClauseTopic`；`groupClausesByTopic<T extends { topic: string | null; category: string; title: string }>(clauses: T[]): { topic: ClauseTopic | '未分類'; clauses: T[] }[]`。

**失敗模式**：

- 寫入不在 12 值內的 topic → Postgres CHECK 錯誤，沿用 `handleSaveClause` 既有的 `alert('儲存失敗：' + message)`，不靜默。
- 資料庫讀到非 12 值的 topic（理論上被 CHECK 擋住）→ `groupClausesByTopic` 視同 null 歸「未分類」，不丟例外。

**驗收**：

- `yarn test --testPathPatterns clauseTopics` 綠燈，涵蓋 spec 的分組順序、段內排序、空段不出現、搜尋四欄位與搜尋覆蓋篩選。
- `yarn tsc --noEmit` 無錯誤；`yarn eslint` 改動檔無新錯誤。
- 使用者在 SQL Editor 執行 migration 後，以 `select count(*) filter (where topic is null) from contract_clauses` 查得 0，且 `select topic, count(*) ... group by topic` 的各主題條數等於對照表中「處理」不是「刪除（重複）」的列依主題計數。
- 使用者登入後手動確認 `/clauses` 分段、側欄篩選、新增必選主題（`/clauses` 需登入，無法無頭自動測）。

**範圍**：包含 migration、常數與分組函式、`useClauses` 篩選、頁面與四個 clauses 元件。不含匯出、標籤搬遷、資料去留、RLS。

## Risks / Trade-offs

- [風險] 回填 VALUES 依賴 2026-11-17 的 id；若執行 migration 前有人新增條文，新條文 topic 為 null → 歸「未分類」段，使用者自行補選，不影響其他資料。
- [風險] migration 由使用者手動執行，可能忘記執行就部署新程式 → 前端在 topic 欄位不存在時 select `*` 仍可讀到其他欄位、topic 為 undefined；`groupClausesByTopic` 把 undefined 當 null 處理，頁面全部落在「未分類」而不會壞掉。部署前在 tasks 中列為必做步驟。
- [取捨] 移除標籤側欄後，靠點標籤找條文的使用方式消失，改以主題 + 搜尋（含標籤）取代。
