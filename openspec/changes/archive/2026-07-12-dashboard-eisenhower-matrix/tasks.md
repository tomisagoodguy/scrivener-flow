## 1. 資料層與型別

- [x] 1.1 [P] 依 design「保存位置：user_settings 新增 eisenhower_matrix JSONB 欄位」新增 `supabase/migrations/20260711120000_add_eisenhower_matrix.sql`，內容為 ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS eisenhower_matrix JSONB DEFAULT '{}'::jsonb。完成行為：migration 檔可重複執行（IF NOT EXISTS 冪等）。驗證：內容審閱確認冪等且僅動 user_settings 一欄，不含任何 DROP。
- [x] 1.2 [P] 定義單一事實來源型別 `EisenhowerQuadrant = 'q1' | 'q2' | 'q3' | 'q4'` 與 `EisenhowerMatrixData = { placements: Record<string, EisenhowerQuadrant>; labels: Partial<Record<EisenhowerQuadrant, string>> }`（放 `src/components/dashboard/eisenhower/types.ts`），並在 `src/types/supabase.ts` 的 user_settings 型別補 `eisenhower_matrix` 欄位。完成行為：全案不出現 `any`，型別可被 Server Action 與 hook 共用。驗證：`yarn tsc --noEmit` 通過。

## 2. Server Action 讀寫

- [x] 2.1 依 design「資料流：Client hook 聚合 + Server Action 讀寫」實作 `src/app/actions/eisenhowerActions.ts`：`getEisenhowerMatrix()` 於無列或欄位為空時回傳 `{ placements: {}, labels: {} }`；`saveEisenhowerMatrix(data)` 以 upsert（onConflict: user_id）只覆寫 eisenhower_matrix 欄位並回傳 `{ success, error? }`，失敗回明確錯誤不靜默。完成行為：per-user 讀寫受既有 RLS 保護（用 server.ts client，不用 service.ts）。驗證：`yarn tsc --noEmit` 通過 + 程式碼審閱確認無 service.ts import、無空 catch。

## 3. 名片邏輯與 Hook

- [x] 3.1 [P] 實作名片展開純函式 `deriveChips(cases)`：滿足 spec Requirement「Homepage renders an Eisenhower matrix aggregating party names from active cases」——只納入未結案案件、每個非空 buyer_name/seller_name 產一張名片，識別鍵依 design「名片識別鍵：caseId 加角色組成穩定 key」為 `{case_id}:buyer` / `{case_id}:seller`。驗證：Jest 測試（`src/components/dashboard/eisenhower/__tests__/deriveChips.test.ts`）覆蓋空 seller_name、已結案案件排除兩情境，`yarn test --testPathPatterns eisenhower` 綠燈。
- [x] 3.2 [P] 實作失效清理純函式 `prunePlacements(placements, chipKeys)`：滿足 spec Requirement「Stale placements are pruned when their source chip no longer exists」與 design「失效清理：載入時以現存名片鍵集合過濾 placements」——回傳只保留現存鍵的新 placements，不改案件資料。驗證：Jest 測試覆蓋 spec Example（{A:buyer,B:seller} 過濾成 {A:buyer}）綠燈。
- [x] 3.3 實作 `useEisenhowerMatrix.ts` hook：載入案件與矩陣設定、套用 prunePlacements、拖放/選單移動時樂觀更新並防抖 800ms 呼叫 saveEisenhowerMatrix、保存失敗以 useNotification 顯示錯誤且名片停留原位（覆蓋 spec Scenario「Save failure keeps optimistic position and surfaces an error」）。完成行為：桌機與行動 fallback 共用同一 state 更新路徑。驗證：`yarn tsc --noEmit` 通過 + hook 邏輯的 Jest 測試綠燈。

## 4. UI 元件與首頁掛載

