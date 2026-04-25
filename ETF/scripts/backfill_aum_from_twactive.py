"""
Backfill ETF AUM 歷史資料

從 reference/tw-active/site/preview/scale.json 批次匯入所有 ETF 的
歷史 AUM 時序資料到 etf_aum_series 表。

執行：
    uv run python ETF/scripts/backfill_aum_from_twactive.py

選項：
    --dry-run   只印出統計，不寫入 DB
    --etf CODE  只處理指定 ETF（可重複使用）
"""
from __future__ import annotations

import argparse
import json
import logging
import os
import sys
from datetime import datetime
from pathlib import Path

# 加入專案根目錄到 sys.path
sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

from dotenv import load_dotenv
load_dotenv(Path(__file__).resolve().parents[2] / ".env.local")
load_dotenv(Path(__file__).resolve().parents[2] / ".env")

from sqlalchemy import create_engine, text

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
logger = logging.getLogger(__name__)

SCALE_JSON = Path(__file__).resolve().parents[2] / "reference" / "tw-active" / "site" / "preview" / "scale.json"


def parse_args() -> argparse.Namespace:
    p = argparse.ArgumentParser(description="Backfill etf_aum_series from scale.json")
    p.add_argument("--dry-run", action="store_true", help="只印統計，不寫入 DB")
    p.add_argument("--etf", action="append", metavar="CODE", help="只處理指定 ETF，可重複")
    return p.parse_args()


def load_scale(path: Path) -> dict:
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


def build_records(etf_entry: dict) -> list[dict]:
    """將 scale.json 的 series 轉換為 etf_aum_series 記錄"""
    code = etf_entry["code"]
    records = []
    for s in etf_entry.get("series") or []:
        raw_date = s.get("date", "")
        if len(raw_date) == 8:  # YYYYMMDD
            data_date = f"{raw_date[:4]}-{raw_date[4:6]}-{raw_date[6:8]}"
        else:
            data_date = raw_date  # 已是 YYYY-MM-DD

        aum = s.get("aum")
        nav = s.get("nav")
        units = s.get("units")  # scale.json 的 units 已是億份
        inflow = s.get("inflow")

        if aum is None or nav is None:
            continue

        records.append({
            "etf_code": code,
            "data_date": data_date,
            "aum_100m": round(float(aum), 6),
            "nav": round(float(nav), 4),
            "units": round(float(units), 6) if units is not None else None,
            "inflow_100m": round(float(inflow), 6) if inflow is not None else None,
        })
    return records


def upsert_batch(engine, records: list[dict]) -> int:
    sql = text("""
        INSERT INTO etf_aum_series
            (etf_code, data_date, aum_100m, nav, units, inflow_100m)
        VALUES
            (:etf_code, :data_date, :aum_100m, :nav, :units, :inflow_100m)
        ON CONFLICT (etf_code, data_date) DO UPDATE SET
            aum_100m    = EXCLUDED.aum_100m,
            nav         = EXCLUDED.nav,
            units       = EXCLUDED.units,
            inflow_100m = COALESCE(EXCLUDED.inflow_100m, etf_aum_series.inflow_100m)
    """)
    with engine.connect() as conn:
        conn.execute(sql, records)
        conn.commit()
    return len(records)


def main() -> None:
    args = parse_args()

    db_url = os.getenv("DATABASE_URL")
    if not db_url and not args.dry_run:
        logger.error("DATABASE_URL not set. Set it in .env or .env.local")
        sys.exit(1)

    logger.info("Loading scale.json from %s", SCALE_JSON)
    data = load_scale(SCALE_JSON)
    etfs = data["etfs"]
    as_of = data.get("as_of", "unknown")
    logger.info("scale.json: %d ETFs, as_of=%s", len(etfs), as_of)

    target_codes = set(c.upper() for c in args.etf) if args.etf else None

    engine = None
    if not args.dry_run:
        engine = create_engine(db_url)

    total_records = 0
    for etf_entry in etfs:
        code = etf_entry["code"]
        if target_codes and code.upper() not in target_codes:
            continue

        records = build_records(etf_entry)
        total_records += len(records)

        if args.dry_run:
            first = records[0]["data_date"] if records else "N/A"
            last = records[-1]["data_date"] if records else "N/A"
            logger.info("[dry-run] %s: %d records (%s → %s)", code, len(records), first, last)
        else:
            n = upsert_batch(engine, records)
            logger.info("Upserted %d records for %s", n, code)

    logger.info("Done. Total records processed: %d", total_records)


if __name__ == "__main__":
    main()
