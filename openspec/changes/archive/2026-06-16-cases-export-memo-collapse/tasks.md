## 1. 收合狀態的螢幕＋列印隱藏樣式（htmlExport.ts，TDD）

- [x] 1.1 先在 src/lib/cases/__tests__/htmlExport.test.ts 補單元測試（先紅），鎖定設計決策「收合的顯示隱藏由 CSS class 同時覆蓋螢幕與列印」：斷言 buildCasesHtml 輸出的 INLINE_CSS 含 `.memo-block.export-collapsed` 並設 `display: none`（使收合區塊在螢幕與 @media print 皆不顯示），且文件仍自包含（無 `src="http`、`href="http`、`@import`）；以 yarn test 驗證為紅
- [x] 1.2 依設計決策「收合的顯示隱藏由 CSS class 同時覆蓋螢幕與列印」，在 src/lib/cases/htmlExport.ts 的 INLINE_CSS 加入 `.memo-block.export-collapsed { display: none; }`（置於螢幕區段使其同時於螢幕與列印生效，不需在 @media print 重複），使 1.1 測試轉綠；不改其他螢幕樣式與既有列印規則

## 2. 逐張卡片收合鈕、套用、持久化（exportInteractive.ts，TDD）

- [x] 2.1 先在 src/lib/cases/__tests__/exportInteractive.test.ts 補單元測試（先紅），鎖定設計決策「收合切換鈕由互動層注入並帶 export-ui，鈕本身列印時不出現」「收合狀態以實際內容節點的 class 表示，而非只藏 export-ui 控制鈕」「收合狀態存入既有 state.collapsed 並隨 #export-state 持久化」：斷言（a）互動層注入後每個 .memo-block 內含 button.export-memo-collapse 且帶 export-ui class；（b）對某 .memo-block 觸發收合鈕後，該 .memo-block 取得 export-collapsed class 且 #export-state 的 `collapsed["caseId|blockType"]` 為 true，再次觸發則移除 class 並清除該鍵；（c）以 #export-state 預設帶某 collapsed 鍵初始化時，對應 .memo-block 初始即帶 export-collapsed；blockType 由 memo-warning/pending/private 對應 warning/pending/private；以 yarn test 驗證為紅
- [x] 2.2 依設計決策「收合切換鈕由互動層注入並帶 export-ui，鈕本身列印時不出現」「收合狀態以實際內容節點的 class 表示，而非只藏 export-ui 控制鈕」「收合狀態存入既有 state.collapsed 並隨 #export-state 持久化」，在 src/lib/cases/exportInteractive.ts：state 物件新增 collapsed（預設 {}）；新增建立收合鈕的函式，對每個 .memo-block 注入 button.export-ui.export-memo-collapse（展開時文字「收合」、收合時「展開」），由 .memo-block 的 memo-warning/pending/private class 推導 blockType；點擊時切換對應 .memo-block 的 export-collapsed class、更新 state.collapsed 鍵（caseId|blockType）並重繪鈕文字；初始化流程從 state.collapsed 還原套用到對應 .memo-block 與鈕文字；在現有 toolbar 建立流程（buildItemControls/buildMemoControls 等同層）呼叫新函式；確保 downloadAssigned 既有「剝除 export-ui＋序列化 state」流程能涵蓋新的收合鈕與 collapsed 欄位；使 2.1 測試轉綠

## 3. 全域分類開關（exportInteractive.ts，TDD）

- [x] 3.1 先在 src/lib/cases/__tests__/exportInteractive.test.ts 補單元測試（先紅），鎖定設計決策「全域分類開關以批次套用逐張收合實作，不另立狀態」：斷言（a）互動層注入後備忘錄區頂部有三個 button.export-memo-collapse-all，各帶 export-ui class 與 data-block-type（warning/pending/private）；（b）點某類全域鈕後，所有含該類 .memo-block 的卡片皆取得 export-collapsed 且 state.collapsed 各對應鍵為 true；（c）當該類已全部收合時再點全域鈕則全部展開（移除 class、清鍵）；（d）全域收合某類後以逐張鈕單獨展開一張卡片該類，再點全域該類會把剩餘展開者一併收合（方向由現況推導）；以 yarn test 驗證為紅
- [x] 3.2 依設計決策「全域分類開關以批次套用逐張收合實作，不另立狀態」，在 src/lib/cases/exportInteractive.ts 新增建立全域開關的函式：於備忘錄區頂部注入 div.export-ui 容器，內含三個 button.export-ui.export-memo-collapse-all（各帶 data-block-type）；點擊時列舉全部含該類 .memo-block 的卡片，依現況推導方向（尚有展開者→全收，否則全展），批次更新 state.collapsed 的 per-card 鍵並套用/移除 export-collapsed class，再依 state.collapsed 重繪逐張鈕與全域鈕文字；不新增 state 結構欄位（僅寫既有 collapsed per-card 鍵）；在現有 toolbar 建立流程呼叫新函式；使 3.1 測試轉綠

## 4. 驗證

- [x] 4.1 執行 yarn test -- --testPathPatterns="htmlExport|exportInteractive" 全綠（確認螢幕、列印、逐張收合、全域開關、持久化無回歸），並對 src/lib/cases/htmlExport.ts、src/lib/cases/exportInteractive.ts 與兩個對應測試檔執行 yarn eslint 通過
