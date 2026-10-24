"""Tests for trend_template industry exclusion (default: 生技醫療業).

Spec: openspec/changes/trend-template-exclude-biotech/specs/trend-template-industry-exclusion/spec.md
Tests never call FinLab: selection inputs are synthetic FinlabDataFrames and
`finlab.data.get` is patched for the industry lookup.
"""

import logging
from unittest.mock import patch

import pandas as pd
import pytest

from finlab.dataframe import FinlabDataFrame

BIOTECH = "生技醫療業"
SEMI = "半導體業"


# ---------------------------------------------------------------------------
# Requirement: Pure industry exclusion mask function
# ---------------------------------------------------------------------------


@pytest.mark.parametrize(
    "stock_id, expected",
    [
        ("4743", False),  # 生技醫療業 → excluded
        ("2330", True),  # 半導體業 → allowed
        ("9999", True),  # absent from mapping → allowed
        ("1234", True),  # null industry → allowed
    ],
)
def test_mask_mixed_stock_list(stock_id, expected):
    """
    Scenario: Mask values for known, excluded and unknown stocks
    Example: mixed stock list (one parametrized case per table row)
    """
    from ETF.strategies.trend_template import build_industry_exclusion_mask

    industry_by_stock = pd.Series({"4743": BIOTECH, "2330": SEMI, "1234": None})
    stock_ids = ["4743", "2330", "9999", "1234"]

    mask = build_industry_exclusion_mask(stock_ids, industry_by_stock, (BIOTECH,))

    assert list(mask.index) == stock_ids
    assert mask.dtype == bool
    assert bool(mask[stock_id]) is expected


def test_mask_empty_exclusion_allows_all():
    """
    Scenario: Empty exclusion list allows all stocks
    WHEN excluded is an empty tuple
    THEN every value in the returned mask SHALL be True
    """
    from ETF.strategies.trend_template import build_industry_exclusion_mask

    industry_by_stock = pd.Series({"4743": BIOTECH, "2330": SEMI})

    mask = build_industry_exclusion_mask(["4743", "2330"], industry_by_stock, ())

    assert mask.all()


def test_mask_rejects_bare_string_exclusion():
    """A bare string would silently do substring matching; it MUST be rejected."""
    from ETF.strategies.trend_template import build_industry_exclusion_mask

    with pytest.raises(TypeError):
        build_industry_exclusion_mask(["4743"], pd.Series({"4743": BIOTECH}), BIOTECH)


def test_default_excluded_industries_is_biotech():
    from ETF.strategies.trend_template import EXCLUDED_INDUSTRIES

    assert EXCLUDED_INDUSTRIES == (BIOTECH,)


# ---------------------------------------------------------------------------
# Requirement: Industry exclusion in trend_template selection gate
# ---------------------------------------------------------------------------


def _one_day_inputs():
    """Six eligible stocks on one date: A=10 … F=60 market cap, A is biotech."""
    day = pd.DatetimeIndex([pd.Timestamp("2026-10-12")])
    stocks = ["A", "B", "C", "D", "E", "F"]
    cap = FinlabDataFrame([[10, 20, 30, 40, 50, 60]], index=day, columns=stocks)
    gate = FinlabDataFrame([[True] * 6], index=day, columns=stocks)
    industry = pd.Series({"A": BIOTECH, "B": SEMI, "C": SEMI, "D": SEMI, "E": SEMI, "F": SEMI})
    return cap, gate, industry


def test_select_refills_excluded_slot():
    """
    Scenario: Excluded slot is refilled by the next candidate
    Example: refill after exclusion → selected set SHALL be {B, C, D, E, F}
    """
    from ETF.strategies.trend_template import build_industry_exclusion_mask, select_smallest_cap

    cap, gate, industry = _one_day_inputs()
    allowed = build_industry_exclusion_mask(cap.columns, industry, (BIOTECH,))

    position = select_smallest_cap(cap, gate, allowed, n=5)

    row = position.iloc[0].fillna(False).astype(bool)
    assert set(row[row].index) == {"B", "C", "D", "E", "F"}


def test_excluded_industry_stock_never_selected():
    """
    Scenario: Excluded-industry stock never selected
    THEN the position SHALL be False for the excluded stock on that date
    """
    from ETF.strategies.trend_template import build_industry_exclusion_mask, select_smallest_cap

    cap, gate, industry = _one_day_inputs()
    allowed = build_industry_exclusion_mask(cap.columns, industry, (BIOTECH,))

    position = select_smallest_cap(cap, gate, allowed, n=5)

    assert not bool(position.iloc[0].fillna(False)["A"])


def test_all_true_mask_matches_original_selection():
    """Without exclusion the smallest-5 rule is unchanged: {A, B, C, D, E}."""
    from ETF.strategies.trend_template import select_smallest_cap

    cap, gate, _ = _one_day_inputs()
    allowed = pd.Series(True, index=cap.columns)

    position = select_smallest_cap(cap, gate, allowed, n=5)

    row = position.iloc[0].fillna(False).astype(bool)
    assert set(row[row].index) == {"A", "B", "C", "D", "E"}


