"""
月頻因子 IC 計算腳本

計算 8 個因子在 1/5/20 日持有期的 Rank IC（Spearman 橫截面均值），
並 upsert 至 Supabase factor_ic_stats 表。

用法：
    uv run python ETF/compute_factor_ic.py
    uv run python ETF/compute_factor_ic.py --month 2026-04
"""

import os
import sys
import argparse
import logging
from datetime import date, timedelta
from pathlib import Path
from typing import Optional

ETF_DIR = Path(__file__).parent
project_root = ETF_DIR.parent
sys.path.insert(0, str(project_root))

from dotenv import load_dotenv

load_dotenv(project_root / ".env.local")

import finlab
import numpy as np
import pandas as pd
from finlab import data
from scipy import stats
from sqlalchemy import text

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)

FACTORS = [
    "rev_momentum_3_12",
    "rsv_180",
    "rs_100",
    "ma_trend_score",
    "broker_force",
    "vol_breakout",
    "smallcap_pct",
    "price_to_high_240",
]

HORIZONS = [1, 5, 20]
MIN_STOCKS = 30
LOOKBACK_DAYS = 252


def _get_engine():
    from ETF.database.sql_storage import SQLStorage
    return SQLStorage().engine


def _login_finlab() -> bool:
    api_key = os.getenv("FINLAB_API_KEY")
    if not api_key:
        logger.error("FINLAB_API_KEY 未設定")
        return False
    try:
        finlab.login(api_key)
        logger.info("FinLab 登入成功")
        return True
    except Exception as e:
        logger.error(f"FinLab 登入失敗: {e}")
        return False


def _compute_factors(close: pd.DataFrame, amt: pd.DataFrame, rev: pd.DataFrame,
                     cap: pd.DataFrame, buy_vol: pd.DataFrame,
                     sell_vol: pd.DataFrame) -> dict[str, pd.DataFrame]:
    """計算 8 個因子的連續值序列（index=date, columns=stock）。"""
    factors: dict[str, pd.DataFrame] = {}

    # rev_momentum_3_12：3個月移動平均 / 12個月移動平均 - 1
    rev_3m = rev.rolling(3, min_periods=2).mean()
    rev_12m = rev.rolling(12, min_periods=6).mean()
    factors["rev_momentum_3_12"] = (rev_3m / rev_12m.replace(0, np.nan) - 1).replace(
        [np.inf, -np.inf], np.nan
    )

    # rsv_180：180日 RSV（原始隨機值，未 rank）
    low_180 = close.rolling(180, min_periods=60).min()
    high_180 = close.rolling(180, min_periods=60).max()
    denom = (high_180 - low_180).replace(0, np.nan)
    factors["rsv_180"] = (close - low_180) / denom

    # rs_100：100日相對強度（close / close.shift(100)）
    factors["rs_100"] = close / close.shift(100).replace(0, np.nan)

    # ma_trend_score：MA5 > MA20 對齊得分（0–2 連續值，用 ewm 平滑化）
    ma5 = close.ewm(span=5, adjust=False).mean()
    ma20 = close.ewm(span=20, adjust=False).mean()
    above = (ma5 > ma20).astype(float)
    factors["ma_trend_score"] = above.rolling(20, min_periods=5).mean() * 2

    # broker_force：前15大券商淨量 60日滾動均值 / 標準差（Z-score）
    net_vol = buy_vol - sell_vol
    roll_mean = net_vol.rolling(60, min_periods=20).mean()
    roll_std = net_vol.rolling(60, min_periods=20).std().replace(0, np.nan)
    factors["broker_force"] = roll_mean / roll_std

    # vol_breakout：當日成交金額 / 60日均量
    avg_amt = amt.rolling(60, min_periods=20).mean().replace(0, np.nan)
    factors["vol_breakout"] = amt / avg_amt

    # smallcap_pct：1 減市值百分位排名（低市值高分）
    factors["smallcap_pct"] = 1 - cap.rank(axis=1, pct=True)

    # price_to_high_240：close / 240日最高收盤價
    high_240 = close.rolling(240, min_periods=120).max().replace(0, np.nan)
    factors["price_to_high_240"] = close / high_240

    return factors


