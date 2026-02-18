# Spec: daily_ai_report.py — 精簡入口點

## Overview

重構後的 `ETF/daily_ai_report.py` 僅作為 CLI 入口點，所有業務邏輯已遷移至 `ETF/ai_report/` 子模組。

## MODIFIED Requirements

### Requirement: 入口點精簡

重構後的 `ETF/daily_ai_report.py` 必須：

- **行數 < 40 行**
- 只包含以下內容：
  1. `sys.path` 設定（確保模組可被正確 import）
  2. `argparse` 解析（`--dry-run` flag）
  3. `AIReporter` 初始化與 `run()` 呼叫
- 不包含任何函式定義（`fetch_*`、`analyze_*`、`generate_report` 等均已移除）

### Requirement: CLI 介面向後相容

CLI 介面必須保持不變：

- `python ETF/daily_ai_report.py` — 正常執行，發送 LINE 通知
- `python ETF/daily_ai_report.py --dry-run` — Dry run 模式，印出報告前 200 字

## REMOVED Requirements

### Requirement: 巨石函式定義

**Reason**: 所有函式已遷移至 `ETF/ai_report/` 子模組

## Scenarios

#### Scenario: 正常執行

- **WHEN** `uv run python ETF/daily_ai_report.py` 被執行
- **THEN** 無 import 錯誤，流程正常啟動

#### Scenario: dry-run 執行

- **WHEN** `uv run python ETF/daily_ai_report.py --dry-run` 被執行
- **THEN** 印出 `[Dry Run Report Output]` 與報告前 200 字，不發送 LINE 通知

#### Scenario: 行數限制

- **WHEN** 檢查 `daily_ai_report.py` 行數
- **THEN** 行數 < 40
