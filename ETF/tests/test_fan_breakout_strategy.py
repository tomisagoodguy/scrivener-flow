"""Tests for the fan_breakout strategy and its shared-cache dependency.

Spec: openspec/changes/fan-breakout-screener/specs/fan-breakout-strategy/spec.md
Tests never call FinLab: price/revenue data is synthetic and injected through a
cache stub, and the market classification lookup (`finlab.data.get`) is patched.
"""

import json
import logging
from types import SimpleNamespace
from unittest.mock import MagicMock, patch

import numpy as np
import pandas as pd
import pytest

from ETF.strategies.base_strategy import BaseStrategy

LATEST = pd.Timestamp("2026-10-22")
N_DAYS = 200
K = 5

_CATEGORIES = pd.DataFrame(
    {
        "symbol": ["2330", "6488", "1234", "0050"],
        "name": ["TSMC", "GlobalWafers", "Rotc Co", "ETF 50"],
        "category": ["semi", "semi", "other", "domestic_etf"],
        "market": ["sii", "otc", "rotc", "etf"],
        "stock_id": ["2330", "6488", "1234", "0050"],
    }
)


# ---------------------------------------------------------------------------
# Synthetic data helpers
# ---------------------------------------------------------------------------


def _trading_days(n: int = N_DAYS) -> pd.DatetimeIndex:
    return pd.bdate_range(end=LATEST, periods=n)


def _uptrend(n: int = N_DAYS) -> np.ndarray:
    """Convex log-price: all MAs rise and MA5 / MA120 keeps widening every day."""
    t = np.arange(n)
    return 100 * np.exp(0.002 * t + 0.00004 * t**2)


def _price_frame(
    columns, n: int = N_DAYS, nan_head: dict | None = None
) -> pd.DataFrame:
    """Adjusted-close frame where every column follows the same uptrend.

    nan_head: {column: number of leading NaN rows} to simulate short history.
    """
    frame = pd.DataFrame({c: _uptrend(n) for c in columns}, index=_trading_days(n))
    for column, rows in (nan_head or {}).items():
        frame.loc[frame.index[:rows], column] = np.nan
    return frame


def _volume_frame(columns, n: int = N_DAYS, shares: float = 1_000_000) -> pd.DataFrame:
    return pd.DataFrame(shares, index=_trading_days(n), columns=list(columns))


def _monthly(
    columns, last_pub: str = "2026-10-10", fail=()
) -> tuple[pd.DataFrame, pd.DataFrame]:
    """Monthly revenue and YoY frames (index = publication date).

    Passing columns: revenue grows 3% a month, YoY climbs from 30 by 2 each month.
    Columns in `fail`: latest month's revenue collapses, so the 2-month average is
    below its 9-month maximum.
    """
    pub = pd.date_range(
        end=pd.Timestamp(last_pub), periods=22, freq=pd.DateOffset(months=1)
    )
    growth = 1000 * 1.03 ** np.arange(len(pub))
    rev = pd.DataFrame({c: growth for c in columns}, index=pub)
    for column in fail:
        rev.loc[pub[-1], column] = 500.0
    yoy = pd.DataFrame(
        {c: 30.0 + 2.0 * np.arange(len(pub)) for c in columns}, index=pub
    )
    return rev, yoy


def _cache(columns, *, nan_head=None, fail=(), last_pub="2026-10-10", n: int = N_DAYS):
    rev, yoy = _monthly(columns, last_pub=last_pub, fail=fail)
    price = _price_frame(columns, n=n, nan_head=nan_head)
    return SimpleNamespace(
        adj_close=price,
        v=_volume_frame(columns, n=n),
        rev=rev,
        rev_yoy=yoy,
        amt=price * 1_000_000,
    )


def _new_strategy():
    from ETF.strategies.fan_breakout import FanBreakoutStrategy

    return FanBreakoutStrategy()


def _selected_ids(positions: pd.DataFrame) -> list[str]:
    latest = positions.iloc[-1]
    return sorted(str(c) for c in latest.index[latest.astype(bool)])


def _categories_get(name: str):
    if name != "security_categories":
        raise AssertionError(f"unexpected FinLab dataset requested: {name}")
    return _CATEGORIES


# ---------------------------------------------------------------------------
# Adjusted close in shared cache
# ---------------------------------------------------------------------------


