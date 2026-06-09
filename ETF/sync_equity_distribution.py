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
# mid：200張+ = tier >= 11；whale：1000張+ = tier >= 15
MID_HOLDER_MIN_TIER = 11
WHALE_HOLDER_MIN_TIER = 15
# Tier 17 是集計總列（holder_count = 總股東人數，custody_ratio = 100%），需特別處理
AGGREGATE_TIER = "17"


def _login_finlab() -> bool:
    try:
        finlab.login()
        return True
    except Exception as e:
        logger.error(f"FinLab 登入失敗：{e}")
        return False


def _fetch_inventory() -> pd.DataFrame:
    """取得 FinLab 股東分散表，標準化欄位名稱。"""
    try:
        raw = data.get("inventory")
    except RuntimeError as e:
        msg = str(e)
        if "Usage exceed" in msg or "exceed" in msg.lower():
            logger.warning(f"FinLab 日配額已用盡，略過本次同步：{msg}")
        else:
            logger.error(f"FinLab 取得 inventory 失敗：{msg}")
        return pd.DataFrame()
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


def _compute_tier_pct(period_df: pd.DataFrame, min_tier: int) -> pd.Series:
    """回傳以 stock_id 為 index 的 custody_ratio 加總 Series（排除 tier 17）。"""
    tier_rows = period_df[period_df["tier"].astype(str).astype(int) >= min_tier]
    tier_rows = tier_rows[tier_rows["tier"] != AGGREGATE_TIER]
    return tier_rows.groupby("stock_id")["custody_ratio"].sum()


