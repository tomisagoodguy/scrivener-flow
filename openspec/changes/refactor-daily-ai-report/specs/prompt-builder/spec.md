# Spec: build_report_prompt — Prompt 純函式

## Overview

`ETF/ai_report/prompt_builder.py` 提供 `build_report_prompt()` 純函式，將 AI Prompt 組裝邏輯從 `generate_report()` 中解耦，使 Prompt 可獨立測試與修改。

## ADDED Requirements

### Requirement: build_report_prompt 函式簽名

`build_report_prompt(holdings_df: DataFrame, stats: dict, technical_map: dict[str, dict], top_holdings: list[dict]) -> str` 必須：

- 接受結構化資料作為輸入，不依賴任何外部狀態
- 回傳完整的 f-string Prompt 字串

### Requirement: Prompt 內容結構

回傳的 Prompt 字串必須包含以下區塊：

1. **ETF 概況區塊**：ETF 代碼、持股數量、平均 YoY/MoM 成長率
2. **前 N 大持股區塊**：股票代碼、名稱、權重、YoY、MoM、技術指標摘要
3. **風險警示區塊**：識別 `isOverheated3M=True` 且 `ma20Trend='Falling'` 的個股
4. **分析要求區塊**：要求 AI 提供投資建議、風險評估、操作策略

### Requirement: 風險警示邏輯

當 `technical_map` 中存在 `isOverheated3M=True` 且 `ma20Trend='Falling'` 的個股時，Prompt 必須明確列出這些股票並要求 AI 特別說明風險。

## Scenarios

#### Scenario: 正常輸出

- **WHEN** `build_report_prompt()` 被呼叫，`technical_map` 含有 5 支股票資料
- **THEN** 回傳非空字串，包含所有必要區塊

#### Scenario: 風險警示觸發

- **WHEN** `technical_map` 中有股票 `isOverheated3M=True` 且 `ma20Trend='Falling'`
- **THEN** Prompt 中包含該股票代碼的風險警示文字

#### Scenario: 無持股資料

- **WHEN** `top_holdings` 為空 list
- **THEN** 回傳有效 Prompt（不崩潰），持股區塊顯示「無資料」
