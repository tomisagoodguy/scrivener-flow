## Context

研究腳本（2026-11-03，FinLab，期間 2008-01-02～2026-08-03）已重現外部研究的融資創高統計；數字見 proposal。現有 `TaiexMa60RegimeStep` + `taiex_ma60_regime_daily` + `getTaiexRegime` + `TaiexRegimeCard` 已建立「pipeline 每日算狀態與全歷史統計 → 前端卡片」的模式，本變更照抄其結構。

資料來源（FinLab）：`margin_balance:融資券總餘額`（上市融資交易金額＋上櫃融資交易金額，單位元）、`taiex_total_index:收盤指數`／`最低指數`。

範圍曾包含 `margin_position` 風險徽章；apply 時發現研究把 2009 年前無個股融資資料的日子當成「不成立」，排除後四種參數差距區間全部跨零，前提被推翻，經使用者決定移除（2026-11-03）。

## Goals / Non-Goals

**Goals:**

- 頁面每天顯示融資是否創一年新高，以及「融資創高後 vs 平常日」在歷史上 60 日內跌一成的比例與差距區間。
- 數字每天由 pipeline 重算，頁面不寫死。

**Non-Goals:**

- 不顯示 `margin_position` 或任何融資趨勢徽章（驗證不顯著）。
- 不加外資條件（研究顯示外資賣／買兩組差距區間跨零）。
- 不改既有融資融券走勢圖本身。

## Decisions

### 統計口徑沿用研究腳本

- 融資創一年新高：當日融資金額 ≥ 含當日過去 250 個交易日最大值（需滿 250 日）。
- 指數近一年高點：當日收盤 ≥ 250 日最高收盤 × 0.97。
- 跌一成：之後第 1～60 個交易日的加權指數盤中最低 ≤ 當日收盤 × 0.9。60 日報酬：第 60 個交易日收盤 ÷ 當日收盤 − 1。
- 樣本 2008-01-01 起，只納入有完整 60 日前瞻資料的日子；條件無法計算的日子（不滿 250 日）從所有組別排除，不併入「不成立」。
替代方案：用融資張數或半年新高——研究註明結論相同，只取金額與一年避免頁面過載。

### 區塊重抽共用 bootstrap_excess

`ETF.analysis.buying_pattern_stats.bootstrap_excess` 接受任意可排序的區塊鍵；本變更傳入 `(年, 月)` 作區塊、跌一成以 1.0／0.0 作值，「超額報酬」即比例差。種子與次數沿用（20261101、5,000）。只更新 docstring 說明區塊鍵通用，不改行為。
替代方案：另寫月區塊版本——否決，違反單一實作。

### 今日狀態與統計分開

每日一列：`date`、`margin_balance`（億元）、`margin_1y_high`、`index_near_high`、`stats` jsonb。`stats` 結構：`{"margin_high": G, "all": G, "index_high_only": G, "diff": {"margin_high_vs_all": CI, "margin_high_vs_index_high_only": CI}, "shadow": {"margin_high": r, "all": r}, "sample_start", "sample_end"}`，其中 `G = {"n", "dd10_rate", "mean_ret60"}`、`CI = {"lo", "hi"}` 或 null（樣本不足時）、`r` 為指數近一年高點的比例。

### 卡片放在融資圖下方、只用中性配色

`MarginRegimeCard` 放在同一個「融資融券餘額走勢」區塊內。融資創一年新高用灰色資訊標籤（不是訊號，不用紅綠）。結論句的措辭由區間決定：跨零＝「分不出高低」，下界 > 0＝「顯著較高」，上界 < 0＝「顯著較低」。

## Implementation Contract

**行為**

- 每日 pipeline 後 `market_margin_regime_daily` 有當日一列；頁面卡片顯示該列。
- 卡片內容：日期、融資餘額（億）、「融資創一年新高」灰色標籤（若是）；對照表列出「融資創一年新高／指數創高但融資沒創高／平常日」三組的樣本數、60 日內跌一成比例、60 日平均報酬；結論句附 `margin_high_vs_all` 區間與措辭；影子句「融資創高的日子 X% 指數離一年高點不到 3%（平常 Y%）」；底部註明樣本期間與「歷史統計，非預測或投資建議」。

**介面**

- `compute_margin_frame(margin, close, low) -> pd.DataFrame`
- `compute_margin_stats(frame) -> dict`（上述 `stats` 結構）
- `build_margin_record(frame, target, stats) -> dict`
- TS：`getMarginRegime(): Promise<MarginRegime | null>`；`describeDiff(ci) -> 'higher' | 'lower' | 'indistinguishable' | 'insufficient'`

**失敗模式**

- 步驟任一環節失敗：`logger.error`，不 raise，不寫入（保留前一日列）。
- Action 查詢失敗：`unstable_cache` 內 throw、外層回 null；卡片顯示「融資狀態尚未更新」。

**驗收**

- `uv run pytest ETF/tests/test_margin_regime.py` 通過，含以 fixture `ETF/tests/fixtures/margin_regime_20080101_20261102.csv` 重算的對帳：融資創一年新高 588 天、跌一成比例 13.8% vs 平常日 20.1%、指數創高但融資沒創高 196 天 10.2%、影子 93.5% vs 40%（比例允許 ±0.5 pp）。
- `yarn test --testPathPatterns "marginRegime|MarginRegimeCard"` 通過；`yarn tsc --noEmit` 0 錯；eslint 改動檔 0 錯。
- 本機實跑步驟寫入 production 一列，頁面實跑確認卡片。

**範圍**

- 範圍內：步驟、純函式、資料表、Action、卡片、頁面掛載、文件。
- 範圍外：`margin_position`、GA 條件池、外資條件、走勢圖本身、其他頁面。

## Risks / Trade-offs

- [歷史只有一段樣本、事件高度自相關] → 月份區塊重抽，卡片明寫「歷史統計」，結論以區間是否跨零表達。
- [融資金額口徑依賴 FinLab `margin_balance`] → 對帳測試鎖住數字；與既有 `market_margin_daily`（TWSE 仟元）口徑不同，卡片只用自己的欄位，不與圖混算。
