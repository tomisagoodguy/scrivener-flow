"""融資使用率全市場百分位（change: margin-usage-percentile-risk）。

每個交易日在合格母體內依融資使用率排名，輸出 0–100 百分位；
歷史大跌日實測顯示前 20%（百分位 ≥ 80）跌幅顯著較重，前端據此標示。
"""

import pandas as pd

MIN_AVG_AMOUNT = 50_000_000  # 含當日 20 日平均成交金額（元）
MIN_CLOSE = 10.0
AMOUNT_WINDOW = 20
MIN_POPULATION = 50  # 當日合格股少於此數時百分位無意義


def _is_common_stock(code: str) -> bool:
    return len(code) == 4 and code.isdigit() and code[0] != "0"


def compute_margin_pct_rank(
    close: pd.DataFrame, amount: pd.DataFrame, margin: pd.DataFrame
) -> pd.DataFrame:
    """計算每日全市場融資使用率百分位。

    Args:
        close: 收盤價寬表（日期 × 股票代碼）。
        amount: 成交金額寬表（元），對齊 close。
        margin: 融資使用率寬表（%），NaN 表示無融資資格或未公布，不可預先補 0。

    Returns:
        與 close 同形狀的寬表；合格股為 0–100（小數 1 位），其餘為 NaN。
    """
    columns = close.columns
    amount = amount.reindex(index=close.index, columns=columns)
    margin = margin.reindex(index=close.index, columns=columns)

    common = pd.Series([_is_common_stock(str(c)) for c in columns], index=columns)
    avg_amount = amount.rolling(AMOUNT_WINDOW).mean()
    eligible = (
        (avg_amount >= MIN_AVG_AMOUNT)
        & (close >= MIN_CLOSE)
        & margin.notna()
        & common
    )

    ranked = margin.where(eligible).rank(axis=1, pct=True, method="average") * 100
    enough = eligible.sum(axis=1) >= MIN_POPULATION
    return ranked.where(enough, axis=0).round(1)
