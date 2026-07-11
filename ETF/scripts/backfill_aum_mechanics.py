"""一次性回補 etf_aum_series 市場機制欄位與配息史（etf-market-mechanics 任務 2.4）

對既有歷史列補算：
  - close：FinLab 歷史收盤價（price:收盤價，僅取與 data_date 完全同日的價格）
  - premium_pct / inflow / market_pnl：重用 aum_sync_step 的純函式（單一事實來源）
  - 配息史：DividendSyncStep 全量窗口冪等 upsert

執行：
    uv run python ETF/scripts/backfill_aum_mechanics.py

選項：
    --dry-run         只印統計與抽查，不寫入 DB
    --etf CODE        只處理指定 ETF（可重複使用）
    --skip-dividends  跳過配息史回補
"""

from __future__ import annotations

import argparse
import logging
import os
import sys
from pathlib import Path
from types import SimpleNamespace

# 加入專案根目錄到 sys.path
sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

from dotenv import load_dotenv

load_dotenv(Path(__file__).resolve().parents[2] / ".env.local")
load_dotenv(Path(__file__).resolve().parents[2] / ".env")

import pandas as pd  # noqa: E402
from sqlalchemy import create_engine, text  # noqa: E402

from ETF.pipeline.steps.aum_sync_step import (  # noqa: E402
    compute_decomposition,
    compute_premium_pct,
    is_prev_row_stale,
)

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
logger = logging.getLogger(__name__)


def parse_args() -> argparse.Namespace:
    p = argparse.ArgumentParser(description="Backfill etf_aum_series mechanics columns")
    p.add_argument("--dry-run", action="store_true", help="只印統計，不寫入 DB")
    p.add_argument("--etf", action="append", metavar="CODE", help="只處理指定 ETF，可重複")
    p.add_argument("--skip-dividends", action="store_true", help="跳過配息史回補")
    return p.parse_args()


def load_close_df() -> pd.DataFrame:
    """取 FinLab 全歷史收盤價（一次下載，含全部上市 ETF）。"""
    from ETF.services.finlab_service import FinlabService

    finlab = FinlabService()
    if not finlab.login():
        raise RuntimeError("FinLab 登入失敗，無法取得歷史收盤價")
    close_df = finlab._get_data("close")
    if close_df is None or close_df.empty:
        raise RuntimeError("FinLab close 資料為空")
    return close_df


def build_updates(rows: list, close_df: pd.DataFrame) -> list[dict]:
    """依 etf_code 分組、按日期序補算四欄。rows 需已按 (etf_code, data_date) 排序。"""
    updates: list[dict] = []
    prev_by_etf: dict[str, dict] = {}
    for r in rows:
        etf_code, data_date = r.etf_code, r.data_date
        ts = pd.Timestamp(data_date)
        close = None
        if etf_code in close_df.columns and ts in close_df.index:
            v = close_df.at[ts, etf_code]
            close = round(float(v), 4) if pd.notna(v) else None

        prev = prev_by_etf.get(etf_code) or {}
        if is_prev_row_stale(prev.get("data_date"), data_date):
            inflow, market_pnl = None, None
        else:
            inflow, market_pnl = compute_decomposition(
                r.units, r.nav, prev.get("units"), prev.get("nav")
            )
        updates.append(
            {
                "etf_code": etf_code,
                "data_date": str(data_date),
                "close": close,
                "premium_pct": compute_premium_pct(close, r.nav),
                "inflow": inflow,
                "market_pnl": market_pnl,
            }
        )
        prev_by_etf[etf_code] = {
            "data_date": str(data_date),
            "units": r.units,
            "nav": r.nav,
        }
    return updates


def main() -> None:
    args = parse_args()
    engine = create_engine(os.environ["DATABASE_URL"])

    sql_read = "SELECT etf_code, data_date, nav, units FROM etf_aum_series"
    params: dict = {}
    if args.etf:
        sql_read += " WHERE etf_code = ANY(:codes)"
        params["codes"] = args.etf
    sql_read += " ORDER BY etf_code, data_date"
    with engine.connect() as conn:
        rows = conn.execute(text(sql_read), params).fetchall()
    logger.info("讀取 %d 列 etf_aum_series", len(rows))

    close_df = load_close_df()
    updates = build_updates(rows, close_df)

    n_close = sum(1 for u in updates if u["close"] is not None)
    n_premium = sum(1 for u in updates if u["premium_pct"] is not None)
    n_inflow = sum(1 for u in updates if u["inflow"] is not None)
    logger.info(
        "回補統計：%d 列，close %d、premium_pct %d、inflow %d",
        len(updates),
        n_close,
        n_premium,
        n_inflow,
    )

    # 抽查：第一筆 premium_pct 非空的列，印出手算對照
    sample = next((u for u in updates if u["premium_pct"] is not None), None)
    if sample:
        row = next(
            r
            for r in rows
            if r.etf_code == sample["etf_code"]
            and str(r.data_date) == sample["data_date"]
        )
        manual = (sample["close"] - float(row.nav)) / float(row.nav) * 100
        logger.info(
            "抽查 %s %s：close=%s nav=%s premium_pct=%s（手算 %.2f）",
            sample["etf_code"],
            sample["data_date"],
            sample["close"],
            row.nav,
            sample["premium_pct"],
            manual,
        )

    if args.dry_run:
        logger.info("--dry-run：不寫入 DB")
        return

    sql_update = text("""
        UPDATE etf_aum_series SET
            close       = :close,
            premium_pct = :premium_pct,
            inflow      = :inflow,
            market_pnl  = :market_pnl
        WHERE etf_code = :etf_code AND data_date = :data_date
    """)
    with engine.connect() as conn:
        conn.execute(sql_update, updates)
        conn.commit()
    logger.info("已更新 %d 列", len(updates))

    if not args.skip_dividends:
        from ETF.pipeline.steps.dividend_sync_step import DividendSyncStep

        services = SimpleNamespace(sql_storage=SimpleNamespace(engine=engine))
        DividendSyncStep()._sync_all(services)
        logger.info("配息史回補完成")


if __name__ == "__main__":
    main()