# ---------------------------------------------------------------------------
# Requirement: Industry data failure falls back to no exclusion
# ---------------------------------------------------------------------------


def test_load_industry_mapping_fetch_raises(caplog):
    """
    Scenario: Industry fetch raises
    THEN trend_template SHALL log the error and not raise
    """
    from ETF.strategies.trend_template import _load_industry_mapping

    with patch("finlab.data.get", side_effect=RuntimeError("quota exhausted")):
        with caplog.at_level(logging.ERROR):
            result = _load_industry_mapping(None)

    assert result is None
    assert any(r.levelno == logging.ERROR for r in caplog.records)


def test_load_industry_mapping_missing_column(caplog):
    """
    Scenario: Missing industry column
    THEN trend_template SHALL log an error and apply no exclusion (mapping None)
    """
    from ETF.strategies.trend_template import _load_industry_mapping

    no_industry = pd.DataFrame({"stock_id": ["2330"], "公司簡稱": ["台積電"]})

    with patch("finlab.data.get", return_value=no_industry):
        with caplog.at_level(logging.ERROR):
            result = _load_industry_mapping(None)

    assert result is None
    assert any(r.levelno == logging.ERROR for r in caplog.records)


def test_load_industry_mapping_cache_property_raises(caplog):
    """A failing cache.industry property also falls back without raising."""
    from ETF.strategies.trend_template import _load_industry_mapping

    class _BrokenCache:
        @property
        def industry(self):
            raise KeyError("產業類別")

    with caplog.at_level(logging.ERROR):
        result = _load_industry_mapping(_BrokenCache())

    assert result is None
    assert any(r.levelno == logging.ERROR for r in caplog.records)


class _StubCache:
    def __init__(self, industry):
        self.industry = industry


def test_industry_allowed_uses_cache_without_fetching():
    """
    Scenario: Pipeline run reuses cached industry mapping
    THEN the selection SHALL read cache.industry and SHALL NOT call data.get
    """
    from ETF.strategies.trend_template import _industry_allowed

    cache = _StubCache(pd.Series({"4743": BIOTECH, "2330": SEMI}))

    with patch("finlab.data.get") as mock_get:
        allowed = _industry_allowed(["4743", "2330"], cache)

    mock_get.assert_not_called()
    assert allowed.to_dict() == {"4743": False, "2330": True}


def test_industry_allowed_failure_keeps_all(caplog):
    """
    Scenario: Missing industry column / fetch raises
    THEN positions SHALL equal an all-True exclusion mask
    """
    from ETF.strategies.trend_template import _industry_allowed

    with patch("finlab.data.get", side_effect=RuntimeError("quota exhausted")):
        with caplog.at_level(logging.ERROR):
            allowed = _industry_allowed(["4743", "2330"], None)

    assert allowed.dtype == bool
    assert allowed.to_dict() == {"4743": True, "2330": True}
    assert any(r.levelno == logging.ERROR and r.exc_info for r in caplog.records)


def test_industry_allowed_warns_when_nothing_excluded(caplog):
    """A label mismatch (zero stocks excluded) MUST NOT fail silently."""
    from ETF.strategies.trend_template import _industry_allowed

    cache = _StubCache(pd.Series({"2330": SEMI}))

    with caplog.at_level(logging.WARNING):
        allowed = _industry_allowed(["2330"], cache)

    assert allowed.all()
    assert any(r.levelno == logging.WARNING for r in caplog.records)


# ---------------------------------------------------------------------------
# Requirement: Industry data source and shared cache
# ---------------------------------------------------------------------------


def test_cache_industry_loaded_once_and_mapped():
    """
    Scenario: Pipeline run reuses cached industry mapping
    WHEN cache.industry is accessed twice on the same cache instance
    THEN company_basic_info SHALL be fetched once and map stock_id → 產業類別
    """
    from ETF.strategies.shared_cache import StrategyDataCache

    info = pd.DataFrame(
        {
            "stock_id": ["2330", "4743", "4743"],
            "公司簡稱": ["台積電", "合一", "合一(重複)"],
            "產業類別": [SEMI, BIOTECH, SEMI],
        }
    )

    with patch("finlab.data.get", return_value=info) as mock_get:
        cache = StrategyDataCache()
        first = cache.industry
        second = cache.industry

    mock_get.assert_called_once_with("company_basic_info")
    assert first is second
    assert first["2330"] == SEMI
    assert first["4743"] == BIOTECH  # duplicate stock_id keeps first row


def test_industry_mapping_strips_stock_id_whitespace():
    from ETF.strategies.shared_cache import industry_mapping

    info = pd.DataFrame({"stock_id": ["4743 ", 2330], "產業類別": [BIOTECH, SEMI]})

    assert industry_mapping(info).to_dict() == {"4743": BIOTECH, "2330": SEMI}


def test_cache_industry_uses_index_when_no_stock_id_column():
    from ETF.strategies.shared_cache import StrategyDataCache

    info = pd.DataFrame({"產業類別": [SEMI, BIOTECH]}, index=["2330", "4743"])

    with patch("finlab.data.get", return_value=info):
        mapping = StrategyDataCache().industry

    assert mapping.to_dict() == {"2330": SEMI, "4743": BIOTECH}