def test_adj_close_loaded_once_per_cache():
    """
    Scenario: Loaded once per run
    WHEN adj_close is accessed twice on the same cache instance
    THEN FinLab data.get("etl:adj_close") SHALL be called once
    """
    from ETF.strategies.shared_cache import StrategyDataCache

    frame = pd.DataFrame({"2330": [100.0, 101.0]})

    with patch("finlab.data.get", return_value=frame) as mock_get:
        cache = StrategyDataCache()
        first = cache.adj_close
        second = cache.adj_close

    mock_get.assert_called_once_with("etl:adj_close")
    assert first is second


# ---------------------------------------------------------------------------
# Strategy identity / registry
# ---------------------------------------------------------------------------


def test_strategy_identity():
    strategy = _new_strategy()

    assert strategy.strategy_id == "fan_breakout"
    assert strategy.description == "均線發散突破"


def test_registered_in_all_strategies_once():
    from ETF.strategies import ALL_STRATEGIES

    ids = [s.strategy_id for s in ALL_STRATEGIES]

    assert ids.count("fan_breakout") == 1
    assert len(ids) == len(set(ids))


# ---------------------------------------------------------------------------
# Requirement: Fan breakout selection conditions
# ---------------------------------------------------------------------------


def test_all_conditions_hold_selects_stock_on_latest_day():
    """
    Scenario: All conditions hold
    WHEN a stock satisfies conditions 1 through 6 on the latest trading day
    THEN the stock SHALL appear as selected in the latest row of get_positions
    """
    positions = _new_strategy().get_positions(cache=_cache(["2330"]))

    assert positions.index[-1] == LATEST
    assert _selected_ids(positions) == ["2330"]
    assert positions.iloc[-1]["2330"] > 0


def test_revenue_condition_fails_stock_not_selected():
    """
    Scenario: Revenue condition fails
    WHEN a stock satisfies conditions 1 through 4 but its 2-month average revenue
         is below the 9-month maximum
    THEN the stock SHALL NOT be selected
    """
    positions = _new_strategy().get_positions(
        cache=_cache(["2330", "2454"], fail=["2454"])
    )

    assert _selected_ids(positions) == ["2330"]


def test_revenue_yoy_not_rising_not_selected():
    """Revenue momentum: latest YoY must be greater than the previous month's YoY."""
    cache = _cache(["2330", "2454"])
    cache.rev_yoy.loc[cache.rev_yoy.index[-1], "2454"] = (
        10.0  # 6 月均仍 > 25，但較前期下降
    )

    positions = _new_strategy().get_positions(cache=cache)

    assert _selected_ids(positions) == ["2330"]


def test_revenue_yoy_not_positive_for_six_months_not_selected():
    """Revenue momentum: YoY must be above 0 for 6 consecutive months."""
    cache = _cache(["2330", "2454"])
    cache.rev_yoy.loc[cache.rev_yoy.index[-4], "2454"] = -1.0

    positions = _new_strategy().get_positions(cache=cache)

    assert _selected_ids(positions) == ["2330"]


def test_illiquid_stock_not_selected():
    """Liquidity: 20-day average volume must exceed 500,000 shares."""
    cache = _cache(["2330", "2454"])
    cache.v["2454"] = 500_000

    positions = _new_strategy().get_positions(cache=cache)

    assert _selected_ids(positions) == ["2330"]


def test_flat_trend_not_selected():
    """Technical conditions fail (no alignment / rising averages) even when revenue passes."""
    cache = _cache(["2330", "2454"])
    cache.adj_close["2454"] = 100.0

    positions = _new_strategy().get_positions(cache=cache)

    assert _selected_ids(positions) == ["2330"]


def test_insufficient_history_not_selected_and_no_exception():
    """
    Scenario: Insufficient history
    WHEN a stock has fewer than 125 trading days of adjusted close, so MA120 K days
         earlier is undefined
    THEN the stock SHALL NOT be selected and no exception SHALL be raised
    """
    # 124 個有效交易日（前 76 列為 NaN）→ MA120 在 5 日前尚未有定義
    cache = _cache(["2330", "2454"], nan_head={"2454": N_DAYS - 124})

    positions = _new_strategy().get_positions(cache=cache)

    assert _selected_ids(positions) == ["2330"]


def test_history_of_exactly_125_days_can_be_selected():
    """Boundary: 125 valid days make MA120 defined both today and K days earlier."""
    cache = _cache(["2330", "2454"], nan_head={"2454": N_DAYS - 125})

    positions = _new_strategy().get_positions(cache=cache)

    assert _selected_ids(positions) == ["2330", "2454"]


