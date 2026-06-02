"""回測結果分析工具 — 按年度拆解交易績效。"""

from __future__ import annotations

import pandas as pd

from ETF.optimizer.ga.compat import get_trade_count_compat


def analyze_return(report) -> pd.DataFrame:
    """將回測 report 的交易紀錄按年度分解為績效統計表。

    Returns:
        DataFrame，欄位：年度、總獲利、總虧損、盈虧比、
        平均每筆獲利/虧損/盈虧比、總交易筆數、獲利筆數、虧損筆數、勝率
    """
    try:
        df = report.get_trades()
    except AttributeError:
        df = report.trades

    rows: list[dict] = []
    years = [str(int(y)) for y in df['entry_date'].dt.year.dropna().unique()]

    for label, mask in [
        *[(y, df['entry_date'].dt.year == int(y)) for y in years],
        ('全部年度', pd.Series(True, index=df.index)),
    ]:
        win  = df['return'][df['return'] > 0][mask if isinstance(mask, pd.Series) and mask.any() else df['return'] > 0]
        lose = df['return'][df['return'] < 0][mask if isinstance(mask, pd.Series) and mask.any() else df['return'] < 0]

        # 用年度 mask 過濾
        sub = df[mask] if isinstance(mask, pd.Series) else df
        win  = sub[sub['return'] > 0]['return']
        lose = sub[sub['return'] < 0]['return']

        total_win  = win.sum()
        total_lose = lose.sum()
        n_win  = len(win)
        n_lose = len(lose)
        n_total = n_win + n_lose

        rows.append({
            '年度':         label,
            '總獲利':       total_win,
            '總虧損':       total_lose,
            '盈虧比':       abs(total_win / total_lose) if total_lose != 0 else float('inf'),
            '平均每筆獲利': total_win  / n_win   if n_win   > 0 else 0.0,
            '平均每筆虧損': total_lose / n_lose  if n_lose  > 0 else 0.0,
            '平均每筆盈虧比': (
                abs((total_win / n_win) / (total_lose / n_lose))
                if n_win > 0 and n_lose > 0 else float('inf')
            ),
            '總交易筆數':   n_total,
            '獲利筆數':     n_win,
            '虧損筆數':     n_lose,
            '勝率':         n_win / n_total if n_total > 0 else 0.0,
        })

    return pd.DataFrame(rows)
