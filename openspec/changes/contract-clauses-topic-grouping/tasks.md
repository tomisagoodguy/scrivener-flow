## 1. 資料庫欄位與回填

- [x] 1.1 新增 migration `supabase/migrations/20261117120000_add_topic_note_to_contract_clauses.sql`：`contract_clauses` 加 `topic text NULL` 並以 CHECK 限定 12 個主題、加 `note text NULL`，再以 `UPDATE ... FROM (VALUES ...)` 回填 224 組 (id, 主題)；VALUES 由腳本讀使用者桌面 `條文整理對照表.csv`（排除「處理」為「刪除（重複）」的列）產生（需求：Fixed clause topic set；決策 1：主題用 text 欄位加 CHECK，不另建主題表；決策 2：topic 允許 null，UI 強制必填；決策 3：回填直接寫在 migration 的 VALUES 清單）。驗證：檔案內 VALUES 恰 224 列且每列主題屬於 12 值（腳本斷言）；使用者在 Supabase SQL Editor 執行後，`select count(*) filter (where topic is null) from contract_clauses` 為 0，且 `group by topic` 各主題條數與 CSV 計數一致，查詢結果記錄於本任務下方。
  - 2026-11-17：產生腳本斷言 VALUES 224 列、主題皆屬 12 值、id 不重複。使用者於 SQL Editor 執行（首次因手誤多打字元語法錯誤、整段未執行；以乾淨檔重跑成功）。
  - 執行後查詢 `select coalesce(topic,'(null)'), count(*) from contract_clauses group by 1`：價金付款 13、貸款代償 26、交屋騰空 30、租賃 13、車位 17、屋況瑕疵 37、增建違建 9、土地產權 27、稅費 30、當事人特殊 12、預售屋都更 6、解約違約 4，共 224，無 null，與 CSV 計數完全一致。
  - `pg_get_constraintdef` 確認 `contract_clauses_topic_check` 為 `CHECK (topic IS NULL OR topic = ANY (ARRAY[12 個主題]))`。

## 2. 主題常數與純函式

- [x] 2.1 新增 `src/lib/constants/clauseTopics.ts`：匯出 `CLAUSE_TOPICS`（12 主題 readonly tuple，依規格順序）、`ClauseTopic` 型別、`UNCATEGORIZED = '未分類'`、`isClauseTopic`，以及 `groupClausesByTopic`——依主題固定順序分段、null 或非法值歸「未分類」排最後、空段不輸出、段內基本特約在前其餘依標題 zh-TW 排序（需求：Fixed clause topic set、Clauses grouped by topic；決策 4：分組與篩選寫成純函式）。驗證：先寫 `src/lib/constants/clauseTopics.test.ts` 的分組測試並確認在實作前失敗，實作後 `yarn test --testPathPatterns clauseTopics` 通過，含規格「Grouping order with an untopiced clause」與「Ordering inside a topic section」兩個案例。
- [x] 2.2 在 `clauseTopics.ts` 新增 `filterClauses(clauses, searchTerm, selectedTopic)`：搜尋不分大小寫比對 title、content、note、tags 任一欄位，搜尋字非空時忽略主題篩選，否則依 `selectedTopic`（含「未分類」）篩選；新增 `normalizeClauseNote`：空字串或全空白回傳 null，其餘原樣回傳（需求：Search scope covers title, content, note and tags、Sidebar topic filter、Topic and note in the edit form；決策 4：分組與篩選寫成純函式）。驗證：`clauseTopics.test.ts` 新增規格「Matching fields」表格四列、「Search overrides the topic filter」、「Select a topic」、「Blank note is stored as null」對應測試，先失敗後通過。[after: 2.1]

## 3. 條文庫頁面

