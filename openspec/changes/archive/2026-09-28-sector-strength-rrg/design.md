## Context

`sector_strength_step.py` 每日計算全市場族群（產業題材分類）的日/週/月漲幅與 `strength_score`（`ret_1d × breadth × (1 + hit_ratio×2)`），純粹反映「族群自身動能」，沒有「相對大盤強弱」維度。外部專案 finlab-sector-radar 的 RRG（Relative Rotation Graph）方法論用 RS-Ratio（相對強度水準）與 RS-Momentum（相對強度變化率）將標的分類進四象限，是成熟的資金輪動分析工具（原始概念來自 JdK RRG）。已用本機 FinLab VIP session 驗證 `taiex_total_index:收盤指數` 存在（`FinlabDataFrame`，單一欄位 `TAIEX`，index 為日期，資料回溯至少數千個交易日），可作為大盤基準序列。

## Goals / Non-Goals

**Goals:**
- 新增獨立 `SectorRrgStep`，計算每個有效族群相對 TAIEX 的 RS-Ratio / RS-Momentum，分類四象限並寫回 `sector_strength`
- 讓 `strength_score` 在有 RRG 資料時反映「族群是否正相對大盤轉強」，同時對舊資料 / RRG 資料缺失保持向後相容（NULL 時不覆蓋原始分數）
- 前端揭露象限徽章，遵循台股紅漲綠跌色彩慣例

**Non-Goals:**（詳見 proposal.md Non-Goals，design 不重複列出範圍排除；此處只補充技術面排除）
- 不用 `data.indicator()` 或任何 TA-Lib 封裝算 EMA，直接用 pandas `.ewm(span=n).mean()`（與現有 codebase 風格一致，`ETF/strategies/` 也是直接用 pandas rolling/ewm）
- 不對每個族群逐股票算 RS 再平均（成本高、且與族群整體相對大盤的分析語意不符），採「族群成分股收盤價簡單平均後，整體序列 vs TAIEX」的作法，與 `sector_strength_step.py` 既有的 groupby mean 精神一致

## Decisions

### 資料來源與族群時間序列建構

沿用 `SectorStrengthStep` 已建立的 `exploded`（stock_id → category，family 可能多對多）與 `close = fd.get("price:收盤價")`（全市場歷史收盤價 DataFrame，非僅當日）。`SectorRrgStep` 對每個 `valid_cats`（沿用 `SectorStrengthStep._run()` 相同 `MIN_STOCK_COUNT >= 5` 邏輯重新計算一次，因兩步驟間無共享 context 傳遞 DataFrame 的機制）：

```python
cat_stock_ids = valid_df[valid_df.category == cat]["stock_id"].unique()
cat_close = close[cat_stock_ids].mean(axis=1)          # 族群平均收盤價時間序列
```

`taiex = fd.get("taiex_total_index:收盤指數")["TAIEX"]`，與 `cat_close` 依日期 `align(join="inner")` 後計算：

```python
rs = (cat_close / cat_close.iloc[0]) / (taiex / taiex.iloc[0])
rs_ratio_series = rs.ewm(span=14, min_periods=14).mean()
rs_momentum_series = rs_ratio_series.pct_change().ewm(span=10, min_periods=10).mean()
rs_ratio = rs_ratio_series.iloc[-1]
rs_momentum = rs_momentum_series.iloc[-1]
```

`min_periods=14`／`min_periods=10` 確保歷史不足時回傳 `NaN`，NaN 一律轉存 DB NULL（不得用 0 或估計值填補，遵守專案「禁止臆測」原則）。

**為什麼不重用 `SectorStrengthStep` 算過的 `exploded`/`close`**：兩步驟是獨立的輔助步驟（各自 `execute()` try/except，互不依賴成功與否），`PipelineContext` 目前沒有「傳遞族群成分股完整收盤價序列」的欄位，且 `SectorStrengthStep` 只取 `close.iloc[-1]`（當日快照），沒有保留完整歷史序列物件供下游重用。新增 `ctx` 欄位傳遞會讓兩步驟產生隱性耦合（違反輔助步驟獨立失敗的設計）；重新呼叫 `fd.get()` 兩次雖多一次 FinLab 呼叫，但 `price:收盤價`／`security_industry_themes` 皆有 FinLab client 內建快取（同一 process 內同一 key 不重複計費），成本可忽略。

### 四象限分類

```python
if pd.isna(rs_ratio) or pd.isna(rs_momentum):
    quadrant = None
elif rs_ratio >= 1.0 and rs_momentum >= 0:
    quadrant = "leading"
elif rs_ratio >= 1.0 and rs_momentum < 0:
    quadrant = "weakening"
elif rs_ratio < 1.0 and rs_momentum >= 0:
    quadrant = "improving"
else:
    quadrant = "lagging"
```

### strength_score 加權覆蓋（獨立 UPDATE，不改 SectorStrengthStep）

`SectorRrgStep` 在 `_run()` 尾端對每個有 `quadrant` 的族群執行：

```sql
UPDATE sector_strength
SET rs_ratio = :rs_ratio, rs_momentum = :rs_momentum, rrg_quadrant = :quadrant,
    strength_score = strength_score * :multiplier
WHERE date = :date AND category = :category AND strength_score IS NOT NULL
```

`multiplier` 對照：`leading=1.15, improving=1.05, weakening=0.95, lagging=0.85`。`quadrant IS NULL` 的族群只 UPDATE `rs_ratio`/`rs_momentum`（皆為 NULL）不動 `strength_score`。

