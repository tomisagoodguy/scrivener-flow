"""ETF/analysis/fund_signals.py 的正例/反例測試。"""

from __future__ import annotations

from ETF.analysis import fund_signals
from ETF.analysis.fund_signals import detect_signals


def _monthly_row(
    ym: str,
    fund_short: str,
    comid: str,
    stock_code: str,
    rank: int,
    pct: float,
    source: str = "sitca",
    stock_name: str = "",
    amount: float = 0.0,
) -> dict:
    return {
        "ym": ym,
        "fund_short": fund_short,
        "comid": comid,
        "rank": rank,
        "stock_code": stock_code,
        "stock_name": stock_name,
        "amount": amount,
        "pct": pct,
        "source": source,
    }


def _quarterly_row(
    yq: str,
    fund_short: str,
    comid: str,
    stock_code: str,
    pct: float,
    stock_name: str = "",
    amount: float = 0.0,
) -> dict:
    return {
        "yq": yq,
        "fund_short": fund_short,
        "comid": comid,
        "stock_code": stock_code,
        "stock_name": stock_name,
        "amount": amount,
        "pct": pct,
    }


def _etf_holding_row(etf_code: str, stock_code: str, stock_name: str = "") -> dict:
    return {"etf_code": etf_code, "stock_code": stock_code, "stock_name": stock_name}


def _manager_row(
    fund_short: str | None,
    comid: str | None,
    etf_code: str | None,
    manager: str,
    type_: str,
) -> dict:
    return {
        "fund_short": fund_short,
        "comid": comid,
        "etf_code": etf_code,
        "manager": manager,
        "type": type_,
    }


def _signals_of_type(signals: list[dict], signal_type: str) -> list[dict]:
    return [s for s in signals if s["signal_type"] == signal_type]


# ---------------------------------------------------------------------------
# 1. quarterly_promotion
# ---------------------------------------------------------------------------
def test_quarterly_promotion_positive_first_time_top10():
    quarterly = [_quarterly_row("202603", "A基金", "C1", "1101", pct=2.0)]
    monthly = [_monthly_row("202604", "A基金", "C1", "1101", rank=5, pct=3.0)]

    signals = detect_signals(monthly, quarterly, [], [], period="202604")
    hits = _signals_of_type(signals, "quarterly_promotion")

    assert len(hits) == 1
    assert hits[0]["stock_code"] == "1101"
    assert hits[0]["fund_names"] == ["A基金"]
    assert hits[0]["strength"] == 1
    assert hits[0]["metadata"]["details"][0]["quarter"] == "202603"
    assert hits[0]["metadata"]["details"][0]["quarter_pct"] == 2.0
    assert hits[0]["metadata"]["details"][0]["month_rank"] == 5


def test_quarterly_promotion_negative_not_first_time():
    quarterly = [_quarterly_row("202603", "A基金", "C1", "1101", pct=2.0)]
    monthly = [
        _monthly_row("202602", "A基金", "C1", "1101", rank=3, pct=2.5),  # 更早已進 Top10
        _monthly_row("202604", "A基金", "C1", "1101", rank=5, pct=3.0),
    ]

    signals = detect_signals(monthly, quarterly, [], [], period="202604")

    assert _signals_of_type(signals, "quarterly_promotion") == []


# ---------------------------------------------------------------------------
# 2. quarterly_latent_etf
# ---------------------------------------------------------------------------
def test_quarterly_latent_etf_positive_spec_example():
    quarterly = [_quarterly_row("202603", "复华高成长", "FH01", "3231", pct=2.5)]
    monthly: list[dict] = []  # 本月 Top10 無 3231
    etf_holdings = [_etf_holding_row("00991A", "3231")]
    manager_map = [
        _manager_row("复华高成长", "FH01", None, "吕宏宇", "fund"),
        _manager_row(None, None, "00991A", "吕宏宇", "etf"),
    ]

    signals = detect_signals(monthly, quarterly, etf_holdings, manager_map, period="202604")
    hits = _signals_of_type(signals, "quarterly_latent_etf")

    assert len(hits) == 1
    assert hits[0]["stock_code"] == "3231"
    assert hits[0]["fund_names"] == ["复华高成长"]
    detail = hits[0]["metadata"]["details"][0]
    assert detail["fund"] == "复华高成长"
    assert detail["etf_code"] == "00991A"


def test_quarterly_latent_etf_negative_etf_not_holding():
    quarterly = [_quarterly_row("202603", "复华高成长", "FH01", "3231", pct=2.5)]
    monthly: list[dict] = []
    etf_holdings = [_etf_holding_row("00991A", "9999")]  # ETF 未持有 3231
    manager_map = [
        _manager_row("复华高成长", "FH01", None, "吕宏宇", "fund"),
        _manager_row(None, None, "00991A", "吕宏宇", "etf"),
    ]

    signals = detect_signals(monthly, quarterly, etf_holdings, manager_map, period="202604")

    assert _signals_of_type(signals, "quarterly_latent_etf") == []


# ---------------------------------------------------------------------------
# 3. fund_consensus
# ---------------------------------------------------------------------------
def test_fund_consensus_positive_spec_example():
    monthly = [
        _monthly_row("202606", "统一奔腾", "U1", "2383", rank=1, pct=5.0),
        _monthly_row("202606", "统一黑马", "U2", "2383", rank=2, pct=4.0),
        _monthly_row("202606", "复华高成长", "FH01", "2383", rank=3, pct=3.0),
    ]

    signals = detect_signals(monthly, [], [], [], period="202606")
    hits = _signals_of_type(signals, "fund_consensus")

    assert len(hits) == 1
    assert hits[0]["strength"] >= 3
    assert set(hits[0]["fund_names"]) == {"统一奔腾", "统一黑马", "复华高成长"}


