"""經理人雙軌訊號偵測。

純函式運算：輸入是從 DB 讀出的基金月報 / 季報 / ETF 持股快照 / 經理人對照表
（皆為 dict/list），不碰 DB、不打網路。輸出是可直接 upsert 進 `fund_signals`
表（或等效表）的 dict 清單，供同步腳本在月頻同步後呼叫。

6 種訊號：
    1. quarterly_promotion   — 季報 ≥1% 持股，首次晉升本月 Top 10
    2. quarterly_latent_etf  — 季報有、本月 Top 10 無，但同經理人 ETF 持股有
    3. fund_consensus        — 同月 ≥N 檔基金同持一股
    4. consecutive_add       — 單一基金同一股票連續 M 個日曆連續月份 pct 遞增
    5. high_weight_cut       — 曾 ≥ HIGH_WEIGHT_PCT 的持股本月降至 ≤ CUT_PCT
    6. core_exit             — 連續 ≥M 個月都在 Top 10，本月消失
"""

from __future__ import annotations

from typing import Any, TypeAlias

Row: TypeAlias = dict[str, Any]
FundKey: TypeAlias = tuple[str, str]  # (fund_short, comid)

# ---------------------------------------------------------------------------
# 閾值常數（可調）
# ---------------------------------------------------------------------------
QUARTERLY_PCT_MIN = 1.0  # 季報「持股」定義門檻（%）
CONSENSUS_MIN = 3  # fund_consensus 最少共識基金檔數
CONSECUTIVE_MONTHS = 3  # consecutive_add / core_exit 最少連續月數
HIGH_WEIGHT_PCT = 10.0  # high_weight_cut 峰值門檻（%）
CUT_PCT = 5.0  # high_weight_cut 減碼門檻（%）
TOP_N = 10  # 月報 Top N 定義


def detect_signals(
    monthly: list[Row],
    quarterly: list[Row],
    etf_holdings: list[Row],
    manager_map: list[Row],
    period: str,
) -> list[Row]:
    """偵測指定月份的 6 種基金雙軌訊號。

    Args:
        monthly: 月報 Top 10 持股列表，每筆含
            ``{ym, fund_short, comid, rank, stock_code, stock_name, amount,
            pct, source}``。``source`` 為 ``sitca`` 或 ``mops``，同鍵並存時
            以 ``sitca`` 為準。
        quarterly: 季報 ≥1% 持股列表，每筆含
            ``{yq, fund_short, comid, stock_code, stock_name, amount, pct}``。
            ``yq`` 為季末月（``YYYYMM``）。
        etf_holdings: 最新一日 ETF 持股快照，每筆含
            ``{etf_code, stock_code, stock_name}``。
        manager_map: 基金/ETF 與經理人對照表，每筆含
            ``{fund_short, comid, etf_code, manager, type}``，``type`` 為
            ``etf`` 或 ``fund``。
        period: 要分析的月份，格式 ``YYYYMM``（如 ``"202606"``）。

    Returns:
        訊號 dict 清單，每筆含
        ``{signal_type, stock_code, period, strength, fund_names, metadata}``。
        同一 ``(signal_type, stock_code, period)`` 只會輸出一筆，多基金觸發
        同訊號時 ``fund_names`` 會合併、``metadata['details']`` 會列出各基金
        的觸發明細。
    """
    monthly_dedup = _dedupe_monthly(monthly)

    monthly_series = _build_monthly_series(monthly_dedup)
    monthly_by_period_fund = _build_monthly_by_period_fund(monthly_dedup)
    manager_by_fund_key, etfs_by_manager = _build_manager_indices(manager_map)
    holdings_by_etf = _build_etf_holdings_index(etf_holdings)

    quarter_ym = _latest_quarter_leq(quarterly, _prev_ym(period))

    store: dict[tuple[str, str, str], Row] = {}

    if quarter_ym is not None:
        _detect_quarterly_promotion(
            store, quarterly, monthly_series, monthly_by_period_fund, quarter_ym, period
        )
        _detect_quarterly_latent_etf(
            store,
            quarterly,
            monthly_by_period_fund,
            manager_by_fund_key,
            etfs_by_manager,
            holdings_by_etf,
            quarter_ym,
            period,
        )

    _detect_fund_consensus(store, monthly_dedup, period)
    _detect_consecutive_add(store, monthly_series, period)
    _detect_high_weight_cut(store, monthly_series, period)
    _detect_core_exit(store, monthly_series, period)

    return list(store.values())


