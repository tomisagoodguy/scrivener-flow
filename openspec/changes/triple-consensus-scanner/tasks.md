## 1. 型別定義

- [ ] 1.1 在 `src/types/index.ts` 新增 `ConsensusSignal` interface

## 2. Server Action

- [ ] 2.1 新增 `src/app/actions/getConsensusSignals.ts`，平行查詢 etf_diff_logs + strategy_signals（fund_momentum + 5 種量化策略），合併三重共識計分

## 3. 頁面元件

- [ ] 3.1 新增 `src/app/investment/consensus-signal/page.tsx`（Server Component，呼叫 getConsensusSignals）
- [ ] 3.2 新增 `src/app/investment/consensus-signal/components/ConsensusSummaryCards.tsx`（三重/雙重/單一數量摘要）
- [ ] 3.3 新增 `src/app/investment/consensus-signal/components/ConsensusTable.tsx`（可排序表格，含共識層數、ETF 來源 tags、策略命中 badges）

## 4. 導覽

- [ ] 4.1 在 `src/app/investment/layout.tsx` 的 `moreGroup` 加入「共識掃描」連結（`/investment/consensus-signal`）

## 5. 驗證

- [ ] 5.1 開啟 `/investment/consensus-signal` 確認三重共識資料正確顯示
- [ ] 5.2 確認篩選排序正常運作
