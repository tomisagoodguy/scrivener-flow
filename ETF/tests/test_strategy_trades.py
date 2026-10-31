"""strategy_trades 處理器測試（change: strategy-trade-performance）。

涵蓋 spec：Holding period derivation from position history、
Next-day open entry and exit pricing、Dividend-adjusted returns。
"""

from datetime import date

import pandas as pd
import pytest

from ETF.processors.strategy_trades import (
    TradeEpisode,
    derive_trade_episodes,
    price_trade_episodes,
)

SINCE = date(2026, 1, 1)


def _positions(rows: dict[str, list[bool]], dates: list[str]) -> pd.DataFrame:
    return pd.DataFrame(rows, index=pd.to_datetime(dates))


class TestDeriveTradeEpisodes:
    DATES = ["2026-06-10", "2026-07-10", "2026-08-10", "2026-09-10"]

    def test_run_split_into_two_periods(self):
        pos = _positions({"2330": [True, False, True, True]}, self.DATES)
        assert derive_trade_episodes(pos, SINCE) == [
            TradeEpisode("2330", date(2026, 6, 10), date(2026, 7, 10)),
            TradeEpisode("2330", date(2026, 8, 10), None),
        ]

    def test_never_selected_yields_nothing(self):
        pos = _positions({"2330": [False, False]}, self.DATES[:2])
        assert derive_trade_episodes(pos, SINCE) == []

    def test_selected_until_last_row_is_open(self):
        pos = _positions({"2330": [True, True]}, self.DATES[:2])
        assert derive_trade_episodes(pos, SINCE) == [TradeEpisode("2330", date(2026, 6, 10), None)]

    def test_numeric_weights_and_nan_treated_as_selected_or_not(self):
        pos = pd.DataFrame(
            {"2330": [0.5, float("nan"), 0.0, 1.0]}, index=pd.to_datetime(self.DATES)
        )
        assert derive_trade_episodes(pos, SINCE) == [
            TradeEpisode("2330", date(2026, 6, 10), date(2026, 7, 10)),
            TradeEpisode("2330", date(2026, 9, 10), None),
        ]

    def test_old_closed_period_excluded_but_old_open_kept(self):
        dates = ["2025-09-01", "2025-10-01", "2026-10-01"]
        pos = _positions({"OLD": [True, False, False], "HOLD": [True, True, True]}, dates)
        since = date(2025, 10, 31)  # 400 天前的 2025-09-01 已出場 → 排除
        assert derive_trade_episodes(pos, since) == [TradeEpisode("HOLD", date(2025, 9, 1), None)]

    def test_long_holding_recently_exited_is_kept(self):
        # 進場早於 since，但最近才出場 → 保留（以出場訊號日判斷視窗）
        dates = ["2025-09-01", "2026-10-20"]
        pos = _positions({"LONG": [True, False]}, dates)
        assert derive_trade_episodes(pos, date(2025, 10, 31)) == [
            TradeEpisode("LONG", date(2025, 9, 1), date(2026, 10, 20))
        ]

    def test_unsorted_index_is_sorted_first(self):
        pos = _positions({"2330": [True, True, False]}, ["2026-08-10", "2026-06-10", "2026-07-10"])
        # 排序後：06-10 T、07-10 F、08-10 T
        assert derive_trade_episodes(pos, SINCE) == [
            TradeEpisode("2330", date(2026, 6, 10), date(2026, 7, 10)),
            TradeEpisode("2330", date(2026, 8, 10), None),
        ]

    def test_non_date_index_raises_value_error(self):
        pos = pd.DataFrame({"2330": [True]}, index=["not-a-date"])
        with pytest.raises(ValueError):
            derive_trade_episodes(pos, SINCE)

    def test_empty_positions_yield_nothing(self):
        assert derive_trade_episodes(pd.DataFrame(), SINCE) == []


# 交易日：10-09（五）、10-12（一）、10-13（二）、10-14（三）
TRADING_DAYS = ["2026-10-09", "2026-10-12", "2026-10-13", "2026-10-14"]


def _frame(values: dict[str, list[float]]) -> pd.DataFrame:
    return pd.DataFrame(values, index=pd.to_datetime(TRADING_DAYS))


def _price_one(episode, open_, close, adj_close) -> dict:
    rows = price_trade_episodes([episode], open_, close, adj_close)
    assert len(rows) == 1
    return rows[0]