# ---------------------------------------------------------------------------
# 前處理
# ---------------------------------------------------------------------------
def _dedupe_monthly(monthly: list[Row]) -> list[Row]:
    """同鍵（ym, fund_short, comid, stock_code）sitca/mops 並存時取 sitca。"""
    best: dict[tuple[str, str, str, str], Row] = {}
    for row in monthly:
        key = (row["ym"], row["fund_short"], row["comid"], row["stock_code"])
        existing = best.get(key)
        if existing is None or (existing.get("source") != "sitca" and row.get("source") == "sitca"):
            best[key] = row
    return list(best.values())


def _build_monthly_series(monthly_dedup: list[Row]) -> dict[tuple[str, str, str], list[Row]]:
    """(fund_short, comid, stock_code) → 依 ym 排序的月報時序。"""
    series: dict[tuple[str, str, str], list[Row]] = {}
    for row in monthly_dedup:
        key = (row["fund_short"], row["comid"], row["stock_code"])
        series.setdefault(key, []).append(row)
    for rows in series.values():
        rows.sort(key=lambda r: r["ym"])
    return series


def _build_monthly_by_period_fund(
    monthly_dedup: list[Row],
) -> dict[tuple[str, str, str], dict[str, Row]]:
    """(ym, fund_short, comid) → {stock_code: row}，僅含月報揭露的 Top 10。"""
    index: dict[tuple[str, str, str], dict[str, Row]] = {}
    for row in monthly_dedup:
        key = (row["ym"], row["fund_short"], row["comid"])
        index.setdefault(key, {})[row["stock_code"]] = row
    return index


def _build_manager_indices(
    manager_map: list[Row],
) -> tuple[dict[FundKey, str], dict[str, set[str]]]:
    """回傳 (fund_key → manager, manager → {etf_code})。"""
    manager_by_fund_key: dict[FundKey, str] = {}
    etfs_by_manager: dict[str, set[str]] = {}
    for row in manager_map:
        manager = row.get("manager")
        if not manager:
            continue
        if row.get("type") == "fund":
            manager_by_fund_key[(row["fund_short"], row["comid"])] = manager
        elif row.get("type") == "etf" and row.get("etf_code"):
            etfs_by_manager.setdefault(manager, set()).add(row["etf_code"])
    return manager_by_fund_key, etfs_by_manager


def _build_etf_holdings_index(etf_holdings: list[Row]) -> dict[str, set[str]]:
    """etf_code → {stock_code}（最新一日快照）。"""
    index: dict[str, set[str]] = {}
    for row in etf_holdings:
        index.setdefault(row["etf_code"], set()).add(row["stock_code"])
    return index


def _latest_quarter_leq(quarterly: list[Row], ceiling_ym: str) -> str | None:
    """回傳 ≤ ceiling_ym 的最近季末月（yq）。"""
    candidates = {row["yq"] for row in quarterly if row["yq"] <= ceiling_ym}
    return max(candidates) if candidates else None


def _prev_ym(ym: str) -> str:
    year, month = int(ym[:4]), int(ym[4:])
    month -= 1
    if month < 1:
        year -= 1
        month = 12
    return f"{year:04d}{month:02d}"


def _next_ym(ym: str) -> str:
    year, month = int(ym[:4]), int(ym[4:])
    month += 1
    if month > 12:
        year += 1
        month = 1
    return f"{year:04d}{month:02d}"


# ---------------------------------------------------------------------------
# 合併輸出
# ---------------------------------------------------------------------------
def _merge_signal(
    store: dict[tuple[str, str, str], Row],
    signal_type: str,
    stock_code: str,
    period: str,
    strength: int,
    fund_name: str,
    detail: Row,
) -> None:
    """把單一基金觸發的訊號合併進同 (signal_type, stock_code, period) 的輸出。

    多基金觸發同訊號時：fund_names 聯集去重、strength 取各次觸發最大值、
    metadata['details'] 累積每個基金的觸發明細。
    """
    key = (signal_type, stock_code, period)
    existing = store.get(key)
    if existing is None:
        store[key] = {
            "signal_type": signal_type,
            "stock_code": stock_code,
            "period": period,
            "strength": strength,
            "fund_names": [fund_name],
            "metadata": {"details": [detail]},
        }
        return
    if fund_name not in existing["fund_names"]:
        existing["fund_names"].append(fund_name)
    existing["strength"] = max(existing["strength"], strength)
    existing["metadata"]["details"].append(detail)


