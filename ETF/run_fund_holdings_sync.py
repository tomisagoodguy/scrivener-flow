"""基金持股月頻同步腳本 — 經理人雙軌訊號資料層。

流程：
    1. 載入 `fund_manager_map`（正常模式讀 DB `valid_to IS NULL`；`--dry-run` 用 seed fallback）。
    2. 判定 SITCA 月報（IN2629）/ 季報（IN2630）目前最新期別。
    3. 逐 comid 抓月報 + 季報，單一 comid 失敗（爬蟲已內建重試）不中斷其餘 comid。
    4. 正規化基金名 → canonical `fund_short`，白名單外基金收進 unmatched；
       comid 一律寫 `fund_manager_map` 的 canonical comid，不用爬蟲回傳值。
    5. upsert `fund_holdings_monthly`（source='sitca'）與 `fund_holdings_quarterly`。
    6. 訊號階段：從 DB 讀近 12 個月月報、近 2 季季報、ETF 持股最新快照 → 呼叫
       `fund_signals.detect_signals()` → upsert `fund_signals`。訊號失敗不回滾
       holdings，但整體 exit code 非 0。
    7. 印同步摘要（各表 upsert 筆數、unmatched、失敗 comid、逾期未更新的 map 條目）。

用法：
    uv run python ETF/run_fund_holdings_sync.py              # 正式執行，寫入 DB
    uv run python ETF/run_fund_holdings_sync.py --dry-run    # 只抓取 + 解析，不連 DB
"""

from __future__ import annotations

import argparse
import json
import logging
import sys
from datetime import date
from pathlib import Path
from typing import Any, Callable

ETF_DIR = Path(__file__).parent
PROJECT_ROOT = ETF_DIR.parent
sys.path.insert(0, str(PROJECT_ROOT))

from dotenv import load_dotenv  # noqa: E402
from sqlalchemy import text  # noqa: E402

logging.basicConfig(
    level=logging.INFO,
    format="[%(levelname)s] %(name)s — %(message)s",
)
logger = logging.getLogger("run_fund_holdings_sync")

STALENESS_THRESHOLD_DAYS = 180
MONTHLY_HISTORY_MONTHS = 12
QUARTERLY_HISTORY_QUARTERS = 2

_MONTHLY_UPSERT_SQL = text("""
    INSERT INTO fund_holdings_monthly
        (ym, fund_short, comid, rank, stock_code, stock_name, amount, pct, source)
    VALUES
        (:ym, :fund_short, :comid, :rank, :stock_code, :stock_name, :amount, :pct, :source)
    ON CONFLICT (ym, fund_short, stock_code, source) DO UPDATE SET
        comid       = EXCLUDED.comid,
        rank        = EXCLUDED.rank,
        stock_name  = EXCLUDED.stock_name,
        amount      = EXCLUDED.amount,
        pct         = EXCLUDED.pct,
        ingested_at = NOW()
""")

_QUARTERLY_UPSERT_SQL = text("""
    INSERT INTO fund_holdings_quarterly
        (yq, fund_short, comid, stock_code, stock_name, amount, pct)
    VALUES
        (:yq, :fund_short, :comid, :stock_code, :stock_name, :amount, :pct)
    ON CONFLICT (yq, fund_short, stock_code) DO UPDATE SET
        comid       = EXCLUDED.comid,
        stock_name  = EXCLUDED.stock_name,
        amount      = EXCLUDED.amount,
        pct         = EXCLUDED.pct,
        ingested_at = NOW()
""")

_SIGNALS_UPSERT_SQL = text("""
    INSERT INTO fund_signals
        (signal_type, stock_code, period, strength, fund_names, metadata)
    VALUES
        (:signal_type, :stock_code, :period, :strength,
         CAST(:fund_names AS jsonb), CAST(:metadata AS jsonb))
    ON CONFLICT (signal_type, stock_code, period) DO UPDATE SET
        strength   = EXCLUDED.strength,
        fund_names = EXCLUDED.fund_names,
        metadata   = EXCLUDED.metadata
""")


# ---------------------------------------------------------------------------
# 純函式：月份區間 / staleness（不碰網路、不連 DB）
# ---------------------------------------------------------------------------


