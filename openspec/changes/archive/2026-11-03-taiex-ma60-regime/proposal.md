## Why

市場常見說法「季線往上時第一次跌破都會反彈」，但一波行情裡的第 N 次跌破與第一次跌破，歷史表現不同。用 FinLab 加權指數（1999-01 ~ 2026-10-16）實測（實測，腳本 scratchpad/ma60_break_verify.py）：

- 季線上揚、跌破前連續 ≥40 交易日站上的「第一次跌破」共 42 次，20 交易日後中位數 +2.13%、28 次上漲、34 次在 20 日內曾站回季線。
- 季線上揚、但站上不到 40 日就「再跌破」共 91 次，20 日後中位數 +1.09%。
- 不限季線方向的再跌破共 133 次，20 日後中位數 +0.81%，與全部收黑日（+0.96%）沒有差別。

目前 `/investment/breadth` 只顯示騰落指標，使用者看不到「今天大盤處在哪一類季線事件、該類事件歷史上怎麼走」，容易拿第一次跌破的統計說服自己。本變更把這個分類與對應歷史統計做成每日資料與頁面卡片。

## What Changes

- 新增 pipeline 輔助步驟 `TaiexMa60RegimeStep`：每日以 FinLab `taiex_total_index:收盤指數` 與 `taiex_total_index:最低指數` 計算加權指數 60 日季線、季線 20 日斜率、連續站上天數、當日跌破分類、本波跌破次數、下一交易日跌破門檻，以及三類跌破事件與收黑日基準的歷史統計。
- 新增資料表 `taiex_ma60_regime_daily`（每日一列，統計存 jsonb），公開讀取。
- 新增 Server Action `getTaiexRegime()` 與 `/investment/breadth` 頁面的「大盤季線狀態」卡片：顯示狀態徽章、站上天數、本波第幾次跌破、下一交易日跌破門檻與其歸類，以及該類事件的歷史統計與收黑日基準對照，並標示「歷史統計，非預測或投資建議」。

## Non-Goals

- 不做個股層級的季線狀態（裸K快照），留待後續 change。
- 不把狀態接進量化策略做濾網或部位調整。
- 不做歷史狀態走勢圖；頁面只顯示最新一筆。
- 不發 LINE 通知。
- 不在頁面計算信賴區間或重抽樣（bootstrap）。

## Capabilities

### New Capabilities

- `taiex-ma60-regime`: 加權指數季線跌破事件分類、每日狀態與歷史統計的計算、儲存與在大盤廣度頁的呈現

### Modified Capabilities

(none)

## Impact

- ETF/pipeline/steps/taiex_ma60_regime_step.py（新增：純函式計算 + 輔助步驟）
- ETF/pipeline/orchestrator.py（在 SyncAdlStep 之後註冊新步驟）
- ETF/tests/test_taiex_ma60_regime_step.py（新增：純函式單元測試）
- supabase/migrations/20261101120100_add_taiex_ma60_regime_daily.sql（新增資料表與公開讀取 RLS）
- src/app/actions/getTaiexRegime.ts（新增 Server Action）
- src/app/investment/breadth/components/TaiexRegimeCard.tsx（新增卡片元件）
- src/app/investment/breadth/page.tsx（加入卡片）
- ETF/CLAUDE.md（Pipeline 步驟順序與前端資料依賴補一行）