**為什麼用乘法權重而非另開欄位重新排序**：`strength_score` 已是前端「強勢模式」排序的唯一依據（`sector-strength-web` spec 既有需求），維持單一分數欄位可讓 RRG 訊號直接影響既有排序，不需要前端額外處理雙欄位排序邏輯；乘法（而非加法）確保原始分數為負值時方向不會被權重翻轉。

### Step 執行順序與失敗處理

`orchestrator.py` 中 `SectorRrgStep` 緊接在 `SectorStrengthStep` 之後（因依賴其 upsert 的 `sector_strength` 列存在，UPDATE 才有效）。屬輔助步驟：`execute()` 包 try/except，失敗只 `logger.error()`，不 `raise`，不中斷後續步驟（比照 `etf-pipeline.md` 輔助步驟清單）。

### DB Schema

```sql
ALTER TABLE sector_strength
    ADD COLUMN IF NOT EXISTS rs_ratio      NUMERIC(8,4),
    ADD COLUMN IF NOT EXISTS rs_momentum   NUMERIC(8,4),
    ADD COLUMN IF NOT EXISTS rrg_quadrant  TEXT;
```

不加 CHECK constraint 限制 `rrg_quadrant` 枚舉值（與現有 `sector_strength` 欄位風格一致，未見既有欄位使用 DB 層級 enum/check），由應用層（Python 寫入時、TS 型別）保證合法值。

## Implementation Contract

**觀察行為（後端）**：pipeline 執行後，`sector_strength` 表中每個 `stock_count >= 5` 的族群列，在歷史資料 >= 14 個交易日時，`rrg_quadrant` 欄位 SHALL 為 `leading`/`weakening`/`improving`/`lagging` 四者之一；歷史不足時 `rs_ratio`/`rs_momentum`/`rrg_quadrant` 三欄 SHALL 皆為 NULL 且 `strength_score` SHALL 維持 `SectorStrengthStep` 原始寫入值不變。

**驗證方式（後端）**：`uv run pytest ETF/tests/test_sector_rrg_step.py`（新測試檔，純函式測試 RS-Ratio/RS-Momentum/象限分類，mock `fd.get()` 回傳固定 close/taiex 序列，斷言象限分類與 `strength_score` 乘法結果）。

**觀察行為（前端）**：`getSectorStrength()` 回傳的 `SectorRow` SHALL 包含 `rs_ratio: number | null`、`rs_momentum: number | null`、`rrg_quadrant: 'leading' | 'weakening' | 'improving' | 'lagging' | null` 三欄；`SectorDashboard.tsx` 族群列在 `rrg_quadrant` 非 null 時 SHALL 顯示對應徽章文字（領先/轉弱/改善/落後），null 時 SHALL 不顯示徽章（不顯示「無資料」佔位，維持列表簡潔）。

**驗證方式（前端）**：`yarn test --testPathPatterns SectorDashboard`（若既有測試檔存在則擴充案例；若無既有測試檔案，新增最小案例涵蓋「有象限顯示徽章」「NULL 不顯示徽章」兩種情境）+ `yarn tsc --noEmit`。

**範圍邊界**：
- In scope：`SectorRrgStep` 新檔、DB migration、`strength_score` 乘法覆蓋、`getSectorStrength.ts` 查詢欄位擴充、`SectorDashboard.tsx` 徽章顯示
- Out of scope：`sector_strength_step.py` 本體邏輯（不修改）、`sector_strength_stocks`（成分股層級表，本次不加 RRG 欄位）、任何 RRG 散佈圖 / 視覺化元件

## Risks / Trade-offs

- [Risk] 族群成分股簡單平均可能被單一大權值股（如台積電所在的半導體族群）主導，與真實「族群資金流向」有落差 → Mitigation：與現有 `ret_1d`/`ret_5d` 計算方式一致（`sector_strength_step.py` 也是簡單平均非市值加權），維持指標定義一致性，未來如需市值加權可另開 change
- [Risk] `SectorRrgStep` 重新呼叫 `fd.get("price:收盤價")` 與 `fd.get("security_industry_themes")`，若 FinLab process 內快取未命中會重複扣 VIP 配額 → Mitigation：兩次呼叫在同一 pipeline process 內間隔數秒，FinLab client 有 in-memory cache（已由 `SectorStrengthStep` 同 session 驗證重複呼叫不二次計費）；上線後首週觀察 FinLab daily usage 是否異常增加
- [Risk] `strength_score` 乘法覆蓋若 `SectorRrgStep` 排序早於 `SectorStrengthStep` 完成 upsert（例如手動調整 orchestrator 順序時誤放前面）會導致 UPDATE 找不到列、靜默無效 → Mitigation：`WHERE strength_score IS NOT NULL` 保護 + `_run()` 開頭記錄 `UPDATE` 影響列數，若為 0 則 log warning

## Migration Plan

1. 先跑 DB migration（`ALTER TABLE ADD COLUMN IF NOT EXISTS`，冪等、不影響現有查詢）
2. 部署 `SectorRrgStep` + orchestrator 註冊，下一次排程執行後開始有資料（歷史欄位保持 NULL 直到 14 個交易日後首次有值）
3. 前端 `getSectorStrength.ts` 與 `SectorDashboard.tsx` 可與後端同批或稍後部署——欄位為新增（additive），`SELECT *` 或明確欄位清單擴充皆不會破壞既有查詢
4. Rollback：欄位為 additive 且應用層讀取皆做 null 檢查，直接 revert code 即可，不需要 DOWN migration 刪欄位（保留欄位不影響其他功能）

## Open Questions

（無待決問題；FinLab 資料表名稱已於本機 VIP session 實測驗證存在）
