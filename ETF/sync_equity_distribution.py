"""
ETF 成分股股東分散統計週同步腳本

每週從 FinLab 拉取 TDCC 股東分散表，計算大戶持股比例與總股東人數變化，
寫入 equity_distribution_stats 供前端排行榜使用。

股票池動態從 etf_holdings_snapshot 讀取，新增 ETF 後無需修改此腳本。
"""

import os
import sys
import logging
from pathlib import Path
from dotenv import load_dotenv

ETF_DIR = Path(__file__).parent
project_root = ETF_DIR.parent
sys.path.insert(0, str(project_root))

load_dotenv(project_root / ".env.local")

import finlab
import pandas as pd
from finlab import data
from sqlalchemy import text

from ETF.database.sql_storage import SQLStorage

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)

# 大戶定義：持股 400 張以上（400,000 股）= tier >= 12
BIG_HOLDER_MIN_TIER = 12
# Tier 17 是集計總列（holder_count = 總股東人數，custody_ratio = 100%），需特別處理
AGGREGATE_TIER = "17"


def _login_finlab() -> bool:
    api_key = os.getenv("FINLAB_API_KEY")
    if not api_key:
        logger.error("FINLAB_API_KEY 未設定")
        return False
    try:
        finlab.login(api_key)
        return True
    except Exception as e:
        logger.error(f"FinLab 登入失敗：{e}")
        return False


def _fetch_inventory() -> pd.DataFrame:
    """取得 FinLab 股東分散表，標準化欄位名稱。"""
    raw = data.get("inventory")
    if raw is None or raw.empty:
        return pd.DataFrame()

    # FinLab inventory 欄位固定順序，但名稱在 Windows 可能顯示亂碼
    # 安全做法：依位置重命名，保留 symbol / date / stock_id
    cols = list(raw.columns)
    rename = {
        cols[2]: "tier",
        cols[3]: "holder_count",
        cols[4]: "shares_held",
        cols[5]: "custody_ratio",
    }
    return raw.rename(columns=rename)


def _compute_stats(df: pd.DataFrame, stock_list: list) -> list[dict]:
    """
    從 inventory DataFrame 計算每股最新一期與前期的統計差值。

    Returns:
        List of dicts ready for upsert into equity_distribution_stats.
    """
    df = df[df["stock_id"].isin(stock_list)].copy()
    if df.empty:
        logger.warning("成分股池與 inventory 無交集，無資料可計算")
        return []

    df["date"] = pd.to_datetime(df["date"])
    all_dates = sorted(df["date"].unique())
    if len(all_dates) < 2:
        logger.warning("inventory 資料不足兩期，無法計算差值")
        return []

    latest_date = all_dates[-1]
    prev_date = all_dates[-2]
    logger.info(f"計算期間：{prev_date.date()} → {latest_date.date()}")

    def _summarise(period_df: pd.DataFrame) -> pd.DataFrame:
        """將單期 inventory 資料聚合為每股一列的 summary。"""
        agg_rows = period_df[period_df["tier"] == AGGREGATE_TIER]
        big_rows = period_df[period_df["tier"].astype(str).astype(int) >= BIG_HOLDER_MIN_TIER]
        big_rows = big_rows[big_rows["tier"] != AGGREGATE_TIER]

        total_sh = (
            agg_rows.groupby("stock_id")["holder_count"]
            .first()
            .rename("total_shareholders")
        )
        big_pct = (
            big_rows.groupby("stock_id")["custody_ratio"]
            .sum()
            .rename("big_holder_pct")
        )
        return pd.concat([total_sh, big_pct], axis=1)

    latest_df = df[df["date"] == latest_date]
    prev_df = df[df["date"] == prev_date]

    latest_summary = _summarise(latest_df)
    prev_summary = _summarise(prev_df)

    merged = latest_summary.join(prev_summary, rsuffix="_prev", how="inner")

    merged["shareholders_change_rate"] = (
        (merged["total_shareholders"] - merged["total_shareholders_prev"])
        / merged["total_shareholders_prev"]
        * 100
    ).round(4)
    merged["big_holder_pct_change"] = (
        merged["big_holder_pct"] - merged["big_holder_pct_prev"]
    ).round(3)

    records = []
    for stock_code, row in merged.iterrows():
        records.append(
            {
                "stock_code": str(stock_code),
                "snapshot_date": latest_date.strftime("%Y-%m-%d"),
                "total_shareholders": (
                    int(row["total_shareholders"])
                    if pd.notna(row["total_shareholders"])
                    else None
                ),
                "big_holder_pct": (
                    round(float(row["big_holder_pct"]), 3)
                    if pd.notna(row["big_holder_pct"])
                    else None
                ),
                "shareholders_change_rate": (
                    round(float(row["shareholders_change_rate"]), 4)
                    if pd.notna(row["shareholders_change_rate"])
                    else None
                ),
                "big_holder_pct_change": (
                    round(float(row["big_holder_pct_change"]), 3)
                    if pd.notna(row["big_holder_pct_change"])
                    else None
                ),
            }
        )

    logger.info(f"計算完成：{len(records)} 支股票")
    return records


