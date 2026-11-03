## Context

`/investment/breadth` 目前只有騰落指標（`market_breadth_daily`，由 `SyncAdlStep` 寫入）與散戶指標卡。`SectorRrgStep` 已經用 FinLab `taiex_total_index:收盤指數` 取加權指數，所以新步驟沿用同一資料源，不新增外部依賴。驗證腳本（scratchpad/ma60_break_verify.py，2026-11-01 實跑）已用 1999-01 ~ 2026-10-16 資料重現外部文章數字，作為本 change 的對帳基準。

## Goals / Non-Goals

**Goals:**

- 每日算出加權指數季線狀態與當日跌破分類，寫入一列。
- 各類跌破事件與收黑日基準的歷史統計隨資料每日重算，不寫死常數。
- 大盤廣度頁顯示狀態卡，數字與驗證腳本一致。

**Non-Goals:**

- 個股季線狀態、策略濾網、LINE 通知、歷史狀態走勢圖、信賴區間。

## Decisions

### 決策 1：每日全歷史重算，只寫當日一列

加權指數 1999 年至今約 6,900 個交易日，向量化計算成本可忽略（估計 < 1 秒，實作時以步驟 log 耗時確認）。每日全量重算可讓統計自動納入新事件，避免常數過期。替代方案「統計寫死在前端常數」被否決：新事件發生後數字會靜默過時。替代方案「每日 upsert 全歷史列」被否決：前端只需最新一列，沒必要每天寫 6,900 列。

### 決策 2：新資料表 taiex_ma60_regime_daily，統計存 jsonb

不擴充 `market_breadth_daily`：該表由兩個步驟（SyncAdlStep、RetailSentimentStep）分欄寫入，再加第三個寫入者會讓欄位歸屬難以追蹤。新表一天一列，主鍵 `date`。統計結構會隨類別擴充，用 jsonb `stats` 存放；狀態欄位用一般欄位方便查詢。

### 決策 3：分類與統計口徑對齊已驗證的研究

- 跌破＝收盤 ≤ 季線且前一日收盤 > 前一日季線；`first_break` 門檻 40 交易日、季線斜率比較 20 交易日前，與驗證腳本相同。
- 「站回季線」採 20 日內任一天收盤站上（34 次），不採第 20 日當天（21 次）。
- 途中最低用盤中最低價（`taiex_total_index:最低指數`），對帳結果中位數 −2.35%、13 次 < −5%。
- 分成三類而不是「第一次／其他」兩類：季線上揚中的再跌破（91 次，+1.09%）和不限方向的再跌破（133 次，+0.81%）差距明顯，混在一起會誇大第一次跌破的優勢。

### 決策 4：本波跌破次數從最近一次 first_break 起算

文章的「第六次」從 7/17 的第一次跌破起算。規則簡單且可重現；代價是季線轉折但沒有新的長站上期時，計數會一直累加，卡片會同時顯示季線方向讓讀者自行判斷。

### 決策 5：前端只讀最新一列，Server Action 以 unstable_cache 包裝

沿用 `getAdlData()` 模式：`getPublicClient()` 讀取、`unstable_cache` 3600 秒。查詢失敗在快取函式內 throw，外層 catch 回傳 null，避免一次失敗被快取一小時。

## Implementation Contract

**行為**：pipeline 每日跑完後，`taiex_ma60_regime_daily` 有當日一列；使用者打開 `/investment/breadth` 會看到「大盤季線狀態」卡片，內容符合 spec 的 Regime card 需求。

**介面與資料形狀**：

- 純函式（`ETF/pipeline/steps/taiex_ma60_regime_step.py`）：
  - `compute_regime_frame(close: pd.Series, low: pd.Series) -> pd.DataFrame`：欄位 `close, low, ma60, ma60_slope20, ma_rising, days_above, prev_days_above, break_type`（break_type 為 `first_break | rebreak_rising | break_falling | None`）
  - `compute_class_stats(frame: pd.DataFrame) -> dict[str, dict]`：key 為 `first_break, rebreak_rising, break_falling, down_day`，value 欄位見 spec 的 Historical class statistics
  - `build_daily_record(frame: pd.DataFrame, target: pd.Timestamp, stats: dict) -> dict`
- 資料表 `taiex_ma60_regime_daily`：`date DATE PRIMARY KEY, close FLOAT, ma60 FLOAT, ma60_slope20 FLOAT, ma_rising BOOLEAN, days_above INT, break_type TEXT, state TEXT, wave_break_count INT, next_break_threshold FLOAT, next_break_type TEXT, stats JSONB, updated_at TIMESTAMPTZ DEFAULT NOW()`；RLS 開啟、`FOR SELECT USING (true)`。
- Server Action `getTaiexRegime(): Promise<TaiexRegime | null>`，`TaiexRegime` interface 對應上述欄位，`stats` 以具名 interface 描述（禁 any）。

**失敗模式**：步驟任何例外只 `logger.error`，不 raise；目標日無指數資料時改寫最新可得日期並記 info log；dry-run 跳過。前端查無資料或查詢失敗時卡片顯示「季線狀態尚未更新」，頁面其他部分照常。

**驗收**：

- `uv run pytest ETF/tests/test_taiex_ma60_regime_step.py` 全綠（合成序列覆蓋三類分類、門檻、狀態、統計排除不足 20 日事件）。
- 以 FinLab 實際資料、截止 2026-10-16 跑純函式，數字與 spec 對帳範例一致（42 / 91 / 133、+2.13%、34、−2.35%、13、本波 5 次、門檻 46,077），結果記入 tasks.md。
- `yarn tsc --noEmit`、`yarn eslint` 新增與修改的前端檔通過；本地開 `/investment/breadth` 實測卡片顯示。

**範圍**：In scope：上述步驟、資料表、Server Action、卡片、ETF/CLAUDE.md 文件一行。Out of scope：個股、策略、通知、歷史圖、其他頁面。

## Risks / Trade-offs

- [第 40 天門檻與 20 日窗口是研究參數] → 文章敏感度顯示 20 天門檻 58 次 +1.6%、60 天 24 次 +3.1%（外部文章數字，未重算），方向一致；參數放模組常數，日後可調。
- [2008 年前後統計差異大：2008 前 13 次中位數 −1.1%，2009 後 29 次 +2.8%（外部文章數字，未重算）] → 卡片顯示 `sample_start`～`sample_end` 與樣本數，不暗示穩定優勢。
- [使用者把統計當訊號] → 卡片固定顯示免責文字，不用買賣字眼。
- [migration 需使用者確認後才套用] → tasks 中套用 migration 一項明列需先取得同意。