def _constant_ma_frames(index, columns, now: dict, prev: dict) -> dict:
    """MA frames that equal `prev` before the last K rows and `now` in the last K rows."""
    frames = {}
    for period in (5, 10, 20, 60, 120):
        frame = pd.DataFrame(float(prev[period]), index=index, columns=columns)
        frame.iloc[-K:] = float(now[period])
        frames[period] = frame
    return frames


@pytest.mark.parametrize(
    ("ma_now", "prev_spread", "expected_selected"),
    [
        pytest.param((110, 108, 105, 100, 95), 0.120, True, id="aligned-and-diverging"),
        pytest.param(
            (110, 108, 105, 100, 95), 0.170, False, id="spread-narrower-than-5d-ago"
        ),
        pytest.param((110, 104, 105, 100, 95), 0.120, False, id="ma10-below-ma20"),
    ],
)
def test_alignment_and_divergence_examples(ma_now, prev_spread, expected_selected):
    """
    Example: alignment and divergence checks (spec table, revenue and liquidity pass)

    MAs 5 trading days ago are all below today's, with spread = prev_spread
    (MA120 5 days ago = 94, MA5 5 days ago = 94 * (1 + prev_spread)).
    """
    cache = _cache(["2330"], n=30)
    now = dict(zip((5, 10, 20, 60, 120), ma_now))
    prev = {5: 94 * (1 + prev_spread), 10: 100, 20: 100, 60: 95, 120: 94}
    ma_frames = _constant_ma_frames(cache.adj_close.index, ["2330"], now, prev)

    with patch("ETF.strategies.fan_breakout._moving_averages", return_value=ma_frames):
        positions = _new_strategy().get_positions(cache=cache)

    assert (_selected_ids(positions) == ["2330"]) is expected_selected


@pytest.mark.parametrize("falling_period", [10, 20, 60, 120])
def test_any_ma_not_above_five_days_ago_is_not_selected(falling_period):
    """Condition 2: every one of MA5/10/20/60/120 must be above its value K days earlier.

    Alignment and spread widening still hold; only one average was higher 5 days ago.
    """
    cache = _cache(["2330"], n=30)
    now = dict(zip((5, 10, 20, 60, 120), (110, 108, 105, 100, 95)))
    prev = {5: 94 * 1.12, 10: 100, 20: 100, 60: 95, 120: 94}
    prev[falling_period] = now[falling_period] + 1
    if falling_period == 120:
        prev[5] = prev[120] * 1.12  # 5 日前 spread 仍為 0.120，只隔離「均線上升」條件
    ma_frames = _constant_ma_frames(cache.adj_close.index, ["2330"], now, prev)

    with patch("ETF.strategies.fan_breakout._moving_averages", return_value=ma_frames):
        positions = _new_strategy().get_positions(cache=cache)

    assert _selected_ids(positions) == []


def test_score_equals_spread_rounded_to_four_decimals():
    """
    Scenario: Score written
    WHEN a stock is selected with MA5 = 110 and MA120 = 95 on the latest day
    THEN its score SHALL be 0.1579 (rounded to 4 decimals)
    """
    cache = _cache(["2330"], n=30)
    now = dict(zip((5, 10, 20, 60, 120), (110, 108, 105, 100, 95)))
    prev = {5: 94 * 1.12, 10: 100, 20: 100, 60: 95, 120: 94}
    ma_frames = _constant_ma_frames(cache.adj_close.index, ["2330"], now, prev)

    with patch("ETF.strategies.fan_breakout._moving_averages", return_value=ma_frames):
        positions = _new_strategy().get_positions(cache=cache)

    assert positions.iloc[-1]["2330"] == pytest.approx(0.1579)


# ---------------------------------------------------------------------------
# Requirement: Universe limited to listed common stocks
# ---------------------------------------------------------------------------


def test_etf_tdr_and_warrant_columns_excluded():
    """
    Scenario: ETF and TDR excluded
    WHEN stock ids 0050, 00981A, 910861 and 2330 all satisfy price and revenue conditions
    THEN only 2330 SHALL be selected
    """
    columns = ["0050", "00981A", "910861", "2330"]

    positions = _new_strategy().get_positions(cache=_cache(columns))

    assert _selected_ids(positions) == ["2330"]
    assert list(positions.columns) == ["2330"]


def test_stock_id_pattern_boundaries():
    """^[1-9]\\d{3}$ : 4 digits starting with 1-9 only."""
    columns = ["1101", "9958", "0999", "12345", "123", "2330A"]

    positions = _new_strategy().get_positions(cache=_cache(columns))

    assert sorted(positions.columns) == ["1101", "9958"]


