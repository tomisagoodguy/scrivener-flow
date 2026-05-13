"""Tests for backfill_future_returns.py"""

import json
from datetime import date
from unittest.mock import MagicMock, patch, call
import pytest

from ETF.pipeline.steps.backfill_future_returns import (
    compute_missing_returns,
    filter_incomplete_events,
)


def test_compute_missing_returns_fills_null_horizon():
    """Returns only horizons where price data exists and key is absent."""
    event = {
        "id": 1,
        "stock_code": "2330",
        "event_date": date(2026, 5, 1),
        "future_returns": {"5": 0.03},  # 1, 10, 20 are missing
    }
    price_lookup = {
        ("2330", "2026-05-01"): 100.0,
        ("2330", "2026-05-02"): 103.0,  # +1 day
        ("2330", "2026-05-06"): 107.0,  # +5 day (already present, skip)
        ("2330", "2026-05-11"): 110.0,  # +10 day
    }
    today = date(2026, 5, 13)
    new_data = compute_missing_returns(event, price_lookup, today)

    assert "1" in new_data
    assert round(new_data["1"], 6) == round((103.0 - 100.0) / 100.0, 6)
    assert "5" not in new_data  # already populated
    assert "10" in new_data
    assert "20" not in new_data  # future date beyond today


def test_compute_missing_returns_skips_when_no_base_price():
    """Returns empty dict when event-date close price is missing."""
    event = {
        "id": 1,
        "stock_code": "2330",
        "event_date": date(2026, 5, 1),
        "future_returns": {},
    }
    price_lookup = {}  # no prices at all
    today = date(2026, 5, 13)
    result = compute_missing_returns(event, price_lookup, today)
    assert result == {}


def test_compute_missing_returns_preserves_existing():
    """Existing non-null values must not be overwritten."""
    event = {
        "id": 1,
        "stock_code": "2330",
        "event_date": date(2026, 5, 1),
        "future_returns": {"1": 0.02},  # already has 1-day return
    }
    price_lookup = {
        ("2330", "2026-05-01"): 100.0,
        ("2330", "2026-05-02"): 105.0,  # different price would give 0.05 if computed
    }
    today = date(2026, 5, 13)
    new_data = compute_missing_returns(event, price_lookup, today)
    # "1" already populated → must not appear in new_data
    assert "1" not in new_data


def test_filter_incomplete_events_returns_only_incomplete():
    """Only events with at least one null horizon should be returned."""
    events = [
        {"id": 1, "future_returns": {"1": 0.01, "5": 0.02, "10": 0.03, "20": 0.04}},
        {"id": 2, "future_returns": {"1": 0.01, "5": None, "10": 0.03, "20": None}},
        {"id": 3, "future_returns": {}},
    ]
    from ETF.pipeline.steps.backfill_future_returns import STANDARD_HORIZONS
    incomplete = filter_incomplete_events(events, STANDARD_HORIZONS)
    ids = [e["id"] for e in incomplete]
    assert 1 not in ids  # fully populated
    assert 2 in ids
    assert 3 in ids
