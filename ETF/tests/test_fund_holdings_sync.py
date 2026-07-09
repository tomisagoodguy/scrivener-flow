"""ETF/run_fund_holdings_sync.py 的純函式離線測試。

不打網路、不連 DB；爬蟲呼叫一律用 monkeypatch 隔離。
"""

from __future__ import annotations

from datetime import date, timedelta
from decimal import Decimal

from ETF.run_fund_holdings_sync import (
    _fetch_holdings_for_comids,
    _floatify_rows,
    _iter_yyyymm,
    _mops_funds_to_monthly_upserts,
    _sitca_rows_to_monthly_upserts,
    _sitca_rows_to_quarterly_upserts,
    _stale_map_entries,
    _trailing_yyyymm,
)


# ---------------------------------------------------------------------------
# _floatify_rows — PostgreSQL NUMERIC 回傳 Decimal，讀取邊界必須轉 float
# （2026-07-08 首次真實同步踩雷：float + Decimal 在訊號階段 TypeError）
# ---------------------------------------------------------------------------


def test_floatify_rows_converts_decimal_amount_and_pct():
    rows = [
        {"ym": "202605", "fund_short": "統一奔騰", "amount": Decimal("100000"), "pct": Decimal("8.5")}
    ]

    out = _floatify_rows(rows)

    assert isinstance(out[0]["pct"], float)
    assert out[0]["pct"] == 8.5
    assert isinstance(out[0]["amount"], float)
    # 非數值欄位不動
    assert out[0]["fund_short"] == "統一奔騰"


def test_floatify_rows_keeps_none_and_missing_fields():
    rows = [{"ym": "202605", "amount": None, "pct": None}, {"ym": "202604"}]

    out = _floatify_rows(rows)

    assert out[0]["amount"] is None
    assert out[0]["pct"] is None
    assert "pct" not in out[1]


# ---------------------------------------------------------------------------
# _iter_yyyymm
# ---------------------------------------------------------------------------


def test_iter_yyyymm_within_same_year():
    assert _iter_yyyymm("202601", "202604") == ["202601", "202602", "202603", "202604"]


def test_iter_yyyymm_crosses_year_boundary():
    assert _iter_yyyymm("202511", "202602") == ["202511", "202512", "202601", "202602"]


def test_iter_yyyymm_single_month():
    assert _iter_yyyymm("202604", "202604") == ["202604"]


# ---------------------------------------------------------------------------
# _trailing_yyyymm
# ---------------------------------------------------------------------------


def test_trailing_yyyymm_within_same_year():
    assert _trailing_yyyymm("202606", 3) == ["202604", "202605", "202606"]


def test_trailing_yyyymm_crosses_year_boundary():
    assert _trailing_yyyymm("202602", 4) == ["202511", "202512", "202601", "202602"]


def test_trailing_yyyymm_length_matches_n():
    assert len(_trailing_yyyymm("202612", 12)) == 12


# ---------------------------------------------------------------------------
# _fetch_holdings_for_comids — 單一 comid 失敗不中斷其餘
# ---------------------------------------------------------------------------


def test_fetch_holdings_for_comids_single_failure_does_not_abort_others():
    def fetch_fn(period, comid):
        if comid == "A0032":
            raise RuntimeError("network down")
        return [{"fund_name_raw": f"基金-{comid}", "stock_code": "2330"}]

    results, failed = _fetch_holdings_for_comids(fetch_fn, "202606", ["A0009", "A0032", "A0022"])

    assert failed == ["A0032"]
    assert set(results.keys()) == {"A0009", "A0022"}
    assert results["A0009"][0]["stock_code"] == "2330"


def test_fetch_holdings_for_comids_all_succeed_no_failures():
    def fetch_fn(period, comid):
        return [{"fund_name_raw": comid, "stock_code": "2330"}]

    results, failed = _fetch_holdings_for_comids(fetch_fn, "202606", ["A0009", "A0022"])

    assert failed == []
    assert len(results) == 2


# ---------------------------------------------------------------------------
# _sitca_rows_to_monthly_upserts — canonical comid 替換 + unmatched 收集
# ---------------------------------------------------------------------------


_MAPPING = {
    "統一台股增長": ["統一台股增長主動式ETF基金", "統一台股增長主動式ETF證券投資信託基金"],
    "統一奔騰": ["統一奔騰基金", "統一奔騰證券投資信託基金"],
}
_FUND_SHORT_TO_COMID = {"統一台股增長": "A0009", "統一奔騰": "A0009"}


def test_sitca_rows_to_monthly_upserts_uses_canonical_comid():
    comid_rows = {
        "A0009": [
            {
                "fund_name_raw": "統一台股增長主動式ETF基金",
                "rank": 1,
                "stock_code": "2330",
                "stock_name": "台積電",
                "amount": 100000,
                "pct": 8.5,
                "target_type": "上市股票",
            }
        ]
    }

    upserts, unmatched = _sitca_rows_to_monthly_upserts("202606", comid_rows, _MAPPING, _FUND_SHORT_TO_COMID)

    assert unmatched == []
    assert len(upserts) == 1
    row = upserts[0]
    assert row["fund_short"] == "統一台股增長"
    assert row["comid"] == "A0009"
    assert row["ym"] == "202606"
    assert row["source"] == "sitca"
    assert row["stock_code"] == "2330"