# ---------------------------------------------------------------------------
# Requirement: Daily positions output
# ---------------------------------------------------------------------------


def test_no_candidate_latest_row_all_false_not_none():
    """
    Scenario: No candidate on the latest day
    WHEN no stock satisfies all conditions on the latest trading day
    THEN the latest row SHALL be all False (get_positions does not return None)
    """
    positions = _new_strategy().get_positions(
        cache=_cache(["2330", "2454"], fail=["2330", "2454"])
    )

    assert positions is not None
    assert not positions.empty
    assert not positions.iloc[-1].astype(bool).any()


def test_output_not_frozen_between_revenue_releases():
    """
    Scenario: Output not frozen between revenue releases
    WHEN the latest trading day is three weeks after the last monthly revenue publication
    THEN the last index of the returned DataFrame SHALL equal the latest trading day
         of the adjusted close (and the revenue state is carried forward)
    """
    cache = _cache(["2330"], last_pub="2026-10-01")
    assert cache.rev.index[-1] == pd.Timestamp("2026-10-01")

    positions = _new_strategy().get_positions(cache=cache)

    assert positions.index[-1] == cache.adj_close.index[-1] == LATEST
    assert positions.index.equals(cache.adj_close.index)
    assert _selected_ids(positions) == ["2330"]


def test_positions_have_no_nan_and_selected_values_are_positive():
    """The step treats any truthy value as selected, so NaN must never appear."""
    positions = _new_strategy().get_positions(
        cache=_cache(["2330", "2454"], fail=["2454"])
    )

    assert not positions.isna().any().any()
    assert (positions >= 0).all().all()


def test_get_positions_without_cache_loads_from_finlab():
    """cache=None: the strategy downloads what it needs through finlab.data.get."""
    source = _cache(["2330"])
    datasets = {
        "etl:adj_close": source.adj_close,
        "price:成交股數": source.v,
        "monthly_revenue:當月營收": source.rev,
        "monthly_revenue:去年同月增減(%)": source.rev_yoy,
    }

    with patch("finlab.data.get", side_effect=lambda name: datasets[name]):
        positions = _new_strategy().get_positions(cache=None)

    assert _selected_ids(positions) == ["2330"]


# ---------------------------------------------------------------------------
# Requirement: Signal metadata per selected stock
# ---------------------------------------------------------------------------


def _strategy_with_selection(selected: pd.DataFrame, spread: float = 0.1579):
    """Strategy whose get_positions intermediate state is injected directly."""
    strategy = _new_strategy()
    strategy._selected = selected.astype(bool)
    strategy._spread = pd.DataFrame(
        spread, index=selected.index, columns=selected.columns
    )
    return strategy


def _history(pattern: dict[str, list[int]], n: int = 140) -> pd.DataFrame:
    """Selection history; pattern maps stock id to row offsets from the end (0 = latest day)."""
    index = _trading_days(n)
    frame = pd.DataFrame(False, index=index, columns=list(pattern))
    for stock, offsets in pattern.items():
        for offset in offsets:
            frame.iloc[n - 1 - offset, frame.columns.get_loc(stock)] = True
    return frame


def _metadata(strategy):
    with patch("finlab.data.get", side_effect=_categories_get):
        return strategy.get_signal_metadata(cache=None)


def _date(selected: pd.DataFrame, offset: int) -> str:
    return selected.index[len(selected) - 1 - offset].strftime("%Y-%m-%d")


def test_metadata_first_signal_after_gap():
    """
    Scenario: First signal after a gap
    WHEN a stock is selected today and was not selected on any of the previous 10 trading days
    THEN signal_type = "first" and consec_days = 1
    """
    selected = _history({"2330": [0, 11]})  # 今日 + 11 個交易日前（落在 10 日窗外）

    meta = _metadata(_strategy_with_selection(selected))["2330"]

    assert meta["signal_type"] == "first"
    assert meta["consec_days"] == 1


def test_metadata_selected_ten_days_ago_is_repeat():
    """Boundary: T-10 is inside the 10-day look-back window."""
    selected = _history({"2330": [0, 10]})

    meta = _metadata(_strategy_with_selection(selected))["2330"]

    assert meta["signal_type"] == "repeat"
    assert meta["consec_days"] == 1