def test_fund_consensus_negative_below_threshold():
    monthly = [
        _monthly_row("202606", "统一奔腾", "U1", "2383", rank=1, pct=5.0),
        _monthly_row("202606", "统一黑马", "U2", "2383", rank=2, pct=4.0),
    ]

    signals = detect_signals(monthly, [], [], [], period="202606")

    assert _signals_of_type(signals, "fund_consensus") == []


# ---------------------------------------------------------------------------
# 4. consecutive_add
# ---------------------------------------------------------------------------
def test_consecutive_add_positive_three_consecutive_increasing():
    monthly = [
        _monthly_row("202601", "B基金", "B1", "2330", rank=4, pct=1.0),
        _monthly_row("202602", "B基金", "B1", "2330", rank=3, pct=2.0),
        _monthly_row("202603", "B基金", "B1", "2330", rank=2, pct=3.0),
    ]

    signals = detect_signals(monthly, [], [], [], period="202603")
    hits = _signals_of_type(signals, "consecutive_add")

    assert len(hits) == 1
    assert hits[0]["strength"] == 1  # 3 個月 - 2
    assert hits[0]["metadata"]["details"][0]["months"] == ["202601", "202602", "202603"]


def test_consecutive_add_negative_calendar_gap_breaks_chain():
    """spec 明定：pct 3.0@202604、缺 202605、4.0@202606 → 不觸發（月份斷檔不算連續）。"""
    monthly = [
        _monthly_row("202604", "E基金", "E1", "2603", rank=5, pct=3.0),
        _monthly_row("202606", "E基金", "E1", "2603", rank=4, pct=4.0),  # 缺 202605
    ]

    signals = detect_signals(monthly, [], [], [], period="202606")

    assert _signals_of_type(signals, "consecutive_add") == []


# ---------------------------------------------------------------------------
# 5. high_weight_cut
# ---------------------------------------------------------------------------
def test_high_weight_cut_positive():
    monthly = [
        _monthly_row("202601", "C基金", "C1", "2454", rank=1, pct=12.0),
        _monthly_row("202602", "C基金", "C1", "2454", rank=8, pct=4.0),
    ]

    signals = detect_signals(monthly, [], [], [], period="202602")
    hits = _signals_of_type(signals, "high_weight_cut")

    assert len(hits) == 1
    assert hits[0]["metadata"]["details"][0]["peak_pct"] == 12.0
    assert hits[0]["metadata"]["details"][0]["current_pct"] == 4.0


def test_high_weight_cut_negative_peak_below_threshold():
    monthly = [
        _monthly_row("202601", "C基金", "C1", "2454", rank=1, pct=8.0),  # 未曾達 10%
        _monthly_row("202602", "C基金", "C1", "2454", rank=8, pct=4.0),
    ]

    signals = detect_signals(monthly, [], [], [], period="202602")

    assert _signals_of_type(signals, "high_weight_cut") == []


# ---------------------------------------------------------------------------
# 6. core_exit
# ---------------------------------------------------------------------------
def test_core_exit_positive_three_consecutive_months_then_gone():
    monthly = [
        _monthly_row("202601", "D基金", "D1", "2603", rank=5, pct=2.0),
        _monthly_row("202602", "D基金", "D1", "2603", rank=4, pct=2.5),
        _monthly_row("202603", "D基金", "D1", "2603", rank=3, pct=3.0),
        # 202604 無資料 = 消失
    ]

    signals = detect_signals(monthly, [], [], [], period="202604")
    hits = _signals_of_type(signals, "core_exit")

    assert len(hits) == 1
    assert hits[0]["metadata"]["details"][0]["months"] == ["202601", "202602", "202603"]


def test_core_exit_negative_only_two_consecutive_months():
    monthly = [
        _monthly_row("202602", "D基金", "D1", "2603", rank=4, pct=2.5),
        _monthly_row("202603", "D基金", "D1", "2603", rank=3, pct=3.0),
        # 只有 2 個月連續在榜，未達 CONSECUTIVE_MONTHS=3
    ]

    signals = detect_signals(monthly, [], [], [], period="202604")

    assert _signals_of_type(signals, "core_exit") == []


# ---------------------------------------------------------------------------
# 前處理：sitca/mops 同鍵去重
# ---------------------------------------------------------------------------
def test_dedupe_monthly_prefers_sitca_over_mops():
    monthly = [
        _monthly_row("202604", "A基金", "C1", "1101", rank=9, pct=1.5, source="mops"),
        _monthly_row("202604", "A基金", "C1", "1101", rank=5, pct=3.0, source="sitca"),
    ]

    deduped = fund_signals._dedupe_monthly(monthly)

    assert len(deduped) == 1
    assert deduped[0]["source"] == "sitca"
    assert deduped[0]["pct"] == 3.0


def test_dedupe_monthly_used_end_to_end_by_detect_signals():
    """同鍵 sitca/mops 並存時，quarterly_promotion 應以 sitca 數值為準。"""
    quarterly = [_quarterly_row("202603", "A基金", "C1", "1101", pct=2.0)]
    monthly = [
        _monthly_row("202604", "A基金", "C1", "1101", rank=9, pct=1.5, source="mops"),
        _monthly_row("202604", "A基金", "C1", "1101", rank=5, pct=3.0, source="sitca"),
    ]

    signals = detect_signals(monthly, quarterly, [], [], period="202604")
    hits = _signals_of_type(signals, "quarterly_promotion")

    assert len(hits) == 1
    assert hits[0]["metadata"]["details"][0]["month_pct"] == 3.0
    assert hits[0]["metadata"]["details"][0]["month_rank"] == 5