def _iter_yyyymm(from_ym: str, to_ym: str) -> list[str]:
    """回傳 `from_ym` 到 `to_ym`（含端點）的 YYYYMM 清單，正確處理跨年。

    Args:
        from_ym: 起始月份，格式 YYYYMM。
        to_ym: 結束月份，格式 YYYYMM（須 >= from_ym）。

    Returns:
        list[str]: 遞增排序的 YYYYMM 清單。
    """
    y, m = int(from_ym[:4]), int(from_ym[4:])
    end_y, end_m = int(to_ym[:4]), int(to_ym[4:])
    out: list[str] = []
    while (y, m) <= (end_y, end_m):
        out.append(f"{y:04d}{m:02d}")
        m += 1
        if m > 12:
            m = 1
            y += 1
    return out


def _trailing_yyyymm(period: str, n: int) -> list[str]:
    """回傳含 `period` 本身、往前推 n-1 個月的 YYYYMM 清單（遞增排序）。

    Args:
        period: 基準月份，格式 YYYYMM。
        n: 總共要回傳幾個月（含 period 本身）。

    Returns:
        list[str]: 遞增排序的 YYYYMM 清單，長度為 n。
    """
    y, m = int(period[:4]), int(period[4:])
    months: list[str] = []
    for _ in range(n):
        months.append(f"{y:04d}{m:02d}")
        m -= 1
        if m < 1:
            m = 12
            y -= 1
    return sorted(months)


def _stale_map_entries(
    map_rows: list[dict[str, Any]], today: date, threshold_days: int = STALENESS_THRESHOLD_DAYS
) -> list[dict[str, Any]]:
    """回傳 `valid_from` 距今超過 `threshold_days` 天的 map 條目（提醒檢查經理人異動）。

    Args:
        map_rows: `fund_manager_map` 條目清單，每筆含 `fund_short`、`valid_from`。
            `valid_from` 為 `None`（如 dry-run seed 資料）者略過，不視為 stale。
        today: 判定基準日期。
        threshold_days: 逾期門檻天數。

    Returns:
        list[dict[str, Any]]: 逾期的 map 條目（原始 dict）。
    """
    stale: list[dict[str, Any]] = []
    for row in map_rows:
        vf = row.get("valid_from")
        if vf is None:
            continue
        if isinstance(vf, str):
            vf = date.fromisoformat(vf)
        if (today - vf).days > threshold_days:
            stale.append(row)
    return stale


# ---------------------------------------------------------------------------
# fund_manager_map 載入
# ---------------------------------------------------------------------------


def _load_manager_map(engine: Any = None, use_seed: bool = False) -> list[dict[str, Any]]:
    """載入基金/ETF 經理人對照表。

    Args:
        engine: SQLAlchemy engine，`use_seed=False` 時必填。
        use_seed: True 時改用 `fund_manager_map.FUND_MANAGER_SEED`（供 dry-run / 離線測試）。

    Returns:
        list[dict[str, Any]]: 每筆含 `fund_short`、`comid`、`fund_full_names`、
            `etf_code`、`manager`、`type`、`valid_from`、`valid_to`。
    """
    if use_seed:
        from ETF.config.fund_manager_map import FUND_MANAGER_SEED

        return [
            {
                "fund_short": entry["fund_short"],
                "comid": entry["comid"],
                "fund_full_names": entry["fund_full_names"],
                "etf_code": entry.get("etf_code"),
                "manager": entry["manager"],
                "type": entry["type"],
                "valid_from": None,
                "valid_to": None,
            }
            for entry in FUND_MANAGER_SEED
        ]

    if engine is None:
        raise ValueError("engine 為必填（use_seed=False 時）")

    with engine.connect() as conn:
        result = conn.execute(
            text(
                """
                SELECT fund_short, comid, fund_full_names, etf_code, manager, type,
                       valid_from, valid_to
                FROM fund_manager_map
                WHERE valid_to IS NULL
                """
            )
        )
        rows = [dict(r) for r in result.mappings().all()]

    for row in rows:
        names = row["fund_full_names"]
        if isinstance(names, str):
            row["fund_full_names"] = json.loads(names)

    return rows


def _build_normalizer_mapping(map_rows: list[dict[str, Any]]) -> dict[str, list[str]]:
    """把 map_rows 轉為 `fund_name_normalizer.normalize_to_fund_short()` 需要的 mapping。"""
    return {row["fund_short"]: row["fund_full_names"] for row in map_rows}


