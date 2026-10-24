from datetime import date

import pytest

from ETF.utils.tdcc_schedule import expected_tdcc_friday, is_tdcc_data_fresh


def test_expected_tdcc_friday_on_sunday():
    assert expected_tdcc_friday(date(2026, 7, 12)).isoformat() == "2026-07-10"


def test_expected_tdcc_friday_on_saturday():
    assert expected_tdcc_friday(date(2026, 7, 11)).isoformat() == "2026-07-10"


def test_is_tdcc_data_fresh_when_db_has_expected_week():
    assert is_tdcc_data_fresh("2026-07-10", today=date(2026, 7, 12)) is True


def test_is_tdcc_data_fresh_when_db_lags():
    assert is_tdcc_data_fresh("2026-07-03", today=date(2026, 7, 12)) is False


# Requirement: Single clock source for TDCC schedule helpers


def test_frozen_clock_controls_expected_friday(frozen_tdcc_today):
    assert expected_tdcc_friday().isoformat() == "2026-07-10"


@pytest.mark.parametrize("db_max, expected", [("2026-07-10", True), ("2026-07-03", False)])
def test_frozen_clock_controls_is_fresh(frozen_tdcc_today, db_max, expected):
    assert is_tdcc_data_fresh(db_max) is expected


def test_explicit_today_ignores_frozen_clock(monkeypatch):
    """凍結到另一天（2026-10-24）時，顯式傳入的 today 仍決定結果。"""
    monkeypatch.setattr("ETF.utils.tdcc_schedule._today", lambda: date(2026, 10, 24))

    assert expected_tdcc_friday(date(2026, 7, 12)).isoformat() == "2026-07-10"