# ---------------------------------------------------------------------------
# 訊號 1：quarterly_promotion
# ---------------------------------------------------------------------------
def _detect_quarterly_promotion(
    store: dict[tuple[str, str, str], Row],
    quarterly: list[Row],
    monthly_series: dict[tuple[str, str, str], list[Row]],
    monthly_by_period_fund: dict[tuple[str, str, str], dict[str, Row]],
    quarter_ym: str,
    period: str,
) -> None:
    for row in quarterly:
        if row["yq"] != quarter_ym or (row.get("pct") or 0) < QUARTERLY_PCT_MIN:
            continue
        fund_short, comid, stock_code = row["fund_short"], row["comid"], row["stock_code"]
        month_row = monthly_by_period_fund.get((period, fund_short, comid), {}).get(stock_code)
        if month_row is None or (month_row.get("rank") or TOP_N + 1) > TOP_N:
            continue  # 本月未進 Top 10

        series = monthly_series.get((fund_short, comid, stock_code), [])
        already_topped_before = any(
            r["ym"] < period and (r.get("rank") or TOP_N + 1) <= TOP_N for r in series
        )
        if already_topped_before:
            continue  # 不是「首次」

        _merge_signal(
            store,
            "quarterly_promotion",
            stock_code,
            period,
            strength=1,
            fund_name=fund_short,
            detail={
                "fund": fund_short,
                "quarter": quarter_ym,
                "quarter_pct": row.get("pct"),
                "month_rank": month_row.get("rank"),
                "month_pct": month_row.get("pct"),
            },
        )


# ---------------------------------------------------------------------------
# 訊號 2：quarterly_latent_etf
# ---------------------------------------------------------------------------
def _detect_quarterly_latent_etf(
    store: dict[tuple[str, str, str], Row],
    quarterly: list[Row],
    monthly_by_period_fund: dict[tuple[str, str, str], dict[str, Row]],
    manager_by_fund_key: dict[FundKey, str],
    etfs_by_manager: dict[str, set[str]],
    holdings_by_etf: dict[str, set[str]],
    quarter_ym: str,
    period: str,
) -> None:
    for row in quarterly:
        if row["yq"] != quarter_ym or (row.get("pct") or 0) < QUARTERLY_PCT_MIN:
            continue
        fund_short, comid, stock_code = row["fund_short"], row["comid"], row["stock_code"]
        month_row = monthly_by_period_fund.get((period, fund_short, comid), {}).get(stock_code)
        if month_row is not None:
            continue  # 本月 Top 10 已有，不是「潛伏」

        manager = manager_by_fund_key.get((fund_short, comid))
        if manager is None:
            continue
        for etf_code in etfs_by_manager.get(manager, set()):
            if stock_code not in holdings_by_etf.get(etf_code, set()):
                continue
            _merge_signal(
                store,
                "quarterly_latent_etf",
                stock_code,
                period,
                strength=1,
                fund_name=fund_short,
                detail={
                    "fund": fund_short,
                    "manager": manager,
                    "etf_code": etf_code,
                    "quarter": quarter_ym,
                    "quarter_pct": row.get("pct"),
                },
            )


# ---------------------------------------------------------------------------
# 訊號 3：fund_consensus
# ---------------------------------------------------------------------------
def _detect_fund_consensus(
    store: dict[tuple[str, str, str], Row], monthly_dedup: list[Row], period: str
) -> None:
    by_stock: dict[str, list[Row]] = {}
    for row in monthly_dedup:
        if row["ym"] != period:
            continue
        by_stock.setdefault(row["stock_code"], []).append(row)

    # 全月份合計 pct 趨勢（各月所有基金加總），供 metadata 參考。
    trend_by_stock: dict[str, dict[str, float]] = {}
    for row in monthly_dedup:
        trend_by_stock.setdefault(row["stock_code"], {})
        trend_by_stock[row["stock_code"]][row["ym"]] = trend_by_stock[row["stock_code"]].get(
            row["ym"], 0.0
        ) + (row.get("pct") or 0)

    for stock_code, rows in by_stock.items():
        distinct_funds = sorted({r["fund_short"] for r in rows})
        if len(distinct_funds) < CONSENSUS_MIN:
            continue
        trend = sorted(
            (
                {"ym": ym, "total_pct": round(total, 4)}
                for ym, total in trend_by_stock.get(stock_code, {}).items()
            ),
            key=lambda item: item["ym"],
        )
        detail = {
            "fund_pct": {r["fund_short"]: r.get("pct") for r in rows},
            "monthly_total_pct_trend": trend,
        }
        key = ("fund_consensus", stock_code, period)
        store[key] = {
            "signal_type": "fund_consensus",
            "stock_code": stock_code,
            "period": period,
            "strength": len(distinct_funds),
            "fund_names": distinct_funds,
            "metadata": {"details": [detail]},
        }