- [x] 3.1 `useClauses` 改用主題：`Clause` 介面加 `topic: ClauseTopic | null`、`note: string | null`；`selectedCategory` 改名 `selectedTopic`，`filteredClauses` 改呼叫 `filterClauses`，新增依主題計數供側欄使用，移除 `tagsByCategory` 與 `分類::標籤` 解析；`handleSaveClause` 寫入前以 `normalizeClauseNote` 處理備註（需求：Sidebar topic filter、Topic and note in the edit form；決策 5：側欄每個主題一個項目，選取值改為主題名）。驗證：`yarn tsc --noEmit` 無錯誤，且全專案搜尋不再出現 `tagsByCategory`。[after: 2.2]
- [x] 3.2 新增 `src/components/features/clauses/ClauseTopicList.tsx` 接收 `groupClausesByTopic` 結果，渲染各主題段落（段標題含主題名與條數）與 `ClauseItem`；`page.tsx` 以它取代原本「基本特約／增補特約」兩段渲染，側欄改為單一「主題」群組，項目為有條文的主題與「未分類」並帶條數，點選設定 `selectedTopic`（需求：Clauses grouped by topic、Sidebar topic filter；決策 5：側欄每個主題一個項目，選取值改為主題名；決策 6：抽出元件以守住行數上限）。驗證：`yarn tsc --noEmit` 通過；`page.tsx` 行數不超過 230、`ClauseTopicList.tsx` 不超過 150（`wc -l`）；登入後手動確認段落順序與側欄篩選，結果記於任務 4.2。[after: 3.1]
- [x] 3.3 `ClauseItem` 在 `note` 非 null 時於標題下方以次要文字樣式顯示備註（含 `dark:` 深色樣式），並顯示基本特約／增補特約標記；複製按鈕仍只複製 `content`（需求：Note shown on the clause card、Clauses grouped by topic）。驗證：`yarn tsc --noEmit` 通過；檢視 `handleCopy` 呼叫仍只傳入 `clause.content`；登入後手動確認備註顯示與複製內容，記於任務 4.2。[after: 3.1]
- [x] 3.4 自 `ClauseEditModal.tsx` 抽出標籤輸入區為 `ClauseTagField.tsx`，再在表單加入主題 `<select required>`（選項取自 `CLAUSE_TOPICS`，未選時值為空字串而無法送出）與選填備註 `<textarea>`（需求：Topic and note in the edit form；決策 2：topic 允許 null，UI 強制必填；決策 6：抽出元件以守住行數上限）。驗證：`yarn tsc --noEmit` 通過；`ClauseEditModal.tsx` 行數不超過 184；登入後手動確認未選主題按儲存會被瀏覽器必填提示擋下，記於任務 4.2。[after: 3.1]

## 4. 驗證與上線

- [x] 4.1 執行 `yarn tsc --noEmit`、`yarn test --testPathPatterns "clauseTopics|exportClausesToHTML"`、`yarn eslint` 改動的 clauses 相關檔與 `clauseTopics.ts`，全部無錯誤；輸出摘要記錄於本任務下方。[after: 3.2, 3.3, 3.4]
  - 2026-11-17 實跑：`yarn tsc --noEmit` → Done，0 錯誤；`yarn test --testPathPatterns "clauseTopics|exportClausesToHTML|ClauseItem|ClauseEditModal"` → Test Suites 4 passed、Tests 44 passed；`yarn eslint src/lib/constants/clauseTopics.ts src/lib/constants/clauseTopics.test.ts src/components/features/clauses/ src/app/clauses/page.tsx` → 0 問題。
  - TDD 證據：clauseTopics 分組（6 failed→12 passed）、篩選與備註（12 failed→29 passed）、parseTopicGroupKey（2 failed→34 passed）；ClauseEditModal 4 測試先因找不到主題欄位失敗後通過，移除 `required` 的突變使 2 測試失敗；ClauseItem 3 測試以兩個突變（複製含備註、永遠顯示備註）各使 1 測試失敗。
  - 範圍說明：任務 3.1 驗證寫「全專案不再出現 `tagsByCategory`」，但 `exportClausesToHTML.ts`（本 change 不改的匯出）有同名區域變數；實際以 `useClauses.ts`、`page.tsx` 不再出現為準（已確認）。
- [x] 4.2 使用者確認任務 1.1 的 migration 已在正式資料庫執行後，登入 `/clauses` 手動檢查：主題分段順序與條數、側欄選「租賃」只剩租賃段、搜尋「二胎」跨主題、新增條文未選主題無法儲存、有備註的卡片顯示備註且複製不含備註；逐項結果記錄於本任務下方。[after: 1.1, 4.1]
  - 2026-11-17：commit `c754a2a9` 推上 master，Vercel 部署後使用者登入 case-master.com/clauses 逐項檢查，回報五項全部正常：(1) 依 12 主題順序分段並顯示條數 (2) 側欄選「租賃」只剩租賃 13 條 (3) 搜尋「二胎」跨主題列出 (4) 新增條文未選主題按儲存被擋下 (5) 填備註後卡片顯示 💡 備註，複製不含備註。

