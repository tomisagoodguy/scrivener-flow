"""投信動能指標補跑腳本 — 補充 strategy_signals 中 fund_momentum 歷史資料。

用法：
    uv run python ETF/run_fund_momentum.py              # 補跑最近 30 個交易日
    uv run python ETF/run_fund_momentum.py --days 60    # 補跑最近 60 個交易日
"""

import os
import sys
import json
import logging
import argparse
from datetime import date
from pathlib import Path

import pandas as pd
from dotenv import load_dotenv

sys.path.insert(0, str(Path(__file__).parent.parent))

logging.basicConfig(
    level=logging.INFO,
    format="[%(levelname)s] %(name)s — %(message)s",
)
logger = logging.getLogger("run_fund_momentum")

STRATEGY_ID = "fund_momentum"
CONSEC_THRESHOLD = 3
SCORE_THRESHOLD = 90


def _compute_consec_days(series: pd.Series) -> int:
    count = 0
    for val in reversed(series.values):
        if pd.isna(val) or val <= 0:
            break
        count += 1
    return count


def run(days: int = 30) -> None:
    if os.path.exists(".env.local"):
        load_dotenv(".env.local")
    else:
        load_dotenv()

    import finlab
    finlab.login()
    logger.info("FinLab 登入成功")

    from finlab import data as fl_data

    import sqlalchemy
    from sqlalchemy import text

    db_url = os.getenv("SUPABASE_DB_URL") or os.getenv("DATABASE_URL")
    if not db_url:
        raise ValueError("SUPABASE_DB_URL 或 DATABASE_URL 環境變數未設定")
    engine = sqlalchemy.create_engine(db_url, connect_args={"client_encoding": "utf8"})

    logger.info("下載投信買賣超資料...")
    fund_df: pd.DataFrame = fl_data.get("institutional_investors_trading_summary:投信買賣超股數")
    logger.info("下載成交股數資料...")
    vol_df: pd.DataFrame = fl_data.get("price:成交股數")

    if fund_df is None or fund_df.empty:
        logger.error("投信買賣超資料為空，中止")
        return
    if vol_df is None or vol_df.empty:
        logger.error("成交股數資料為空，中止")
        return

    # 取最近 N 個交易日
    recent_dates = fund_df.index[-days:]
    logger.info(f"處理日期範圍：{recent_dates[0]} ~ {recent_dates[-1]}（{len(recent_dates)} 天）")

    common_stocks = fund_df.columns.intersection(vol_df.columns)
    fund_df = fund_df[common_stocks]
    vol_df = vol_df[common_stocks]

    all_rows: list[dict] = []

    for target_date in recent_dates:
        date_key = str(target_date)[:10]

        # 截至 target_date 的歷史資料
        f_hist = fund_df[fund_df.index <= target_date]
        v_hist = vol_df[vol_df.index <= target_date]

        if f_hist.empty:
            continue

        fund_5d = f_hist.rolling(5, min_periods=1).sum().iloc[-1]
        fund_20d = f_hist.rolling(20, min_periods=1).sum().iloc[-1]
        vol_5d = v_hist.rolling(5, min_periods=1).sum().iloc[-1]
        fund_1d = f_hist.iloc[-1]

        score_series = (fund_20d.rank(pct=True) * 100).round().fillna(0).astype(int)
        fund_ratio_5d = fund_5d / vol_5d.replace(0, float("nan"))

        for stock_id in common_stocks:
            s = f_hist[stock_id].dropna()
            cd = _compute_consec_days(s)

            f1 = float(fund_1d[stock_id]) if pd.notna(fund_1d[stock_id]) else None
            f5 = float(fund_5d[stock_id]) if pd.notna(fund_5d[stock_id]) else None
            f20 = float(fund_20d[stock_id]) if pd.notna(fund_20d[stock_id]) else None
            sc = int(score_series[stock_id]) if pd.notna(score_series[stock_id]) else 0
            ratio = float(fund_ratio_5d[stock_id]) if pd.notna(fund_ratio_5d[stock_id]) else None

            is_sel = cd >= CONSEC_THRESHOLD and sc >= SCORE_THRESHOLD

            all_rows.append({
                "strategy_id": STRATEGY_ID,
                "date": date_key,
                "stock_id": str(stock_id),
                "score": sc,
                "is_selected": is_sel,
                "conditions": json.dumps({
                    "fund_1d": f1,
                    "fund_5d": f5,
                    "fund_20d": f20,
                    "consec_days": cd,
                    "fund_ratio_5d": ratio,
                }),
            })

    logger.info(f"準備寫入 {len(all_rows)} 筆（{days} 個交易日 × {len(common_stocks)} 支股票）")

    sql = text("""
        INSERT INTO strategy_signals
            (strategy_id, date, stock_id, score, is_selected, conditions)
        VALUES
            (:strategy_id, :date, :stock_id, :score, :is_selected, CAST(:conditions AS jsonb))
        ON CONFLICT (strategy_id, date, stock_id)
        DO UPDATE SET
            score = EXCLUDED.score,
            is_selected = EXCLUDED.is_selected,
            conditions = EXCLUDED.conditions
    """)

    chunk_size = 500
    with engine.connect() as conn:
        for i in range(0, len(all_rows), chunk_size):
            conn.execute(sql, all_rows[i: i + chunk_size])
        conn.commit()

    selected = sum(1 for r in all_rows if r["is_selected"])
    logger.info(f"✅ 完成。is_selected={selected} 筆")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--days", type=int, default=30, help="補跑幾個交易日（預設 30）")
    args = parser.parse_args()
    run(days=args.days)
