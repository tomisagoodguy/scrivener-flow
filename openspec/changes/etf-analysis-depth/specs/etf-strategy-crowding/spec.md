# Spec: ETF Strategy Crowding

## Purpose

計算 5 大量化策略選股之間的重疊度（Jaccard 相似度），讓使用者在採用多策略選股時，能識別「眾策略同時看中同一批股票」的擁擠風險，避免過度集中。

---

## ADDED Requirements

### Requirement: getStrategyCrowding Server Action 即時計算策略重疊矩陣

`src/app/actions/getStrategyCrowding.ts` 的 `getStrategyCrowding(date?: string)` SHALL 查詢指定日期（預設今日）的 `strategy_signals`（`is_selected = TRUE`），計算 5 × 5 Jaccard 相似度矩陣後回傳。

Jaccard(A, B) = |A ∩ B| / |A ∪ B|，值域 0–1。

#### Scenario: 策略選股有重疊

- **WHEN** 策略 A 選出 [2330, 2454, 3008]，策略 B 選出 [2454, 3008, 2382]
- **THEN** Jaccard(A, B) = 2/4 = 0.5，矩陣中對應格為 0.5

#### Scenario: 無重疊

- **WHEN** 兩個策略選出的股票完全不同
- **THEN** Jaccard = 0.0

#### Scenario: 完全相同

- **WHEN** 兩個策略選出完全相同的股票
- **THEN** Jaccard = 1.0

#### Scenario: 指定日期無資料

- **WHEN** 指定日期的 `strategy_signals` 無 `is_selected = TRUE` 的記錄
- **THEN** 回傳空矩陣（所有值為 null），前端顯示「本日無策略訊號」

---

### Requirement: 前端策略頁顯示重疊熱力圖

`/investment/strategy` 頁面 SHALL 在現有策略訊號表格下方，新增「策略重疊矩陣」區塊，以 5 × 5 熱力圖呈現各策略對之間的 Jaccard 相似度。

#### Scenario: 高度重疊（Jaccard ≥ 0.6）

- **WHEN** 兩策略的 Jaccard ≥ 0.6
- **THEN** 對應格顯示深紅色背景（高擁擠警告）

#### Scenario: 中度重疊（0.3 ≤ Jaccard < 0.6）

- **WHEN** 兩策略的 Jaccard 在 0.3–0.6 之間
- **THEN** 對應格顯示淺橙色背景

#### Scenario: 低度重疊（Jaccard < 0.3）

- **WHEN** 兩策略的 Jaccard < 0.3
- **THEN** 對應格顯示中性（白/淺灰）背景

#### Scenario: 對角線（自身 vs 自身）

- **WHEN** 矩陣對角線格（策略 A vs 策略 A）
- **THEN** 顯示 1.0 但以灰色斜線標示，不計入擁擠評估

---

### Requirement: 高擁擠股票清單

`/investment/strategy` 頁面 SHALL 在熱力圖下方顯示「高擁擠股票」清單：被 3 支（含）以上策略同時選中的股票，依選中策略數降序排列。

#### Scenario: 某股被 4 策略同時選中

- **WHEN** 股票 2330 在今日被 super8888、capital_layer、broker_ranked、low_vol_alpha 四個策略均選中
- **THEN** 列表中顯示「2330 ★★★★」（4 顆星），並標示「高擁擠」警告

#### Scenario: 無高擁擠股票

- **WHEN** 當日沒有任何股票被 3 支以上策略同時選中
- **THEN** 顯示「目前無高擁擠股票」