# ---------------------------------------------------------------------------
# 逐 comid 抓取（單一失敗不中斷其餘）
# ---------------------------------------------------------------------------


def _fetch_holdings_for_comids(
    fetch_fn: Callable[..., list[dict[str, Any]]], period: str, comids: list[str]
) -> tuple[dict[str, list[dict[str, Any]]], list[str]]:
    """逐 comid 呼叫 `fetch_fn(period, comid=comid)`，單一 comid 失敗記錄後繼續其餘。

    Args:
        fetch_fn: `sitca_scraper.fetch_monthly` 或 `fetch_quarterly`。
        period: 期別（YYYYMM）。
        comids: 要抓取的 comid 清單。

    Returns:
        tuple[dict[str, list[dict]], list[str]]: (comid → rows, 失敗的 comid 清單)。
    """
    results: dict[str, list[dict[str, Any]]] = {}
    failed: list[str] = []
    for comid in comids:
        try:
            results[comid] = fetch_fn(period, comid=comid)
        except Exception as exc:  # noqa: BLE001 — 需捕捉任何爬蟲例外以隔離單一 comid
            logger.error("SITCA comid=%s period=%s 抓取失敗：%s", comid, period, exc)
            failed.append(comid)
    return results, failed


# ---------------------------------------------------------------------------
# 正規化 + upsert dict 轉換
# ---------------------------------------------------------------------------


def _sitca_rows_to_monthly_upserts(
    ym: str,
    comid_rows: dict[str, list[dict[str, Any]]],
    mapping: dict[str, list[str]],
    fund_short_to_comid: dict[str, str],
) -> tuple[list[dict[str, Any]], list[dict[str, Any]]]:
    """把 SITCA 月報原始列轉為 `fund_holdings_monthly` upsert dict。

    comid 一律改寫為 `fund_short_to_comid` 的 canonical comid（找不到則 fallback 用查詢時的 comid）。

    Returns:
        tuple[list[dict], list[dict]]: (upsert 列表, unmatched 列表)。
    """
    from ETF.utils.fund_name_normalizer import normalize_to_fund_short

    upserts: list[dict[str, Any]] = []
    unmatched: list[dict[str, Any]] = []
    for queried_comid, rows in comid_rows.items():
        for row in rows:
            fund_short = normalize_to_fund_short(row["fund_name_raw"], mapping)
            if fund_short is None:
                unmatched.append(
                    {"fund_name_raw": row["fund_name_raw"], "comid": queried_comid, "source": "sitca_monthly"}
                )
                continue
            canonical_comid = fund_short_to_comid.get(fund_short, queried_comid)
            upserts.append(
                {
                    "ym": ym,
                    "fund_short": fund_short,
                    "comid": canonical_comid,
                    "rank": row.get("rank"),
                    "stock_code": row["stock_code"],
                    "stock_name": row.get("stock_name"),
                    "amount": row.get("amount"),
                    "pct": row.get("pct"),
                    "source": "sitca",
                }
            )
    return upserts, unmatched


def _sitca_rows_to_quarterly_upserts(
    yq: str,
    comid_rows: dict[str, list[dict[str, Any]]],
    mapping: dict[str, list[str]],
    fund_short_to_comid: dict[str, str],
) -> tuple[list[dict[str, Any]], list[dict[str, Any]]]:
    """把 SITCA 季報原始列轉為 `fund_holdings_quarterly` upsert dict。

    Returns:
        tuple[list[dict], list[dict]]: (upsert 列表, unmatched 列表)。
    """
    from ETF.utils.fund_name_normalizer import normalize_to_fund_short

    upserts: list[dict[str, Any]] = []
    unmatched: list[dict[str, Any]] = []
    for queried_comid, rows in comid_rows.items():
        for row in rows:
            fund_short = normalize_to_fund_short(row["fund_name_raw"], mapping)
            if fund_short is None:
                unmatched.append(
                    {"fund_name_raw": row["fund_name_raw"], "comid": queried_comid, "source": "sitca_quarterly"}
                )
                continue
            canonical_comid = fund_short_to_comid.get(fund_short, queried_comid)
            upserts.append(
                {
                    "yq": yq,
                    "fund_short": fund_short,
                    "comid": canonical_comid,
                    "stock_code": row["stock_code"],
                    "stock_name": row.get("stock_name"),
                    "amount": row.get("amount"),
                    "pct": row.get("pct"),
                }
            )
    return upserts, unmatched