def _enrich_stock_names(records: list[dict], storage: SQLStorage) -> list[dict]:
    """從多個資料來源補充股票名稱，優先序：stock_basic_info > etf_holdings_snapshot。"""
    codes = [r["stock_code"] for r in records]
    name_map: dict[str, str] = {}
    try:
        with storage.engine.connect() as conn:
            # 低優先：etf_holdings_snapshot（可能有多筆，取最新一筆）
            etf_rows = conn.execute(
                text(
                    "SELECT DISTINCT ON (stock_code) stock_code, stock_name "
                    "FROM etf_holdings_snapshot "
                    "WHERE stock_code = ANY(:codes) AND stock_name IS NOT NULL "
                    "ORDER BY stock_code, data_date DESC"
                ),
                {"codes": codes},
            ).fetchall()
            for r in etf_rows:
                name_map[r[0]] = r[1]

            # 高優先：stock_basic_info（覆蓋上面的值）
            basic_rows = conn.execute(
                text(
                    "SELECT stock_code, name_short FROM stock_basic_info "
                    "WHERE stock_code = ANY(:codes) AND name_short IS NOT NULL"
                ),
                {"codes": codes},
            ).fetchall()
            for r in basic_rows:
                name_map[r[0]] = r[1]

        for rec in records:
            rec["stock_name"] = name_map.get(rec["stock_code"])

        filled = sum(1 for r in records if r.get("stock_name"))
        logger.info(f"股票名稱補充完成：{filled}/{len(records)} 支有名稱")
    except Exception as e:
        logger.warning(f"補充股票名稱失敗（不影響主流程）：{e}")
    return records


def _upsert(records: list[dict], storage: SQLStorage) -> None:
    """Upsert records into equity_distribution_stats（冪等）。"""
    if not records:
        return

    upsert_sql = text("""
        INSERT INTO equity_distribution_stats
            (stock_code, snapshot_date, total_shareholders, big_holder_pct,
             shareholders_change_rate, big_holder_pct_change, stock_name, updated_at)
        VALUES
            (:stock_code, :snapshot_date, :total_shareholders, :big_holder_pct,
             :shareholders_change_rate, :big_holder_pct_change, :stock_name, NOW())
        ON CONFLICT (stock_code, snapshot_date) DO UPDATE SET
            total_shareholders       = EXCLUDED.total_shareholders,
            big_holder_pct           = EXCLUDED.big_holder_pct,
            shareholders_change_rate = EXCLUDED.shareholders_change_rate,
            big_holder_pct_change    = EXCLUDED.big_holder_pct_change,
            stock_name               = EXCLUDED.stock_name,
            updated_at               = NOW()
    """)

    chunk_size = 500
    with storage.engine.connect() as conn:
        for i in range(0, len(records), chunk_size):
            conn.execute(upsert_sql, records[i : i + chunk_size])
        conn.commit()

    logger.info(f"✅ upsert 完成：{len(records)} 筆")


def _already_synced(snapshot_date: str, storage: SQLStorage) -> bool:
    """檢查本期資料是否已寫入（冪等保護）。"""
    with storage.engine.connect() as conn:
        count = conn.execute(
            text(
                "SELECT COUNT(*) FROM equity_distribution_stats "
                "WHERE snapshot_date = :d"
            ),
            {"d": snapshot_date},
        ).scalar()
    return (count or 0) > 0


def backfill_names(storage: SQLStorage) -> None:
    """只補充 equity_distribution_stats 現有資料的 stock_name，不重算統計。"""
    logger.info("=" * 60)
    logger.info("Backfill 股票名稱（不重算統計）")
    logger.info("=" * 60)

    with storage.engine.connect() as conn:
        rows = conn.execute(
            text("SELECT DISTINCT stock_code FROM equity_distribution_stats")
        ).fetchall()
    codes = [r[0] for r in rows]
    logger.info(f"找到 {len(codes)} 支股票需要補充名稱")

    # 複用 _enrich_stock_names 的查找邏輯
    dummy_records = [{"stock_code": c} for c in codes]
    enriched = _enrich_stock_names(dummy_records, storage)
    name_map = {r["stock_code"]: r.get("stock_name") for r in enriched if r.get("stock_name")}

    if not name_map:
        logger.warning("未找到任何名稱，中止")
        return

    update_sql = text(
        "UPDATE equity_distribution_stats SET stock_name = :name "
        "WHERE stock_code = :code AND (stock_name IS NULL OR stock_name != :name)"
    )
    with storage.engine.connect() as conn:
        for code, name in name_map.items():
            conn.execute(update_sql, {"code": code, "name": name})
        conn.commit()

    logger.info(f"✅ Backfill 完成：{len(name_map)} 支有名稱")


def main() -> None:
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument("--backfill-names", action="store_true", help="只補充現有資料的股票名稱，不重算統計")
    args = parser.parse_args()

    storage = SQLStorage()

    if args.backfill_names:
        backfill_names(storage)
        return

    logger.info("=" * 60)
    logger.info("開始同步 ETF 成分股股東分散統計")
    logger.info("=" * 60)

    # 1. 動態取得成分股池（不寫死 ETF 代碼）
    stock_list = storage.get_all_target_stocks()
    if not stock_list:
        logger.warning("etf_holdings_snapshot 無資料，中止同步")
        return
    logger.info(f"成分股池：{len(stock_list)} 支")

    # 2. FinLab 登入
    if not _login_finlab():
        return

    # 3. 取得 inventory
    logger.info("從 FinLab 取得股東分散表...")
    inv_df = _fetch_inventory()
    if inv_df.empty:
        logger.error("FinLab inventory 資料為空，中止")
        return

    # 4. 計算統計差值
    records = _compute_stats(inv_df, stock_list)
    if not records:
        return

    # 5. 本週無新公告保護（同一 snapshot_date 已存在則略過）
    snapshot_date = records[0]["snapshot_date"]
    if _already_synced(snapshot_date, storage):
        logger.info(f"本期資料 ({snapshot_date}) 已存在，略過寫入")
        return

    # 6. 補充股票名稱
    records = _enrich_stock_names(records, storage)

    # 7. 寫入 DB
    _upsert(records, storage)
    logger.info("同步完成")


if __name__ == "__main__":
    main()