- [x] 4.1 [P] 實作 `PersonChip.tsx`：名片顯示姓名、買/賣角色徽章、案件簡稱，點姓名導向 `/cases/[id]`；依 design「拖曳實作：原生 HTML5 Drag and Drop 不加套件」設 draggable + onDragStart 寫入識別鍵，並提供行動裝置象限選單 fallback。完成行為：滿足 spec Requirement「Chips are placed into quadrants by the user via drag and drop and persist per user」的名片端行為。驗證：元件 ≤150 行、`yarn tsc --noEmit` 通過、手動拖曳可觸發 onDrop。
- [x] 4.2 [P] 實作 `QuadrantCell.tsx`：onDragOver/onDrop 接收名片；標題就地編輯、blur 保存、清空恢復預設——滿足 spec Requirement「Quadrant titles are user-editable with Eisenhower defaults」（預設：重要且緊急/重要不緊急/緊急不重要/不重要不緊急）。驗證：Jest 測試覆蓋標題 fallback（labels 缺鍵回預設）綠燈、元件 ≤150 行。
- [x] 4.3 實作 `EisenhowerMatrix.tsx` 容器（`.glass-card`、上方待分類橫列 + 下方 2×2 象限格、無未結案案件時顯示空狀態文字）並在 `src/components/dashboard/WorkDashboard.tsx` 掛載於 PipelineView（未來 7 日預告）下方、TodoContainer（智慧待辦中心）上方（2026-07-11 使用者指定位置，原 page.tsx 掛載已移除）。完成行為：登入後首頁出現矩陣區塊於指定位置，空狀態不出現錯位空象限。驗證：`yarn dev` 實際開 `/` 目視確認兩種狀態（有/無案件）。

## 5. 整體驗證

- [x] 5.1 全套品質關卡：`yarn tsc --noEmit`、`yarn lint`、`yarn test --testPathPatterns eisenhower` 全數通過，且 `yarn build` 成功。驗證：貼上各指令輸出結尾為證。
- [x] 5.2 手動端到端驗證（本地 `yarn dev`）：拖曳名片到 q2 → 重新整理 → 位置保留（持久化）；改象限標題 → 重整保留；清空標題回預設；＋新增象限 → 重整保留；刪除含名片的象限 → 名片退回待分類；點名片導向 `/cases/[id]`；深色模式下矩陣可讀（不新增 `!important`）。驗證：逐項勾稽 spec 全部五個 Requirement 的 Scenario 並回報結果。

## 6. 需求變更：一案一卡（2026-07-11 ingest）

- [x] 6.1 依 design「名片識別鍵：以 caseId 為穩定 key（一案一卡）」重構 `chipUtils.ts` 的 `deriveChips` 與 `types.ts` 的 `PersonChipData`：每個未結案且至少一方姓名非空的案件產一張名片（key = `{case_id}`，含 `buyerName`/`sellerName`，`caseNumber` 僅供 tooltip），雙方皆空不產卡。完成行為：符合 spec Requirement「Homepage renders an Eisenhower matrix aggregating party names from active cases」更新後的四列 Example 表。驗證：`deriveChips.test.ts` 與 `useEisenhowerMatrix.test.ts` 改用新 Example 表案例後 `yarn test --testPathPatterns eisenhower` 綠燈。
- [x] 6.2 `PersonChip.tsx` 卡面改為並列買賣雙方姓名（各帶買/賣標記、缺一方只顯示另一方），移除卡面上的 case_number 文字（案號僅保留 hover tooltip），點擊姓名仍導向 `/cases/[id]`。完成行為：卡面不出現物件編號。驗證：元件 ≤150 行、`yarn tsc --noEmit` 通過、eslint 變更檔零問題。
- [x] 6.3 一案一卡重構後品質關卡重跑：`yarn tsc --noEmit`、`yarn test --testPathPatterns eisenhower`、`yarn build` 全數通過。驗證：貼上各指令輸出結尾為證。

## 7. 需求變更：使用者自管象限 zones（2026-07-11 第二次 ingest）