def _mops_funds_to_monthly_upserts(
    ym: str, funds: list[dict[str, Any]], fund_short_to_comid: dict[str, str]
) -> list[dict[str, Any]]:
    """把 `mops_fund_scraper.fetch_monthly()` 的 `funds` 轉為 `fund_holdings_monthly` upsert dict。

    MOPS 不提供金額，`amount` 一律為 None；comid 改寫為 canonical comid。
    供 `ETF/scripts/backfill_fund_holdings_mops.py` 重用。
    """
    rows: list[dict[str, Any]] = []
    for fund in funds:
        fund_short = fund["fund_short"]
        canonical_comid = fund_short_to_comid.get(fund_short, fund["comid"])
        for item in fund["top5"]:
            rows.append(
                {
                    "ym": ym,
                    "fund_short": fund_short,
                    "comid": canonical_comid,
                    "rank": item["rank"],
                    "stock_code": item["stock_code"],
                    "stock_name": item.get("stock_name"),
                    "amount": None,
                    "pct": item.get("pct"),
                    "source": "mops",
                }
            )
    return rows


# ---------------------------------------------------------------------------
# DB upsert
# ---------------------------------------------------------------------------


def _upsert_rows(engine: Any, sql: Any, rows: list[dict[str, Any]], chunk_size: int = 1000) -> int:
    """分批 upsert（每個 chunk 獨立 commit，避免長交易拖慢 ON CONFLICT 檢查）。"""
    if not rows:
        return 0
    with engine.connect() as conn:
        for i in range(0, len(rows), chunk_size):
            conn.execute(sql, rows[i : i + chunk_size])
            conn.commit()
    return len(rows)


def _upsert_monthly(engine: Any, rows: list[dict[str, Any]]) -> int:
    return _upsert_rows(engine, _MONTHLY_UPSERT_SQL, rows)


def _upsert_quarterly(engine: Any, rows: list[dict[str, Any]]) -> int:
    return _upsert_rows(engine, _QUARTERLY_UPSERT_SQL, rows)


def _upsert_signals(engine: Any, signals: list[dict[str, Any]]) -> int:
    if not signals:
        return 0
    rows = [
        {
            "signal_type": s["signal_type"],
            "stock_code": s["stock_code"],
            "period": s["period"],
            "strength": s["strength"],
            "fund_names": json.dumps(s["fund_names"], ensure_ascii=False),
            "metadata": json.dumps(s["metadata"], ensure_ascii=False),
        }
        for s in signals
    ]
    return _upsert_rows(engine, _SIGNALS_UPSERT_SQL, rows)


# ---------------------------------------------------------------------------
# 訊號階段：讀近期歷史
# ---------------------------------------------------------------------------


