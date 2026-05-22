"""
ADL 歷史回填腳本

從 FinLab etl:adj_close 計算全部歷史 ADL/ADR，批次 upsert 至 market_breadth_daily。
預設回填最近 365 天，可透過 --days 參數調整。

用法：
    uv run python ETF/sync_adl_history.py              # 回填最近 365 天
    uv run python ETF/sync_adl_history.py --days 500   # 回填最近 500 天
    uv run python ETF/sync_adl_history.py --dry-run    # 不寫 DB，只顯示資料筆數
"""

import argparse
import logging
import os
import sys
from datetime import date, timedelta
from pathlib import Path

# 確保可以 import ETF 模組
sys.path.insert(0, str(Path(__file__).parent.parent))

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
logger = logging.getLogger(__name__)

MA_WINDOWS = [5, 60]
BENCHMARK = 1
BATCH_SIZE = 50  # 每批 upsert 的筆數


def compute_adl_df():
    import finlab
    import finlab.data as fd
    import pandas as pd

    finlab.login()

    logger.info("Fetching etl:adj_close ...")
    close_df = fd.get("etl:adj_close")
    if close_df is None or close_df.empty or len(close_df) < 2:
        raise ValueError("etl:adj_close 資料不足，無法計算 ADL。")

    logger.info(f"adj_close 取得 {len(close_df)} 個交易日 × {close_df.shape[1]} 支股票")

    fluctuation = close_df / close_df.shift()
    fluctuation = fluctuation.dropna(how="all").T  # (stock × date)

    dataset = []
    for col in fluctuation.columns:
        daily = fluctuation[col].dropna()
        ups = int((daily > BENCHMARK).sum())
        downs = int((daily < BENCHMARK).sum())
        dataset.append({
            "date": str(getattr(col, "date")()) if hasattr(col, "date") else str(col),
            "ups": ups,
            "downs": downs,
        })

    ad_df = pd.DataFrame(dataset)
    ad_df = ad_df.sort_values("date").reset_index(drop=True)
    ad_df["net"] = ad_df["ups"] - ad_df["downs"]
    ad_df["adl"] = ad_df["net"].cumsum()
    total = ad_df["ups"] + ad_df["downs"]
    ad_df["adr"] = ad_df["ups"] / total.where(total > 0)

    for w in MA_WINDOWS:
        ad_df[f"adl_ma{w}"] = ad_df["adl"].rolling(w).mean()
        ad_df[f"adr_ma{w}"] = ad_df["adr"].rolling(w).mean()

    return ad_df


def upsert_batch(engine, records: list[dict]) -> None:
    from sqlalchemy import text

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
    with engine.connect() as conn:
        conn.execute(sql, records)
        conn.commit()


def main():
    parser = argparse.ArgumentParser(description="ADL 歷史資料回填")
    parser.add_argument("--days", type=int, default=365, help="回填最近 N 天（預設 365）")
    parser.add_argument("--dry-run", action="store_true", help="不寫入 DB，只顯示資料筆數")
    args = parser.parse_args()

    from dotenv import load_dotenv
    load_dotenv(".env.local")
    load_dotenv(".env")

    ad_df = compute_adl_df()

    cutoff = (date.today() - timedelta(days=args.days)).strftime("%Y-%m-%d")
    ad_df = ad_df[ad_df["date"] >= cutoff].reset_index(drop=True)
    logger.info(f"篩選 {cutoff} 之後，共 {len(ad_df)} 筆")

    if args.dry_run:
        logger.info("[DRY RUN] 不寫入 DB。")
        print(ad_df.tail(10).to_string())
        return

    import pandas as pd
    from sqlalchemy import create_engine

    db_url = os.environ.get("DATABASE_URL")
    if not db_url:
        raise EnvironmentError("DATABASE_URL 未設定，請確認 .env.local 或 .env")

    engine = create_engine(db_url)

    records = []
    for _, row in ad_df.iterrows():
        records.append({
            "date": str(row["date"]),
            "ups": int(row["ups"]),
            "downs": int(row["downs"]),
            "net": int(row["net"]),
            "adl": float(row["adl"]),
            "adr": float(row["adr"]) if pd.notna(row["adr"]) else None,
            "adl_ma5": float(row["adl_ma5"]) if pd.notna(row["adl_ma5"]) else None,
            "adl_ma60": float(row["adl_ma60"]) if pd.notna(row["adl_ma60"]) else None,
            "adr_ma5": float(row["adr_ma5"]) if pd.notna(row["adr_ma5"]) else None,
            "adr_ma60": float(row["adr_ma60"]) if pd.notna(row["adr_ma60"]) else None,
        })

    total = len(records)
    for i in range(0, total, BATCH_SIZE):
        batch = records[i:i + BATCH_SIZE]
        upsert_batch(engine, batch)
        logger.info(f"Upserted {min(i + BATCH_SIZE, total)}/{total}")

    logger.info(f"完成！共回填 {total} 筆 ADL 歷史資料。")


if __name__ == "__main__":
    main()
