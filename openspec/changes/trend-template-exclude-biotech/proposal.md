## Why

trend_template 選股的交易歸因（2018–2026，457 筆已結算交易）顯示生技醫療業 34 筆平均報酬 -2.9%，報酬前 20% 僅 1 筆、後 20% 卻有 10 筆。生技股營收規模小、波動大，股價主要由研發與臨床消息驅動，「營收創高＋價格動能」這類條件對它的預測力偏弱。回測排除生技醫療業後，全期 CAGR 93.8%→101.5%、月 Sharpe 1.71→1.79、MDD -40.9%→-39.1%，2023 年以後 CAGR 57.6%→71.1%，是本輪測試的變體中唯一三項全期指標同時改善者。

## What Changes

- trend_template 在最終選股閘門（成交金額 > 2000 萬、非處置股）加入「產業類別不屬於排除清單」條件，排除清單預設為 `生技醫療業`
- 排除邏輯抽成模組層級純函式，輸入股票代號→產業類別對照與排除清單，輸出布林遮罩，不需 FinLab 即可單元測試
- `StrategyDataCache` 新增產業類別快取屬性（來源 FinLab `company_basic_info` 的「產業類別」欄位），供 pipeline 路徑重用；cache 為 None 時策略自行取得
- 產業資料取得失敗或缺少「產業類別」欄位時，策略 SHALL 記錄錯誤並退回不排除任何產業（等同原版行為），不得中斷其他策略
- 更新 trend_template 模組 docstring 與類別說明，載明產業排除條件

## Non-Goals

- 不調整其他策略（super8888、fan_breakout 等）的選股規則
- 不改 14 個計分條件與 12 分門檻（V1 門檻 13、V3 去 C05/C13 經回測後判定證據不足，不在本次範圍）
- 不建立歷史產業分類（point-in-time）資料；沿用 FinLab 現行分類，接受公司改產業時的回測誤差
- 不改前端、資料庫 schema 或 `strategy_signals` 寫入格式
- 不把排除清單做成環境變數或 DB 設定；以模組常數維護

## Capabilities

### New Capabilities

- `trend-template-industry-exclusion`: trend_template 策略依產業類別排除指定產業（預設生技醫療業）的選股規則、資料來源與失敗退回行為

### Modified Capabilities

(none)

## Impact

- Affected specs: `trend-template-industry-exclusion`（新增）
- Affected code:
  - Modified: ETF/strategies/trend_template.py
  - Modified: ETF/strategies/shared_cache.py
  - New: ETF/tests/test_trend_template_industry_exclusion.py
- 已知限制：此發現屬樣本內（in-sample），排除效果需上線後持續追蹤驗證