def test_metadata_reentry_within_ten_days_is_repeat():
    """
    Scenario: Re-entry within 10 days
    WHEN a stock was selected on T-4, not on T-3 through T-1, and selected on T
    THEN signal_type = "repeat" and consec_days = 1
    """
    selected = _history({"2330": [0, 4]})

    meta = _metadata(_strategy_with_selection(selected))["2330"]

    assert meta["signal_type"] == "repeat"
    assert meta["consec_days"] == 1


def test_metadata_consecutive_selection_example():
    """
    Example: consecutive selection
    GIVEN a stock is selected on T-2, T-1 and T, and not on T-3 through T-12
    WHEN get_signal_metadata runs for day T
    THEN signal_type = "repeat", consec_days = 3, recent_signal_dates ends with T-2, T-1, T
    """
    selected = _history({"2330": [0, 1, 2]})

    meta = _metadata(_strategy_with_selection(selected))["2330"]

    assert meta["signal_type"] == "repeat"
    assert meta["consec_days"] == 3
    assert meta["recent_signal_dates"][-3:] == [
        _date(selected, 2),
        _date(selected, 1),
        _date(selected, 0),
    ]


def test_metadata_consec_days_stops_at_first_gap():
    selected = _history({"2330": [0, 1, 3, 4, 5]})

    meta = _metadata(_strategy_with_selection(selected))["2330"]

    assert meta["consec_days"] == 2


def test_metadata_recent_signal_dates_window_is_120_days_ascending_iso():
    """recent_signal_dates: selection dates within the latest 120 trading days, YYYY-MM-DD, ascending."""
    selected = _history({"2330": [0, 39, 119, 120, 139]}, n=140)

    meta = _metadata(_strategy_with_selection(selected))["2330"]

    assert meta["recent_signal_dates"] == [
        _date(selected, 119),
        _date(selected, 39),
        _date(selected, 0),
    ]
    assert meta["recent_signal_dates"] == sorted(meta["recent_signal_dates"])
    assert all(
        len(d) == 10 and d[4] == "-" and d[7] == "-"
        for d in meta["recent_signal_dates"]
    )


def test_metadata_spread_rounded_to_four_decimals():
    selected = _history({"2330": [0]})

    meta = _metadata(_strategy_with_selection(selected, spread=110 / 95 - 1))["2330"]

    assert meta["spread"] == 0.1579


def test_metadata_keys_are_exactly_the_contract_and_json_serializable():
    selected = _history({"2330": [0, 1]})

    meta = _metadata(_strategy_with_selection(selected))["2330"]

    assert set(meta) == {
        "signal_type",
        "consec_days",
        "spread",
        "market",
        "recent_signal_dates",
    }
    assert json.loads(json.dumps(meta)) == meta
    assert type(meta["consec_days"]) is int
    assert type(meta["spread"]) is float


def test_metadata_only_for_stocks_selected_on_latest_day():
    selected = _history({"2330": [0], "6488": [1], "1101": [0, 1]})

    meta = _metadata(_strategy_with_selection(selected))

    assert sorted(meta) == ["1101", "2330"]


def test_metadata_empty_dict_when_nothing_selected_today():
    selected = _history({"2330": [1]})

    meta = _metadata(_strategy_with_selection(selected))

    assert meta == {}


def test_metadata_market_labels_from_security_categories():
    """market: sii -> 上市, otc -> 上櫃, anything else or unknown -> None."""
    selected = _history({"2330": [0], "6488": [0], "1234": [0], "9999": [0]})

    meta = _metadata(_strategy_with_selection(selected))

    assert meta["2330"]["market"] == "上市"
    assert meta["6488"]["market"] == "上櫃"
    assert meta["1234"]["market"] is None
    assert meta["9999"]["market"] is None


def test_metadata_market_none_when_classification_unavailable(caplog):
    """Classification lookup failure: market is null for all, a warning is logged, no raise."""
    selected = _history({"2330": [0]})
    strategy = _strategy_with_selection(selected)

    with patch("finlab.data.get", side_effect=RuntimeError("quota")):
        with caplog.at_level(logging.WARNING):
            meta = strategy.get_signal_metadata(cache=None)

    assert meta["2330"]["market"] is None
    assert any("security_categories" in rec.getMessage() for rec in caplog.records)


