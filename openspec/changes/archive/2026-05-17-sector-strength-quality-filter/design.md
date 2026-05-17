## Context

目前 `SectorStrengthStep` 計算族群均漲幅後，前端僅以 `ret_1d > 0` 作為「強勢」判準，噪音過多。需在 Pipeline 層新增三項品質指標，存入 DB，前端再依這些欄位作多條件篩選。

現有 `sector_strength` 資料表只有 `ret_1d / ret_5d / ret_20d / stock_count / total_amount`，需新增三欄。

## Goals / Non-Goals

**Goals:**

- Pipeline 計算 `breadth`（上漲家數比例）、`avg_amount_5d`（5 日均量，元）、`strength_score`（ret_1d × breadth）
- DB 新增對應三欄
- 前端新增「強勢」篩選模式（三條件 AND）

**Non-Goals:**

- 不改族群來源分類（security_industry_themes）
- 不做 Treemap / 熱力圖

## Decisions

### 廣度（breadth）計算方式

計算族群內 `ret_1d > 0` 的成分股比例。使用族群的 groupby + lambda 即可：

```python
breadth = valid_df.groupby("category").apply(
    lambda g: (g["ret_1d"] > 0).sum() / len(g)
)
```

**不採用**加權廣度（以市值加權），因為 `sector_strength_stocks` 無市值欄，需額外 FinLab 呼叫，得不償失。

### avg_amount_5d 資料來源

從 FinLab `price:成交金額` 取最近 6 個交易日（含今日），計算前 5 日均值（`.iloc[-6:-1].mean()`），再依族群成分股加總：

```python
amount_hist = fd.get("price:成交金額")
avg_5d = amount_hist.iloc[-6:-1].mean()  # 前 5 日，不含今日
avg_amount_5d_by_stock = avg_5d
```

族群層級：各成分股 avg_5d 加總 → `avg_amount_5d_by_cat`

**不採用** DB 歷史回算，避免跨步驟依賴與 NULL 問題（歷史資料可能有空白）。

### strength_score 定義

`strength_score = ret_1d × breadth`

- ret_1d 代表幅度，breadth 代表廣度，相乘可壓制「僅 1-2 支拉高均值」的偽強勢族群
- 前端「強勢」tab 預設以 strength_score 降序排列

### 前端篩選門檻（強勢模式）

| 條件 | 門檻 | 說明 |
|------|------|------|
| ret_1d | > 0 | 當日正漲 |
| ret_5d | > 0 | 週趨勢一致 |
| breadth | ≥ 0.40 | 至少 4 成成分股上漲 |
| total_amount vs avg_amount_5d | ≥ 0.8× | 量能未萎縮 |

門檻硬編碼於前端（SectorDashboard.tsx），不走後端 API 參數，保持前端實作簡單。

## Risks / Trade-offs

- [Risk] FinLab `price:成交金額` 取 6 日窗口比原本多一個 `.iloc[-6:-1]` 操作，但同一 `fd.get()` 呼叫已快取，不增加 API 配額消耗。
- [Trade-off] `avg_amount_5d` 是成分股的「個股 5 日均量加總」，不等於「族群 5 日均總成交金額」（因不同日的成分股數量可能不同）。這是可接受的近似值。
- [Risk] 歷史資料若不足 5 日（新 ETF 或新題材），`avg_5d` 為 NaN，DB 存 NULL，前端量能條件跳過（視為通過）。