## 5. 追加需求：全部顯示時基本特約置頂、離線 HTML 匯出改主題版面

> 2026-11-17 上線後使用者追加（ingest）。任務 4.1 範圍說明中「本 change 不改的匯出」已不再成立：匯出改由任務 5.3 納入範圍。

- [x] 5.1 在 `src/lib/constants/clauseTopics.ts` 新增 `buildClauseSections(clauses, selectedTopic)` 與 `ClauseSectionKey` 型別：`selectedTopic` 為 null 時先輸出「基本特約」段（全部基本特約依標題 zh-TW 排序，沒有則不輸出），其餘條文以 `groupClausesByTopic` 分段；選了主題時回傳 `groupClausesByTopic(clauses)`（需求：Clauses grouped by topic；決策 7：全部顯示時基本特約獨立成置頂段）。驗證：先在 `clauseTopics.test.ts` 寫規格「Basic clauses pinned at the top of the full view」「Grouping order with an untopiced clause」與「Ordering inside a selected topic section」的測試並確認實作前失敗，實作後 `yarn test --testPathPatterns clauseTopics` 通過。
- [x] 5.2 `useClauses` 以 `buildClauseSections(filteredClauses, selectedTopic)` 產生 `groupedClauses`，`ClauseTopicList` 改收段落鍵 `ClauseSectionKey`，頁面全部顯示時最上方出現「基本特約」段（需求：Clauses grouped by topic；決策 7：全部顯示時基本特約獨立成置頂段）。驗證：`yarn tsc --noEmit` 通過；使用者在正式站確認全部顯示時基本特約 16 條置頂、選主題時版面不變，結果記於任務 5.4。[after: 5.1]
- [x] 5.3 `exportClausesToHTML` 改用 `buildClauseSections(clauses, null)` 輸出段落，側欄改為段落清單（`data-section` 篩選、「顯示全部」還原），卡片顯示備註、`data-search` 納入備註，並保留全域流水號 id、`escapeHtml`、各卡片自有複製原文（需求：Offline HTML export mirrors the full view；決策 8：離線 HTML 匯出共用分段函式）。驗證：先在 `exportClausesToHTML.test.ts` 新增「Export section order」「Export note is shown and searchable」「Export copy stays exact」測試並確認實作前失敗，實作後 `yarn test --testPathPatterns exportClausesToHTML` 通過且既有 3 個測試仍通過。[after: 5.1]
- [ ] 5.4 執行 `yarn tsc --noEmit`、`yarn test --testPathPatterns "clauseTopics|exportClausesToHTML|ClauseItem|ClauseEditModal"`、`yarn eslint` 改動檔，全部無錯誤；部署後使用者在正式站確認全部顯示時基本特約置頂，並開啟匯出檔確認段落順序、側欄點段落篩選與「顯示全部」、搜尋備註、複製內容正確；結果記錄於本任務下方。[after: 5.2, 5.3]
  - 2026-11-17 自動檢查：`yarn tsc --noEmit` 0 錯誤；`yarn test --testPathPatterns "clauseTopics|exportClausesToHTML|ClauseItem|ClauseEditModal"` → 4 suites、56 tests passed；`yarn eslint`（clauseTopics 兩檔、`src/components/features/clauses/`、`page.tsx`）0 問題。
  - TDD 證據：`buildClauseSections` 4 測試先失敗（stub）後通過；`sectionTopicFor`（搜尋中視同全部顯示）1 測試先失敗後通過；匯出新增 3 測試中 2 個先失敗後通過，「Export copy stays exact」為既有保護，以突變 `seq++`→`items.indexOf(c)` 使 3 測試失敗、還原後通過。既有匯出測試中「側欄 tag-link 含 it's」改為驗卡片 `data-tags`（側欄已不列標籤）。
  - 匯出檔瀏覽器實測（Playwright + Chrome，6 筆樣本資料）：段落順序 基本特約→貸款代償→租賃→屋況瑕疵→未分類、側欄同序含條數、基本特約段依標題排序、點「租賃」只剩租賃段、「顯示全部」還原、搜尋「壓在一起」以備註命中、選租賃時搜尋「二胎」跨段命中、複製剪貼簿為「二胎條文內容」、備註顯示於卡片。