def _floatify_rows(rows: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """把 DB 讀出的 NUMERIC 欄位（`amount`、`pct`）由 Decimal 轉為 float。

    PostgreSQL NUMERIC 經 SQLAlchemy 讀回是 `decimal.Decimal`，直接和 float
    運算會 TypeError（本專案已知陷阱，見 ETF/CLAUDE.md 常見錯誤表）；
    訊號模組是純函式、假設輸入為 float，故在讀取邊界統一轉型。

    Args:
        rows: DB 讀出的 row dict 清單（就地修改並回傳同一清單）。

    Returns:
        list[dict]: `amount`/`pct` 已轉 float（None 與缺欄位保持不變）。
    """
    for row in rows:
        for key in ("amount", "pct"):
            if row.get(key) is not None:
                row[key] = float(row[key])
    return rows


def _load_recent_monthly(engine: Any, period: str, months_back: int = MONTHLY_HISTORY_MONTHS) -> list[dict[str, Any]]:
    months = _trailing_yyyymm(period, months_back)
    with engine.connect() as conn:
        rows = conn.execute(
            text(
                """
                SELECT ym, fund_short, comid, rank, stock_code, stock_name, amount, pct, source
                FROM fund_holdings_monthly
                WHERE ym = ANY(:months)
                """
            ),
            {"months": months},
        )
        return _floatify_rows([dict(r) for r in rows.mappings().all()])


def _load_recent_quarterly(
    engine: Any, period: str, quarters_back: int = QUARTERLY_HISTORY_QUARTERS
) -> list[dict[str, Any]]:
    with engine.connect() as conn:
        yqs = conn.execute(
            text(
                """
                SELECT DISTINCT yq FROM fund_holdings_quarterly
                WHERE yq <= :period ORDER BY yq DESC LIMIT :n
                """
            ),
            {"period": period, "n": quarters_back},
        ).scalars().all()
        if not yqs:
            return []
        rows = conn.execute(
            text(
                """
                SELECT yq, fund_short, comid, stock_code, stock_name, amount, pct
                FROM fund_holdings_quarterly
                WHERE yq = ANY(:yqs)
                """
            ),
            {"yqs": list(yqs)},
        )
        return _floatify_rows([dict(r) for r in rows.mappings().all()])


def _load_latest_etf_holdings(engine: Any) -> list[dict[str, Any]]:
    with engine.connect() as conn:
        latest_date = conn.execute(text("SELECT MAX(data_date) FROM etf_holdings_snapshot")).scalar()
        if latest_date is None:
            return []
        rows = conn.execute(
            text(
                """
                SELECT etf_code, stock_code, stock_name
                FROM etf_holdings_snapshot
                WHERE data_date = :d
                """
            ),
            {"d": latest_date},
        )
        return [dict(r) for r in rows.mappings().all()]


# ---------------------------------------------------------------------------
# 摘要輸出
# ---------------------------------------------------------------------------


def _print_summary(
    *,
    latest_ym: str,
    latest_yq: str,
    n_monthly: int,
    n_quarterly: int,
    n_signals: int | None,
    unmatched: list[dict[str, Any]],
    failed_comids: list[str],
    stale_entries: list[dict[str, Any]],
    dry_run: bool,
) -> None:
    prefix = "[dry-run] " if dry_run else ""
    logger.info("%s========== 同步摘要 ==========", prefix)
    logger.info("%s月報期別：%s，季報期別：%s", prefix, latest_ym, latest_yq)
    logger.info("%sfund_holdings_monthly upsert：%d 筆", prefix, n_monthly)
    logger.info("%sfund_holdings_quarterly upsert：%d 筆", prefix, n_quarterly)
    if n_signals is None:
        logger.info("%sfund_signals：skipped（dry-run 不執行訊號階段）", prefix)
    else:
        logger.info("%sfund_signals upsert：%d 筆", prefix, n_signals)
    if unmatched:
        distinct_names = sorted({u["fund_name_raw"] for u in unmatched})
        sample = distinct_names[:20]
        logger.warning(
            "%sunmatched（%d 筆持股列，%d 檔不重複基金名，白名單外正常現象）："
            "%s%s",
            prefix,
            len(unmatched),
            len(distinct_names),
            sample,
            f" …其餘 {len(distinct_names) - len(sample)} 檔省略" if len(distinct_names) > len(sample) else "",
        )
    else:
        logger.info("%sunmatched：無", prefix)
    if failed_comids:
        logger.warning("%s失敗 comid：%s", prefix, failed_comids)
    else:
        logger.info("%s失敗 comid：無", prefix)
    if stale_entries:
        names = [e["fund_short"] for e in stale_entries]
        logger.warning(
            "%svalid_from 超過 %d 天未更新，請檢查經理人異動：%s",
            prefix,
            STALENESS_THRESHOLD_DAYS,
            names,
        )
    else:
        logger.info("%s無逾期未更新的 map 條目", prefix)
    logger.info("%s==============================", prefix)


# ---------------------------------------------------------------------------
# main
# ---------------------------------------------------------------------------


def main() -> int:
    parser = argparse.ArgumentParser(description="基金持股月頻同步（SITCA 月報 + 季報 + 雙軌訊號）")
    parser.add_argument("--dry-run", action="store_true", help="只抓取 + 解析，不連 DB、不寫入")
    args = parser.parse_args()

    if (PROJECT_ROOT / ".env.local").exists():
        load_dotenv(str(PROJECT_ROOT / ".env.local"))
    else:
        load_dotenv()

    from ETF.scrapers import sitca_scraper

    engine = None
    exit_code = 0

    try:
        if args.dry_run:
            map_rows = _load_manager_map(use_seed=True)
            logger.info("[dry-run] 使用 seed fund_manager_map（%d 筆）", len(map_rows))
        else:
            from ETF.database.sql_storage import SQLStorage

            engine = SQLStorage().engine
            map_rows = _load_manager_map(engine=engine)
            logger.info("已從 DB 載入 fund_manager_map（%d 筆有效）", len(map_rows))

        if not map_rows:
            logger.error("fund_manager_map 為空，無法同步")
            return 1

        mapping = _build_normalizer_mapping(map_rows)
        fund_short_to_comid = {row["fund_short"]: row["comid"] for row in map_rows}
        distinct_comids = sorted({row["comid"] for row in map_rows})
        stale_entries = _stale_map_entries(map_rows, date.today())

        # 2. 判定最新期別（讀 SITCA 頁面 ddlQ_YM 下拉選單）
        latest_ym = sitca_scraper.get_latest_monthly_period()
        logger.info("SITCA 月報最新期別：%s", latest_ym)
        latest_yq = sitca_scraper.get_latest_quarterly_period()
        logger.info("SITCA 季報最新期別：%s", latest_yq)

        # 3. 逐 comid 抓月報 + 季報
        monthly_by_comid, failed_monthly = _fetch_holdings_for_comids(
            sitca_scraper.fetch_monthly, latest_ym, distinct_comids
        )
        quarterly_by_comid, failed_quarterly = _fetch_holdings_for_comids(
            sitca_scraper.fetch_quarterly, latest_yq, distinct_comids
        )
        failed_comids = sorted(set(failed_monthly) | set(failed_quarterly))

        # 4. 正規化 + 轉 upsert dict
        monthly_upserts, monthly_unmatched = _sitca_rows_to_monthly_upserts(
            latest_ym, monthly_by_comid, mapping, fund_short_to_comid
        )
        quarterly_upserts, quarterly_unmatched = _sitca_rows_to_quarterly_upserts(
            latest_yq, quarterly_by_comid, mapping, fund_short_to_comid
        )
        unmatched = monthly_unmatched + quarterly_unmatched

        if failed_comids:
            exit_code = 1

        if args.dry_run:
            _print_summary(
                latest_ym=latest_ym,
                latest_yq=latest_yq,
                n_monthly=len(monthly_upserts),
                n_quarterly=len(quarterly_upserts),
                n_signals=None,
                unmatched=unmatched,
                failed_comids=failed_comids,
                stale_entries=stale_entries,
                dry_run=True,
            )
            return exit_code

        # 5. upsert holdings
        n_monthly = _upsert_monthly(engine, monthly_upserts)
        n_quarterly = _upsert_quarterly(engine, quarterly_upserts)
        logger.info("已 upsert fund_holdings_monthly %d 筆、fund_holdings_quarterly %d 筆", n_monthly, n_quarterly)

        # 6. 訊號階段（失敗不回滾 holdings，但整體 exit code 非 0）
        n_signals = 0
        try:
            monthly_hist = _load_recent_monthly(engine, latest_ym)
            quarterly_hist = _load_recent_quarterly(engine, latest_ym)
            etf_holdings = _load_latest_etf_holdings(engine)

            from ETF.analysis.fund_signals import detect_signals

            signals = detect_signals(monthly_hist, quarterly_hist, etf_holdings, map_rows, period=latest_ym)
            n_signals = _upsert_signals(engine, signals)
            logger.info("已 upsert fund_signals %d 筆", n_signals)
        except Exception as exc:  # noqa: BLE001 — 訊號失敗不可讓 holdings 白做
            logger.error("訊號階段失敗（holdings 已寫入，不回滾）：%s", exc)
            exit_code = 1

        _print_summary(
            latest_ym=latest_ym,
            latest_yq=latest_yq,
            n_monthly=n_monthly,
            n_quarterly=n_quarterly,
            n_signals=n_signals,
            unmatched=unmatched,
            failed_comids=failed_comids,
            stale_entries=stale_entries,
            dry_run=False,
        )
        return exit_code

    except Exception as exc:  # noqa: BLE001 — 頂層防護，確保 exit code 非 0 而非未捕捉的 traceback 中斷
        logger.error("基金持股同步失敗：%s", exc, exc_info=True)
        return 1


if __name__ == "__main__":
    sys.exit(main())
