## 1. useBlinkingBadge hook

- [x] 1.1 在 `src/components/chat/hooks/useBlinkingBadge.ts` 實作 `useBlinkingBadge(unread: number)` 狀態機，涵蓋 Unread badge blinking state（新未讀觸發閃爍）、Displayed count persists after read（已讀後數字凍結不變）、Blinking resumes on new unread message after read（已讀後新訊息恢復閃爍）、Zero-count badge stays hidden（從未有未讀時不顯示）四項需求；依 design.md「用 displayCount/isBlinking 狀態機取代直接綁定 unread」決策，已讀事件後任何 `unread > 0` 皆視為新未讀（重置判斷基準為 0）。驗證：hook 回傳型別為 `{ displayCount: number; isBlinking: boolean }`，可被下游元件匯入使用。
- [x] 1.2 撰寫 `useBlinkingBadge.test.ts` 單元測試，涵蓋 design.md Implementation Contract 的 5 個 acceptance criteria 情境（初始 0 不顯示、0→3 觸發閃爍、已讀後凍結為 3 且停止閃爍、已讀後再收到 2 則更新為 2 並恢復閃爍、連續遞增 3→5 持續閃爍）。驗證：`yarn test --testPathPatterns useBlinkingBadge` 全數通過。

## 2. 閃爍動畫 CSS

- [x] [P] 2.1 依 design.md「動畫用自訂 CSS 變數而非 Tailwind 內建 animate-pulse」決策，於 `src/app/globals.css` 新增 `@keyframes blink-badge`（0%/100% opacity 1、50% opacity 0.35）與 `--animate-blink-badge: blink-badge 3s ease-in-out infinite;`，比照既有 `--animate-pulse-slow` 定義慣例，供元件以 `className="animate-blink-badge"` 套用。驗證：`yarn build` 成功，且 `globals.css` 內可 grep 到 `animate-blink-badge` 定義。
- [x] [P] 2.2 依 design.md「深色模式覆寫比照既有 `.bg-red-500.animate-pulse` 規則」決策，於 `src/app/dark-theme.css` 新增 `html.dark .bg-red-500.animate-blink-badge` 深色模式覆寫規則，使用相同底色/文字色（`#7f1d1d` / `#fca5a5`），避免地毯式 `!important` 規則蓋掉閃爍 badge 顏色。驗證：手動切換深色模式，確認閃爍 badge 底色與文字對比正確，不被預設樣式覆蓋。

## 3. 元件整合

- [x] [P] 3.1 修改 `src/components/chat/ConversationList.tsx`，每個對話項目改用 `useBlinkingBadge` 取得 `displayCount`/`isBlinking`，未讀數字顯示 `displayCount`，`isBlinking` 為真時套用 `animate-blink-badge` class，取代目前直接綁定 `unread` 的顯示邏輯。驗證：手動測試——兩個瀏覽器分頁模擬互傳訊息，確認收訊方對話項目 badge 於新訊息到達時閃爍，開啟對話（觸發已讀）後數字不變但停止閃爍，符合 spec.md「Displayed count persists after read」情境。
- [x] [P] 3.2 修改 `src/components/layout/ChatHeaderButton.tsx`，彙總所有對話的 `useBlinkingBadge` 結果：只要任一對話 `isBlinking` 為真，header badge 即套用 `animate-blink-badge`；顯示數字為所有對話 `displayCount` 加總，實作 Header aggregate badge reflects any blinking conversation 需求。驗證：手動測試比照 spec.md「mixed conversation states」範例表（A 閃爍中 displayCount=2、B 已讀凍結 displayCount=3、C 從未未讀 displayCount=0），確認 header badge 顯示「5」且處於閃爍狀態。

## 4. 整體驗證

- [x] 4.1 執行完整測試套件確認無回歸。驗證：`yarn test` 全數通過，包含新增的 `useBlinkingBadge.test.ts`。
- [x] 4.2 執行 `yarn tsc --noEmit` 確認型別正確、`yarn lint` 無新增錯誤。驗證：兩指令皆以 exit code 0 結束。