def test_metadata_reuses_get_positions_state_without_recomputing():
    """get_signal_metadata after get_positions must not touch the price/revenue data again."""
    cache = _cache(["2330"])
    strategy = _new_strategy()
    strategy.get_positions(cache=cache)

    class _Exploding:
        def __getattr__(self, name):
            raise AssertionError(f"cache.{name} must not be re-read")

    with patch("finlab.data.get", side_effect=_categories_get):
        meta = strategy.get_signal_metadata(cache=_Exploding())

    assert set(meta) == {"2330"}
    assert meta["2330"]["market"] == "上市"
    assert meta["2330"]["recent_signal_dates"][-1] == LATEST.strftime("%Y-%m-%d")
    assert meta["2330"]["spread"] == pytest.approx(
        round(float(strategy._spread.iloc[-1]["2330"]), 4)
    )


def test_metadata_computes_positions_when_not_yet_available():
    """Without a prior get_positions the hook computes it from the given cache."""
    meta = _metadata_with_cache(_new_strategy(), _cache(["2330"]))

    assert set(meta) == {"2330"}


def _metadata_with_cache(strategy, cache):
    with patch("finlab.data.get", side_effect=_categories_get):
        return strategy.get_signal_metadata(cache=cache)


def test_new_get_positions_discards_previous_state():
    """A second run on different data must not leak the first run's metadata."""
    strategy = _new_strategy()
    strategy.get_positions(cache=_cache(["2330"]))
    strategy.get_positions(cache=_cache(["2330"], fail=["2330"]))

    assert _metadata(strategy) == {}


# ---------------------------------------------------------------------------
# Integration with StrategySignalStep
# ---------------------------------------------------------------------------


class _OtherStrategy(BaseStrategy):
    """Unrelated strategy that always selects 2317, so the step is never 'all empty'."""

    strategy_id = "other_test"
    description = "Other"

    def get_positions(self, cache=None):
        return pd.DataFrame({"2317": [True]}, index=pd.DatetimeIndex([LATEST]))


def _run_step(strategies, cache):
    from ETF.pipeline.context import PipelineContext
    from ETF.pipeline.steps.strategy_signal_step import StrategySignalStep
    import argparse
    import pathlib

    ctx = PipelineContext(
        args=argparse.Namespace(days=30, dry_run=False),
        output_dir=pathlib.Path("."),
        date_str=LATEST.strftime("%Y-%m-%d"),
        is_dry_run=False,
    )
    services = MagicMock()
    services.sql_storage = MagicMock()
    services.sql_storage.get_latest_strategy_signal_date.return_value = None

    with (
        patch("ETF.pipeline.steps.strategy_signal_step.ALL_STRATEGIES", strategies),
        patch(
            "ETF.pipeline.steps.strategy_signal_step.StrategyDataCache",
            return_value=cache,
        ),
        patch("finlab.data.get", side_effect=_categories_get),
    ):
        StrategySignalStep().execute(ctx, services)

    calls = services.sql_storage.upsert_strategy_signals.call_args
    return ctx, (calls[0][0] if calls else [])


def test_step_writes_score_and_conditions_for_fan_breakout():
    """
    Scenario: Metadata written (real strategy through the real step)
    WHEN fan_breakout selects 2330
    THEN the 2330 row has score = spread and conditions = the metadata JSON
    """
    cache = _cache(["2330", "0050"])
    strategy = _new_strategy()

    ctx, rows = _run_step([strategy], cache)

    assert [r["stock_id"] for r in rows] == ["2330"]
    row = rows[0]
    assert row["strategy_id"] == "fan_breakout"
    assert row["date"] == LATEST.strftime("%Y-%m-%d")
    conditions = json.loads(row["conditions"])
    assert conditions["signal_type"] in {"first", "repeat"}
    assert conditions["market"] == "上市"
    assert conditions["recent_signal_dates"][-1] == row["date"]
    assert conditions["spread"] == pytest.approx(row["score"])
    assert not ctx.validation_warnings


def test_step_writes_no_fan_breakout_rows_and_no_warning_when_no_candidate():
    """
    Scenario: No candidate on the latest day
    WHEN no stock satisfies all conditions on the latest trading day
    THEN StrategySignalStep writes no fan_breakout rows and raises no warning for it
    """
    cache = _cache(["2330"], fail=["2330"])
    cache.amt = pd.DataFrame(
        {"2330": [2e8] * 25, "2317": [2e8] * 25},
        index=pd.date_range("2026-09-28", periods=25, freq="D"),
    )

    ctx, rows = _run_step([_new_strategy(), _OtherStrategy()], cache)

    assert rows, "other strategies still write their rows"
    assert not any(r["strategy_id"] == "fan_breakout" for r in rows)
    assert not any("fan_breakout" in w for w in ctx.validation_warnings)