# ---------------------------------------------------------------------------
# 訊號 4：consecutive_add
# ---------------------------------------------------------------------------
def _detect_consecutive_add(
    store: dict[tuple[str, str, str], Row],
    monthly_series: dict[tuple[str, str, str], list[Row]],
    period: str,
) -> None:
    for (fund_short, _comid, stock_code), series in monthly_series.items():
        rows = [r for r in series if r["ym"] <= period]
        if not rows or rows[-1]["ym"] != period:
            continue

        run = [rows[-1]]
        i = len(rows) - 2
        while i >= 0:
            prev_row, next_row = rows[i], run[0]
            is_calendar_consecutive = _next_ym(prev_row["ym"]) == next_row["ym"]
            is_increasing = (prev_row.get("pct") or 0) < (next_row.get("pct") or 0)
            if not (is_calendar_consecutive and is_increasing):
                break
            run.insert(0, prev_row)
            i -= 1

        if len(run) < CONSECUTIVE_MONTHS:
            continue

        _merge_signal(
            store,
            "consecutive_add",
            stock_code,
            period,
            strength=len(run) - 2,
            fund_name=fund_short,
            detail={
                "fund": fund_short,
                "months": [r["ym"] for r in run],
                "pcts": [r.get("pct") for r in run],
            },
        )


# ---------------------------------------------------------------------------
# 訊號 5：high_weight_cut
# ---------------------------------------------------------------------------
def _detect_high_weight_cut(
    store: dict[tuple[str, str, str], Row],
    monthly_series: dict[tuple[str, str, str], list[Row]],
    period: str,
) -> None:
    for (fund_short, _comid, stock_code), series in monthly_series.items():
        current = next((r for r in series if r["ym"] == period), None)
        if current is None or (current.get("pct") or 0) > CUT_PCT:
            continue

        priors = [r for r in series if r["ym"] < period]
        if not priors:
            continue
        peak = max(priors, key=lambda r: r.get("pct") or 0)
        if (peak.get("pct") or 0) < HIGH_WEIGHT_PCT:
            continue

        _merge_signal(
            store,
            "high_weight_cut",
            stock_code,
            period,
            strength=1,
            fund_name=fund_short,
            detail={
                "fund": fund_short,
                "peak_month": peak["ym"],
                "peak_pct": peak.get("pct"),
                "current_pct": current.get("pct"),
            },
        )


# ---------------------------------------------------------------------------
# 訊號 6：core_exit
# ---------------------------------------------------------------------------
def _detect_core_exit(
    store: dict[tuple[str, str, str], Row],
    monthly_series: dict[tuple[str, str, str], list[Row]],
    period: str,
) -> None:
    for (fund_short, _comid, stock_code), series in monthly_series.items():
        current = next((r for r in series if r["ym"] == period), None)
        if current is not None:
            continue  # 本月仍有出現，不是「消失」

        priors = sorted(
            (r for r in series if r["ym"] < period and (r.get("rank") or TOP_N + 1) <= TOP_N),
            key=lambda r: r["ym"],
        )
        if not priors:
            continue

        run = [priors[-1]]
        i = len(priors) - 2
        while i >= 0 and _next_ym(priors[i]["ym"]) == run[0]["ym"]:
            run.insert(0, priors[i])
            i -= 1

        if len(run) < CONSECUTIVE_MONTHS or _next_ym(run[-1]["ym"]) != period:
            continue  # 消失前不是緊接著連續在榜，或連續區段沒有緊鄰本月

        _merge_signal(
            store,
            "core_exit",
            stock_code,
            period,
            strength=1,
            fund_name=fund_short,
            detail={
                "fund": fund_short,
                "months": [r["ym"] for r in run],
            },
        )