class TestPriceTradeEpisodes:
    def test_entry_priced_at_next_trading_day_open(self):
        open_ = _frame({"2330": [99.0, 100.0, 104.0, 108.0]})
        close = _frame({"2330": [99.0, 102.0, 106.0, 110.0]})
        row = _price_one(TradeEpisode("2330", date(2026, 10, 9), None), open_, close, close)
        assert row["entry_date"] == "2026-10-12"
        assert row["entry_price"] == 100.0
        assert row["latest_date"] == "2026-10-14"
        assert row["latest_close"] == 110.0
        assert row["holding_return"] == pytest.approx(0.10)
        assert row["exit_date"] is None
        assert row["post_exit_return"] is None

    def test_pending_entry_when_signal_is_latest_trading_day(self):
        open_ = _frame({"2330": [99.0, 100.0, 104.0, 108.0]})
        row = _price_one(TradeEpisode("2330", date(2026, 10, 14), None), open_, open_, open_)
        assert row["entry_date"] is None
        assert row["entry_price"] is None
        assert row["holding_return"] is None

    def test_ex_dividend_is_not_counted_as_loss(self):
        # 10-13 除息 5 元：之前的還原價 = 原始價 × 0.95
        open_ = _frame({"2330": [100.0, 100.0, 95.0, 95.0]})
        close = _frame({"2330": [100.0, 100.0, 95.0, 95.0]})
        adj = _frame({"2330": [95.0, 95.0, 95.0, 95.0]})
        row = _price_one(TradeEpisode("2330", date(2026, 10, 9), None), open_, close, adj)
        assert row["entry_price"] == 100.0
        assert row["latest_close"] == 95.0
        assert row["holding_return"] == pytest.approx(0.0)

    def test_closed_period_returns(self):
        # 進場還原開盤 100、出場還原開盤 110、最新還原收盤 121
        open_ = _frame({"2330": [90.0, 100.0, 110.0, 115.0]})
        close = _frame({"2330": [90.0, 100.0, 110.0, 121.0]})
        row = _price_one(TradeEpisode("2330", date(2026, 10, 9), date(2026, 10, 12)), open_, close, close)
        assert row["exit_signal_date"] == "2026-10-12"
        assert row["exit_date"] == "2026-10-13"
        assert row["exit_price"] == 110.0
        assert row["holding_return"] == pytest.approx(0.10)
        assert row["post_exit_return"] == pytest.approx(0.10)

    def test_open_period_loss(self):
        open_ = _frame({"2330": [90.0, 100.0, 95.0, 92.0]})
        close = _frame({"2330": [90.0, 98.0, 94.0, 90.0]})
        row = _price_one(TradeEpisode("2330", date(2026, 10, 9), None), open_, close, close)
        assert row["holding_return"] == pytest.approx(-0.10)
        assert row["post_exit_return"] is None

    def test_pending_exit_counts_as_still_held(self):
        # 出場訊號在最新交易日：隔日開盤尚未發生，報酬算到最新收盤
        open_ = _frame({"2330": [90.0, 100.0, 104.0, 108.0]})
        close = _frame({"2330": [90.0, 102.0, 106.0, 105.0]})
        row = _price_one(TradeEpisode("2330", date(2026, 10, 9), date(2026, 10, 14)), open_, close, close)
        assert row["exit_signal_date"] == "2026-10-14"
        assert row["exit_date"] is None
        assert row["exit_price"] is None
        assert row["holding_return"] == pytest.approx(0.05)
        assert row["post_exit_return"] is None

    def test_missing_price_makes_return_null(self):
        open_ = _frame({"2330": [99.0, float("nan"), 104.0, 108.0]})
        row = _price_one(TradeEpisode("2330", date(2026, 10, 9), None), open_, open_, open_)
        assert row["entry_date"] == "2026-10-12"
        assert row["entry_price"] is None
        assert row["holding_return"] is None

    def test_stock_absent_from_price_data(self):
        open_ = _frame({"2330": [99.0, 100.0, 104.0, 108.0]})
        row = _price_one(TradeEpisode("9999", date(2026, 10, 9), None), open_, open_, open_)
        assert row["entry_price"] is None
        assert row["latest_close"] is None
        assert row["holding_return"] is None

    def test_suspended_stock_uses_last_valid_close(self):
        open_ = _frame({"2330": [99.0, 100.0, 104.0, float("nan")]})
        close = _frame({"2330": [99.0, 102.0, 110.0, float("nan")]})
        row = _price_one(TradeEpisode("2330", date(2026, 10, 9), None), open_, close, close)
        assert row["latest_date"] == "2026-10-13"
        assert row["latest_close"] == 110.0
        assert row["holding_return"] == pytest.approx(0.10)