def test_sitca_rows_to_monthly_upserts_falls_back_to_queried_comid_when_not_in_map():
    """canonical comid 找不到（理論上不該發生）時 fallback 用查詢時的 comid，不崩潰。"""
    comid_rows = {
        "A9999": [
            {
                "fund_name_raw": "統一奔騰基金",
                "rank": 2,
                "stock_code": "2454",
                "stock_name": "聯發科",
                "amount": 50000,
                "pct": 3.2,
                "target_type": "上市股票",
            }
        ]
    }
    mapping = {"統一奔騰": ["統一奔騰基金"]}
    fund_short_to_comid: dict[str, str] = {}  # 故意不含「統一奔騰」

    upserts, unmatched = _sitca_rows_to_monthly_upserts("202606", comid_rows, mapping, fund_short_to_comid)

    assert unmatched == []
    assert upserts[0]["comid"] == "A9999"


def test_sitca_rows_to_monthly_upserts_collects_unmatched():
    comid_rows = {
        "A0009": [
            {
                "fund_name_raw": "某個不在白名單上的基金",
                "rank": 3,
                "stock_code": "2317",
                "stock_name": "鴻海",
                "amount": 20000,
                "pct": 1.1,
                "target_type": "上市股票",
            }
        ]
    }

    upserts, unmatched = _sitca_rows_to_monthly_upserts("202606", comid_rows, _MAPPING, _FUND_SHORT_TO_COMID)

    assert upserts == []
    assert len(unmatched) == 1
    assert unmatched[0]["fund_name_raw"] == "某個不在白名單上的基金"
    assert unmatched[0]["comid"] == "A0009"


# ---------------------------------------------------------------------------
# _sitca_rows_to_quarterly_upserts
# ---------------------------------------------------------------------------


def test_sitca_rows_to_quarterly_upserts_no_rank_field():
    comid_rows = {
        "A0009": [
            {
                "fund_name_raw": "統一台股增長主動式ETF基金",
                "rank": None,
                "stock_code": "2330",
                "stock_name": "台積電",
                "amount": 300000,
                "pct": 2.4,
                "target_type": "上市股票",
            }
        ]
    }

    upserts, unmatched = _sitca_rows_to_quarterly_upserts("202603", comid_rows, _MAPPING, _FUND_SHORT_TO_COMID)

    assert unmatched == []
    assert len(upserts) == 1
    row = upserts[0]
    assert "rank" not in row
    assert row["yq"] == "202603"
    assert row["comid"] == "A0009"


# ---------------------------------------------------------------------------
# _mops_funds_to_monthly_upserts
# ---------------------------------------------------------------------------


def test_mops_funds_to_monthly_upserts_uses_canonical_comid_and_null_amount():
    funds = [
        {
            "fund_short": "統一台股增長",
            "fund_name_raw": "統一台股增長主動式ETF基金",
            "comid": "A0009_MOPS_VARIANT",  # 故意與 map 不同，驗證會被改寫
            "company_name": "統一投信",
            "top5": [
                {"rank": 1, "stock_code": "2330", "stock_name": "台積電", "pct": 9.1},
                {"rank": 2, "stock_code": "2454", "stock_name": "聯發科", "pct": 5.0},
            ],
        }
    ]

    rows = _mops_funds_to_monthly_upserts("202604", funds, _FUND_SHORT_TO_COMID)

    assert len(rows) == 2
    for row in rows:
        assert row["comid"] == "A0009"  # canonical，不是 MOPS 回傳的變體
        assert row["source"] == "mops"
        assert row["amount"] is None
        assert row["ym"] == "202604"
    assert rows[0]["rank"] == 1
    assert rows[1]["rank"] == 2


def test_mops_funds_to_monthly_upserts_fallback_comid_when_not_in_map():
    funds = [
        {
            "fund_short": "未知基金",
            "fund_name_raw": "未知基金全名",
            "comid": "A8888",
            "company_name": "某投信",
            "top5": [{"rank": 1, "stock_code": "2330", "stock_name": "台積電", "pct": 1.0}],
        }
    ]

    rows = _mops_funds_to_monthly_upserts("202604", funds, {})

    assert rows[0]["comid"] == "A8888"


# ---------------------------------------------------------------------------
# _stale_map_entries — 180 天 staleness 判定
# ---------------------------------------------------------------------------


def test_stale_map_entries_flags_entries_over_threshold():
    today = date(2026, 7, 8)
    map_rows = [
        {"fund_short": "老基金", "valid_from": today - timedelta(days=200)},
        {"fund_short": "新基金", "valid_from": today - timedelta(days=10)},
    ]

    stale = _stale_map_entries(map_rows, today)

    assert len(stale) == 1
    assert stale[0]["fund_short"] == "老基金"


def test_stale_map_entries_boundary_exactly_at_threshold_not_flagged():
    today = date(2026, 7, 8)
    map_rows = [{"fund_short": "剛好門檻", "valid_from": today - timedelta(days=180)}]

    stale = _stale_map_entries(map_rows, today)

    assert stale == []


def test_stale_map_entries_skips_none_valid_from():
    """dry-run seed 資料的 valid_from 為 None，不應被判定為 stale（也不應崩潰）。"""
    today = date(2026, 7, 8)
    map_rows = [{"fund_short": "seed 資料", "valid_from": None}]

    assert _stale_map_entries(map_rows, today) == []


def test_stale_map_entries_accepts_iso_string_valid_from():
    today = date(2026, 7, 8)
    map_rows = [{"fund_short": "字串日期", "valid_from": (today - timedelta(days=200)).isoformat()}]

    stale = _stale_map_entries(map_rows, today)

    assert len(stale) == 1
