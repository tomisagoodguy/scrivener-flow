from datetime import date

from ETF.utils.tdcc_schedule import expected_tdcc_friday, is_tdcc_data_fresh


def test_expected_tdcc_friday_on_sunday():
    assert expected_tdcc_friday(date(2026, 7, 12)).isoformat() == "2026-07-10"


def test_expected_tdcc_friday_on_saturday():
    assert expected_tdcc_friday(date(2026, 7, 11)).isoformat() == "2026-07-10"


def test_is_tdcc_data_fresh_when_db_has_expected_week():
    assert is_tdcc_data_fresh("2026-07-10", today=date(2026, 7, 12)) is True


def test_is_tdcc_data_fresh_when_db_lags():
    assert is_tdcc_data_fresh("2026-07-03", today=date(2026, 7, 12)) is False