- [x] 7.1 依 design「自訂象限：zones 清單存同一 JSONB（2–8 格，使用者自管）」改造型別與解析：`types.ts` 定義 `EisenhowerZone`、`EisenhowerMatrixData = { zones, placements }`、`MIN_ZONES/MAX_ZONES/DEFAULT_ZONES`；`parseMatrix` 移入 `chipUtils.ts` 成可測純函式並支援舊格式（無 `zones` 的 `{ placements, labels }` 解讀為預設四象限 + 套用已存標題），placements 值過濾至現存 zone id；`eisenhowerActions.ts` 改用共用 parseMatrix。完成行為：符合 spec Requirement「Users can add and remove zones to customize the matrix layout」的 legacy Example（v1 文件 → q1 標題「今天必聯絡」+ chip A 在 q1）。驗證：parseMatrix 舊格式相容 Jest 測試綠燈 + `yarn tsc --noEmit` 通過。
- [x] 7.2 hook 增加象限管理：`useEisenhowerMatrix` 暴露 `addZone()`（達 MAX_ZONES 拒絕）、`removeZone(zoneId)`（剩 MIN_ZONES 拒絕；同時移除指向該 zone 的 placements → 名片退回待分類）、`renameZone(zoneId, title)`（清空回 fallback：q1–q4 預設詞、自訂象限「新象限」，覆蓋 spec Requirement「Quadrant titles are user-editable with Eisenhower defaults」更新後行為）、`chipsInZone(zoneId)`；載入時 prune 同時過濾失效 chip 鍵與失效 zone id（spec Requirement「Stale placements are pruned when their source chip no longer exists」更新後行為）。驗證：hook Jest 測試涵蓋 addZone 上限、removeZone 下限與名片退回、zone id prune，全綠。
- [x] 7.3 UI 動態象限：`EisenhowerMatrix.tsx` 以 `matrix.zones` 渲染格線並提供「＋新增象限」（8 格時隱藏）；`QuadrantCell.tsx` 改吃 `zone` prop、加刪除鈕（2 格時停用、按下 `window.confirm`）、accent 色依索引循環；`PersonChip.tsx` 選單改列動態 zones。完成行為：新增象限即時出現且重整保留、刪除象限後名片立即出現在待分類。驗證：三元件各 ≤150 行、`yarn tsc --noEmit` 通過、eslint 變更檔零問題。
- [x] 7.4 zones 功能品質關卡：`yarn tsc --noEmit`、`yarn test --testPathPatterns eisenhower`、eslint 變更檔、`yarn build` 全數通過。驗證：貼上各指令輸出結尾為證。

## 8. 需求變更：名片多象限歸屬（2026-07-11 第三次 ingest）

- [x] 8.1 依 design「多象限歸屬：placements 值改為 zone id 陣列（拖曳搬家、選單多選、✕ 退格）」改造資料層：`types.ts` 的 `EisenhowerMatrixData.placements` 改 `Record<string, string[]>`；`parseMatrix` 支援 v2 字串值視為單元素陣列、陣列去重、值過濾至現存 zone id、空陣列項刪除；`prunePlacements` 改為過濾陣列內容並刪除清空的項目。完成行為：符合 spec Requirement「Stale placements are pruned when their source chip no longer exists」更新後 Example（{A:[q1,z999],B:[q4]} → {A:[q1]}）。驗證：parseMatrix/prunePlacements Jest 測試綠燈 + `yarn tsc --noEmit` 通過。
- [x] 8.2 hook 改多象限介面：`moveChip(chipKey, fromZoneId, toZoneId)` 搬家語意（自來源格移出、加入目標格；拖回待分類僅移出來源格）、`toggleZone(chipKey, zoneId)` 勾選切換、`clearZones(chipKey)` 清空歸屬；`chipsInZone` 改陣列包含判斷、`unclassifiedChips` 為無任何歸屬者。完成行為：覆蓋 spec Scenario「Drag between zones moves instead of copies」（q1+q3 拖 q1→q2 得 q2+q3）與「Removing the last membership returns the chip to staging」。驗證：hook Jest 測試涵蓋搬家、多選 toggle、最後一格移除回待分類，全綠。
- [x] 8.3 UI 多象限：`PersonChip.tsx` 拖曳 payload 帶來源格 id、「⋯」選單改勾選式多選（保持開啟、勾號顯示歸屬、含「移回待分類」）、格內實例加「✕ 從此格移除」；`QuadrantCell.tsx` 與 `EisenhowerMatrix.tsx` 的 drop 解析新 payload 並呼叫 `moveChip(chipKey, from, to)`。完成行為：滿足 spec Scenario「Menu multi-select places one chip in several zones」（同卡同時渲染於多格且重整保留）。驗證：元件各 ≤150 行、`yarn tsc --noEmit` 通過、eslint 變更檔零問題。
- [x] 8.4 多象限品質關卡：`yarn tsc --noEmit`、`yarn test --testPathPatterns eisenhower`、eslint 變更檔、`yarn build` 全數通過。驗證：貼上各指令輸出結尾為證。
- [x] 8.5 修復使用者回報「選單勾不了」：(1) 選單開啟時 `PersonChip` 設 `draggable={false}`，避免瀏覽器把勾選點擊誤判為 drag start；(2) 選單狀態提升至 `EisenhowerMatrix`（chipKey + anchor），勾選導致名片搬家時以 `pinChip` 把名片釘在原容器，選單不再因實例 unmount 而消失；下拉選單加 `role="menu"`。完成行為：從待分類勾 q1 後選單仍開啟並可續勾 q2。驗證：`menuInteraction.test.tsx` 回歸測試綠燈（20/20）、`yarn build` 成功。
