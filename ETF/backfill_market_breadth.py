"""
Backfill market_breadth_daily

從 FinLab etl:adj_close 計算全市場歷史 ADL/ADR，補填 market_breadth_daily 表格。

用法：
    uv run python ETF/backfill_market_breadth.py

注意：
    - 需要 FINLAB_API_KEY 環境變數（5GB/天配額）
    - 執行一次大約使用 200~500MB 配額
    - 預設補填全部歷史，可用 --days 限制範圍
"""

import argparse
import logging
import os
import sys
from datetime import datetime

import finlab
from dotenv import load_dotenv
from sqlalchemy import text

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
logger = logging.getLogger(__name__)

MA_WINDOWS = [5, 60]
BENCHMARK = 1  # price ratio > 1 → up, < 1 → down


def compute_adl_history(days: int | None = None):
    import finlab.data as fd
    import numpy as np
    import pandas as pd

    logger.info("Fetching etl:adj_close from FinLab...")
    close_df = fd.get("etl:adj_close")
    if close_df is None or close_df.empty:
        raise RuntimeError("etl:adj_close is empty or unavailable")

    logger.info(f"Got adj_close: {close_df.shape[0]} dates × {close_df.shape[1]} stocks")

    # 計算每日漲跌家數（按照 reference 邏輯）
    fluctuation = close_df / close_df.shift()
    fluctuation = fluctuation.dropna(how="all").T  # (stock × date)

    dataset = []
    for col in fluctuation.columns:
        daily = fluctuation[col].dropna()
        ups = int((daily > BENCHMARK).sum())
        downs = int((daily < BENCHMARK).sum())
        date_str = str(col.date()) if hasattr(col, "date") else str(col)
        dataset.append({"date": date_str, "ups": ups, "downs": downs})

    ad_df = pd.DataFrame(dataset)
    ad_df = ad_df.sort_values("date").reset_index(drop=True)
    ad_df["net"] = ad_df["ups"] - ad_df["downs"]
    ad_df["adl"] = ad_df["net"].cumsum()
    total = ad_df["ups"] + ad_df["downs"]
    ad_df["adr"] = ad_df["ups"] / total.where(total > 0)

    for w in MA_WINDOWS:
        ad_df[f"adl_ma{w}"] = ad_df["adl"].rolling(w).mean()
        ad_df[f"adr_ma{w}"] = ad_df["adr"].rolling(w).mean()

    if days:
        ad_df = ad_df.tail(days).reset_index(drop=True)
        logger.info(f"Trimmed to last {days} days: {len(ad_df)} rows")

    return ad_df


def upsert_all(ad_df, engine):
    import pandas as pd

    sql = text("""
        INSERT INTO market_breadth_daily
            (date, ups, downs, net, adl, adr, adl_ma5, adl_ma60, adr_ma5, adr_ma60)
        VALUES
            (:date, :ups, :downs, :net, :adl, :adr, :adl_ma5, :adl_ma60, :adr_ma5, :adr_ma60)
        ON CONFLICT (date) DO UPDATE SET
            ups      = EXCLUDED.ups,
            downs    = EXCLUDED.downs,
            net      = EXCLUDED.net,
            adl      = EXCLUDED.adl,
            adr      = EXCLUDED.adr,
            adl_ma5  = EXCLUDED.adl_ma5,
            adl_ma60 = EXCLUDED.adl_ma60,
            adr_ma5  = EXCLUDED.adr_ma5,
            adr_ma60 = EXCLUDED.adr_ma60
    """)

    def _f(v):
        return float(v) if v is not None and v == v else None

    records = []
    for _, row in ad_df.iterrows():
        records.append({
            "date":     row["date"],
            "ups":      int(row["ups"]),
            "downs":    int(row["downs"]),
            "net":      int(row["net"]),
            "adl":      _f(row["adl"]),
            "adr":      _f(row["adr"]) if pd.notna(row["adr"]) else None,
            "adl_ma5":  _f(row["adl_ma5"]) if pd.notna(row["adl_ma5"]) else None,
            "adl_ma60": _f(row["adl_ma60"]) if pd.notna(row["adl_ma60"]) else None,
            "adr_ma5":  _f(row["adr_ma5"]) if pd.notna(row["adr_ma5"]) else None,
            "adr_ma60": _f(row["adr_ma60"]) if pd.notna(row["adr_ma60"]) else None,
        })

    CHUNK = 500
    total = len(records)
    with engine.connect() as conn:
        for i in range(0, total, CHUNK):
            chunk = records[i:i + CHUNK]
            conn.execute(sql, chunk)
            conn.commit()
            logger.info(f"Upserted {min(i + CHUNK, total)}/{total} rows")

    logger.info(f"✅ Done: {total} rows upserted into market_breadth_daily")


def main():
    parser = argparse.ArgumentParser(description="Backfill market_breadth_daily")
    parser.add_argument("--days", type=int, default=None, help="Only backfill last N days (default: all history)")
    args = parser.parse_args()

    if os.path.exists(".env.local"):
        load_dotenv(".env.local")
    else:
        load_dotenv()

    db_url = os.getenv("DATABASE_URL")
    if not db_url:
        logger.error("DATABASE_URL not set")
        sys.exit(1)

    finlab.login()

    from sqlalchemy import create_engine
    engine = create_engine(db_url)

    ad_df = compute_adl_history(days=args.days)
    upsert_all(ad_df, engine)


if __name__ == "__main__":
    main()
