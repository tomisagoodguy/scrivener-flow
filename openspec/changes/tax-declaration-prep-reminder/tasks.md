## 1. Core Implementation

- [x] 1.1 在 `src/services/caseService.ts` 的 `syncSystemTodos` 方法中，新增輔助函式計算 `seal_date - 3 天` 的日期字串
- [x] 1.2 新增 `tax_prep` 任務：基準 `milestoneData.seal_date` 前 3 天，標題「稅務申報準備（土增稅／契稅等）」，source_key 為 `tax_prep`

## 2. Verification

- [ ] 2.1 更新含用印日的案件，確認待辦出現 `tax_prep` 任務且 due_date 為 `seal_date - 3 天`
- [ ] 2.2 `seal_date` 為 null 時確認任務不生成
- [ ] 2.3 重複 sync 不產生重複任務