def _summarise(period_df: pd.DataFrame) -> pd.DataFrame:
    """將單期 inventory 資料聚合為每股一列的 summary。"""
    agg_rows = period_df[period_df["tier"] == AGGREGATE_TIER]
    total_sh = (
        agg_rows.groupby("stock_id")["holder_count"]
        .first()
        .rename("total_shareholders")
    )
    mid_pct = _compute_tier_pct(period_df, MID_HOLDER_MIN_TIER).rename("mid_holder_pct")
    big_pct = _compute_tier_pct(period_df, BIG_HOLDER_MIN_TIER).rename("big_holder_pct")
    whale_pct = _compute_tier_pct(period_df, WHALE_HOLDER_MIN_TIER).rename("whale_holder_pct")
    return pd.concat([total_sh, mid_pct, big_pct, whale_pct], axis=1)


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
    merged["mid_holder_pct_change"] = (
        merged["mid_holder_pct"].fillna(0.0) - merged["mid_holder_pct_prev"].fillna(0.0)
    ).round(3)
    merged["whale_holder_pct_change"] = (
        merged["whale_holder_pct"].fillna(0.0) - merged["whale_holder_pct_prev"].fillna(0.0)
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
                "mid_holder_pct": (
                    round(float(row["mid_holder_pct"]), 3)
                    if pd.notna(row.get("mid_holder_pct"))
                    else None
                ),
                "mid_holder_pct_change": (
                    round(float(row["mid_holder_pct_change"]), 3)
                    if pd.notna(row.get("mid_holder_pct_change"))
                    else None
                ),
                "whale_holder_pct": (
                    round(float(row["whale_holder_pct"]), 3)
                    if pd.notna(row.get("whale_holder_pct"))
                    else None
                ),
                "whale_holder_pct_change": (
                    round(float(row["whale_holder_pct_change"]), 3)
                    if pd.notna(row.get("whale_holder_pct_change"))
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
             shareholders_change_rate, big_holder_pct_change,
             mid_holder_pct, mid_holder_pct_change,
             whale_holder_pct, whale_holder_pct_change,
             stock_name, updated_at)
        VALUES
            (:stock_code, :snapshot_date, :total_shareholders, :big_holder_pct,
             :shareholders_change_rate, :big_holder_pct_change,
             :mid_holder_pct, :mid_holder_pct_change,
             :whale_holder_pct, :whale_holder_pct_change,
             :stock_name, NOW())
        ON CONFLICT (stock_code, snapshot_date) DO UPDATE SET
            total_shareholders       = EXCLUDED.total_shareholders,
            big_holder_pct           = EXCLUDED.big_holder_pct,
            shareholders_change_rate = EXCLUDED.shareholders_change_rate,
            big_holder_pct_change    = EXCLUDED.big_holder_pct_change,
            mid_holder_pct           = EXCLUDED.mid_holder_pct,
            mid_holder_pct_change    = EXCLUDED.mid_holder_pct_change,
            whale_holder_pct         = EXCLUDED.whale_holder_pct,
            whale_holder_pct_change  = EXCLUDED.whale_holder_pct_change,
            stock_name               = EXCLUDED.stock_name,
            updated_at               = NOW()
    """)

    chunk_size = 500
    with storage.engine.connect() as conn:
        for i in range(0, len(records), chunk_size):
            conn.execute(upsert_sql, records[i : i + chunk_size])
        conn.commit()

    logger.info(f"✅ upsert 完成：{len(records)} 筆")


def _get_synced_codes(snapshot_date: str, storage: SQLStorage) -> set[str]:
    """取得本期已寫入的 stock_code 集合。"""
    with storage.engine.connect() as conn:
        rows = conn.execute(
            text("SELECT stock_code FROM equity_distribution_stats WHERE snapshot_date = :d"),
            {"d": snapshot_date},
        ).fetchall()
    return {r[0] for r in rows}


def _get_existing_dates(storage: SQLStorage) -> set[str]:
    """取得 DB 中已存在的 snapshot_date 集合。"""
    with storage.engine.connect() as conn:
        rows = conn.execute(
            text("SELECT DISTINCT snapshot_date FROM equity_distribution_stats")
        ).fetchall()
    return {str(r[0]) for r in rows}


def backfill_history(storage: SQLStorage, force: bool = False) -> None:
    """
    從 FinLab inventory 補存所有尚未入庫的歷史快照。

    只儲存絕對 pct 值（big/mid/whale_holder_pct + total_shareholders），
    不計算 _change 欄位（前端 fetchRankingData 會動態計算多週差異）。
    跳過已存在的 snapshot_date（冪等）。若 force=True，則強制重新計算所有期數（用於補欄位）。
    """
    logger.info("=" * 60)
    logger.info("Backfill 歷史股東分散快照")
    logger.info("=" * 60)

    stock_list = storage.get_all_target_stocks()
    if not stock_list:
        logger.warning("etf_holdings_snapshot 無資料，中止")
        return
    logger.info(f"成分股池：{len(stock_list)} 支")

    if not _login_finlab():
        return

    logger.info("從 FinLab 取得股東分散表（含完整歷史）...")
    inv_df = _fetch_inventory()
    if inv_df.empty:
        logger.error("FinLab inventory 資料為空，中止")
        return

    df = inv_df[inv_df["stock_id"].isin(stock_list)].copy()
    if df.empty:
        logger.warning("成分股池與 inventory 無交集")
        return

    df["date"] = pd.to_datetime(df["date"])
    all_dates = sorted(df["date"].unique())
    logger.info(f"FinLab 共有 {len(all_dates)} 期資料：{all_dates[0].date()} → {all_dates[-1].date()}")

    if force:
        to_process = all_dates
        logger.info(f"--force-backfill 模式：強制重算所有 {len(to_process)} 期（補欄位用）")
    else:
        existing = _get_existing_dates(storage)
        logger.info(f"DB 已有 {len(existing)} 期快照")
        to_process = [d for d in all_dates if d.strftime("%Y-%m-%d") not in existing]
        logger.info(f"待補存：{len(to_process)} 期")
        if not to_process:
            logger.info("所有歷史快照已存在，無需補存（使用 --force-backfill 可強制重算）")
            return

    all_records: list[dict] = []
    for d in to_process:
        date_str = d.strftime("%Y-%m-%d")
        period_df = df[df["date"] == d]
        summary = _summarise(period_df)

        for stock_code, row in summary.iterrows():
            all_records.append({
                "stock_code": str(stock_code),
                "snapshot_date": date_str,
                "total_shareholders": int(row["total_shareholders"]) if pd.notna(row.get("total_shareholders")) else None,
                "big_holder_pct": round(float(row["big_holder_pct"]), 3) if pd.notna(row.get("big_holder_pct")) else None,
                "mid_holder_pct": round(float(row["mid_holder_pct"]), 3) if pd.notna(row.get("mid_holder_pct")) else None,
                "whale_holder_pct": round(float(row["whale_holder_pct"]), 3) if pd.notna(row.get("whale_holder_pct")) else None,
                "shareholders_change_rate": None,
                "big_holder_pct_change": None,
                "mid_holder_pct_change": None,
                "whale_holder_pct_change": None,
                "stock_name": None,
            })

    logger.info(f"共 {len(all_records)} 筆待寫入，開始補充名稱...")
    all_records = _enrich_stock_names(all_records, storage)
    _upsert(all_records, storage)
    logger.info(f"✅ Backfill 完成：補存 {len(to_process)} 期歷史快照")


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
    parser.add_argument("--backfill-history", action="store_true", help="補存 FinLab 所有歷史快照（冪等，跳過已存在的期數）")
    parser.add_argument("--force-backfill", action="store_true", help="強制重算所有歷史期數並 upsert（用於新增欄位後回填，如 mid/whale_holder_pct）")
    parser.add_argument("--force", action="store_true", help="強制重寫（跳過已存在的 snapshot_date 保護，用於補欄位）")
    args = parser.parse_args()

    storage = SQLStorage()

    if args.backfill_names:
        backfill_names(storage)
        return

    if args.force_backfill:
        backfill_history(storage, force=True)
        return

    if args.backfill_history:
        backfill_history(storage)
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

    # 2. 快速預檢：純 DB 查詢，確認是否有新成分股需要補入（不呼叫 FinLab，節省配額）
    if not args.force:
        with storage.engine.connect() as conn:
            latest_row = conn.execute(
                text("SELECT snapshot_date FROM equity_distribution_stats ORDER BY snapshot_date DESC LIMIT 1")
            ).fetchone()
        if latest_row:
            synced_codes = _get_synced_codes(str(latest_row[0]), storage)
            missing = set(stock_list) - synced_codes
            if not missing:
                logger.info(f"目標股票已全數同步 ({latest_row[0]})，無需 FinLab 請求，略過")
                return
            logger.info(f"發現 {len(missing)} 支新成分股待補充，繼續同步...")

    # 3. FinLab 登入
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

    # 5. 只補缺的股票（冪等保護：新成分股出現時也能即時補入）
    snapshot_date = records[0]["snapshot_date"]
    if not args.force:
        synced_codes = _get_synced_codes(snapshot_date, storage)
        records = [r for r in records if r["stock_code"] not in synced_codes]
        if not records:
            logger.info(f"本期資料 ({snapshot_date}) 所有目標股票已同步，略過寫入")
            return
        logger.info(f"本期新增待補充：{len(records)} 支（已有 {len(synced_codes)} 支）")

    # 6. 補充股票名稱
    records = _enrich_stock_names(records, storage)

    # 7. 寫入 DB
    _upsert(records, storage)
    logger.info("同步完成")


if __name__ == "__main__":
    main()