def compute_rank_ic(factor_df: pd.DataFrame, fwd_ret_df: pd.DataFrame) -> float:
    """對齊日期後計算橫截面 Spearman 均值（Rank IC）。

    每個日期：對全市場股票計算因子值與遠期報酬的 Spearman r，
    要求至少 MIN_STOCKS 支股票有資料，否則跳過。
    最後取時序均值。

    Returns:
        float or nan if no valid dates.
    """
    common_idx = factor_df.index.intersection(fwd_ret_df.index)
    if len(common_idx) == 0:
        return float("nan")

    f = factor_df.loc[common_idx]
    r = fwd_ret_df.loc[common_idx]

    ic_values = []
    for dt in common_idx:
        f_row = f.loc[dt].dropna()
        r_row = r.loc[dt].dropna()
        both = f_row.index.intersection(r_row.index)
        if len(both) < MIN_STOCKS:
            continue
        rho, _ = stats.spearmanr(f_row[both].values, r_row[both].values)
        if not np.isnan(rho):
            ic_values.append(rho)

    if not ic_values:
        return float("nan")
    return float(np.mean(ic_values))


def compute_monthly_ic(month_str: str) -> list[dict]:
    """計算指定月份 8 個因子的 IC，回傳待 upsert 的列表。"""
    month_dt = pd.Timestamp(month_str + "-01")
    cutoff = month_dt - timedelta(days=1)
    start = cutoff - timedelta(days=LOOKBACK_DAYS * 2)

    logger.info(f"載入 FinLab 資料，計算窗口：{start.date()} ～ {cutoff.date()}")

    close = data.get("price:收盤價")
    amt = data.get("price:成交金額")
    rev = data.get("monthly_revenue:當月營收")
    cap = data.get("etl:market_value")
    buy_vol = data.get("etl:broker_transactions:top15_buy")
    sell_vol = data.get("etl:broker_transactions:top15_sell")

    # 截取計算窗口
    def trim(df: pd.DataFrame) -> pd.DataFrame:
        idx = df.index[(df.index >= start) & (df.index <= cutoff)]
        return df.loc[idx]

    close = trim(close)
    amt = trim(amt)
    rev = trim(rev)
    cap = trim(cap)
    buy_vol = trim(buy_vol)
    sell_vol = trim(sell_vol)

    logger.info("計算 8 個因子值...")
    factor_map = _compute_factors(close, amt, rev, cap, buy_vol, sell_vol)

    results = []
    month_first = month_str + "-01"

    for horizon in HORIZONS:
        fwd_ret = (close.shift(-horizon) / close - 1).replace([np.inf, -np.inf], np.nan)
        # 移除最後 horizon 日（無遠期報酬）
        fwd_ret = fwd_ret.iloc[:-horizon] if horizon < len(fwd_ret) else fwd_ret

        logger.info(f"計算 horizon={horizon}d IC...")
        for factor_name in FACTORS:
            f_df = factor_map.get(factor_name)
            if f_df is None or f_df.empty:
                logger.warning(f"  {factor_name}: 資料為空，跳過")
                continue
            ic = compute_rank_ic(f_df, fwd_ret)
            logger.info(f"  {factor_name} ic_{horizon}d = {ic:.4f}" if not np.isnan(ic) else f"  {factor_name} ic_{horizon}d = NaN")

            # 確保 results 有對應列
            existing = next((r for r in results if r["factor_name"] == factor_name), None)
            if existing is None:
                existing = {"month": month_first, "factor_name": factor_name,
                            "ic_1d": None, "ic_5d": None, "ic_20d": None}
                results.append(existing)
            existing[f"ic_{horizon}d"] = None if np.isnan(ic) else round(ic, 6)

    return results


def upsert_results(engine, rows: list[dict]) -> None:
    """upsert factor_ic_stats（ON CONFLICT DO UPDATE）。"""
    if not rows:
        logger.warning("無資料可寫入")
        return

    sql = text("""
        INSERT INTO factor_ic_stats (month, factor_name, ic_1d, ic_5d, ic_20d, computed_at)
        VALUES (:month, :factor_name, :ic_1d, :ic_5d, :ic_20d, now())
        ON CONFLICT (month, factor_name) DO UPDATE SET
            ic_1d       = EXCLUDED.ic_1d,
            ic_5d       = EXCLUDED.ic_5d,
            ic_20d      = EXCLUDED.ic_20d,
            computed_at = now()
    """)

    with engine.begin() as conn:
        conn.execute(sql, rows)

    logger.info(f"已 upsert {len(rows)} 列至 factor_ic_stats")


def main() -> None:
    parser = argparse.ArgumentParser(description="月頻因子 IC 計算")
    parser.add_argument(
        "--month",
        type=str,
        default=None,
        help="指定月份 YYYY-MM（預設當月），支援回填歷史 IC",
    )
    args = parser.parse_args()

    if args.month:
        month_str = args.month
    else:
        today = date.today()
        month_str = f"{today.year}-{today.month:02d}"

    logger.info(f"計算月份：{month_str}")

    if not _login_finlab():
        sys.exit(1)

    engine = _get_engine()
    rows = compute_monthly_ic(month_str)
    upsert_results(engine, rows)
    logger.info("完成")


if __name__ == "__main__":
    main()
